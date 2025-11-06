import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user
  const requestId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!requestId) {
    throw createError({
      statusCode: 400,
      message: 'Enrollment request ID is required',
    })
  }

  const { action, admin_notes, denial_reason } = body

  if (!action || !['approve', 'deny'].includes(action)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid action. Must be "approve" or "deny".',
    })
  }

  try {
    // Verify user has staff or admin role
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('user_role, first_name, last_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw createError({
        statusCode: 404,
        message: 'User profile not found',
      })
    }

    if (!['admin', 'staff'].includes(profile.user_role)) {
      throw createError({
        statusCode: 403,
        message: 'Access denied: Staff or admin role required',
      })
    }

    // Get the enrollment request
    const { data: enrollmentRequest, error: requestError } = await client
      .from('enrollment_requests')
      .select(`
        id,
        student_id,
        class_instance_id,
        guardian_id,
        status,
        notes,
        students (
          id,
          first_name,
          last_name
        ),
        guardians (
          id,
          first_name,
          last_name,
          email
        ),
        class_instances (
          id,
          name,
          class_definitions (
            max_students
          )
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError || !enrollmentRequest) {
      throw createError({
        statusCode: 404,
        message: 'Enrollment request not found',
      })
    }

    // Can only process pending or waitlist requests
    if (!['pending', 'waitlist'].includes(enrollmentRequest.status)) {
      throw createError({
        statusCode: 400,
        message: `Cannot process request with status: ${enrollmentRequest.status}`,
      })
    }

    const student = enrollmentRequest.students as any
    const guardian = enrollmentRequest.guardians as any
    const classInstance = enrollmentRequest.class_instances as any
    const classDef = classInstance?.class_definitions

    if (action === 'deny') {
      // Deny the request
      const { data: updatedRequest, error: updateError } = await client
        .from('enrollment_requests')
        .update({
          status: 'denied',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          admin_notes,
          denial_reason,
        })
        .eq('id', requestId)
        .select()
        .single()

      if (updateError) throw updateError

      // Create notification for parent
      await client.from('enrollment_notifications').insert({
        enrollment_request_id: requestId,
        guardian_id: enrollmentRequest.guardian_id,
        notification_type: 'denied',
        subject: 'Enrollment Request Denied',
        message: `Unfortunately, the enrollment request for ${student?.first_name} ${student?.last_name} in ${classInstance?.name} has been denied.${
          denial_reason ? `\n\nReason: ${denial_reason}` : ''
        }`,
        metadata: {
          student_name: `${student?.first_name} ${student?.last_name}`,
          class_name: classInstance?.name,
          denial_reason,
          processed_by: `${profile.first_name} ${profile.last_name}`,
        },
      })

      return {
        message: 'Enrollment request denied',
        enrollmentRequest: updatedRequest,
      }
    }

    // Action is 'approve'
    // Check if class has capacity
    const { count: currentEnrollments } = await client
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_instance_id', enrollmentRequest.class_instance_id)
      .eq('status', 'active')

    const maxStudents = classDef?.max_students
    const isFull = maxStudents && currentEnrollments !== null && currentEnrollments >= maxStudents

    // If class is full, update request to waitlist instead
    if (isFull) {
      const { data: updatedRequest, error: updateError } = await client
        .from('enrollment_requests')
        .update({
          status: 'waitlist',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          admin_notes: admin_notes || 'Class is full - moved to waitlist',
        })
        .eq('id', requestId)
        .select()
        .single()

      if (updateError) throw updateError

      // Create notification for parent
      await client.from('enrollment_notifications').insert({
        enrollment_request_id: requestId,
        guardian_id: enrollmentRequest.guardian_id,
        notification_type: 'waitlist_added',
        subject: 'Enrollment Request - Added to Waitlist',
        message: `The enrollment request for ${student?.first_name} ${student?.last_name} in ${classInstance?.name} has been approved, but the class is currently full. ${student?.first_name} has been added to the waitlist and will be notified if a spot becomes available.`,
        metadata: {
          student_name: `${student?.first_name} ${student?.last_name}`,
          class_name: classInstance?.name,
          processed_by: `${profile.first_name} ${profile.last_name}`,
        },
      })

      return {
        message: 'Class is full. Request approved and student added to waitlist.',
        enrollmentRequest: updatedRequest,
        waitlisted: true,
      }
    }

    // Create the actual enrollment
    const { data: enrollment, error: enrollmentError } = await client
      .from('enrollments')
      .insert({
        student_id: enrollmentRequest.student_id,
        class_instance_id: enrollmentRequest.class_instance_id,
        status: 'active',
        enrolled_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (enrollmentError) {
      // If enrollment creation fails, don't update the request status
      throw enrollmentError
    }

    // Update request to approved
    const { data: updatedRequest, error: updateError } = await client
      .from('enrollment_requests')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        admin_notes,
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      // If request update fails, delete the enrollment we just created
      await client.from('enrollments').delete().eq('id', enrollment.id)
      throw updateError
    }

    // Create notification for parent
    await client.from('enrollment_notifications').insert({
      enrollment_request_id: requestId,
      guardian_id: enrollmentRequest.guardian_id,
      notification_type: 'approved',
      subject: 'Enrollment Request Approved!',
      message: `Great news! The enrollment request for ${student?.first_name} ${student?.last_name} in ${classInstance?.name} has been approved. ${student?.first_name} is now enrolled in the class!`,
      metadata: {
        student_name: `${student?.first_name} ${student?.last_name}`,
        class_name: classInstance?.name,
        enrollment_id: enrollment.id,
        processed_by: `${profile.first_name} ${profile.last_name}`,
      },
    })

    return {
      message: 'Enrollment request approved and student enrolled successfully',
      enrollmentRequest: updatedRequest,
      enrollment,
      waitlisted: false,
    }
  } catch (error: any) {
    console.error('Error processing enrollment request:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to process enrollment request',
    })
  }
})
