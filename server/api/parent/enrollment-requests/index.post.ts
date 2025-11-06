import { getSupabaseClient } from '../../../utils/supabase'
import { validateEnrollmentRequest, type StudentEnrollment } from '~/utils/student-conflict-checker'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user
  const body = await readBody(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const { student_id, class_instance_id, notes } = body

  if (!student_id || !class_instance_id) {
    throw createError({
      statusCode: 400,
      message: 'Student ID and Class Instance ID are required',
    })
  }

  try {
    // Get guardian record for this user
    const { data: guardian, error: guardianError } = await client
      .from('guardians')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (guardianError || !guardian) {
      throw createError({
        statusCode: 404,
        message: 'Guardian profile not found',
      })
    }

    // Verify this guardian has access to this student
    const { data: relationship, error: relationshipError } = await client
      .from('student_guardian_relationships')
      .select('id')
      .eq('guardian_id', guardian.id)
      .eq('student_id', student_id)
      .single()

    if (relationshipError || !relationship) {
      throw createError({
        statusCode: 403,
        message: 'Access denied: You do not have permission to enroll this student',
      })
    }

    // Check if student already has a pending/approved request for this class
    const { data: existingRequest, error: requestCheckError } = await client
      .from('enrollment_requests')
      .select('id, status')
      .eq('student_id', student_id)
      .eq('class_instance_id', class_instance_id)
      .in('status', ['pending', 'approved', 'waitlist'])
      .maybeSingle()

    if (requestCheckError) throw requestCheckError

    if (existingRequest) {
      throw createError({
        statusCode: 400,
        message: `An enrollment request for this class already exists with status: ${existingRequest.status}`,
      })
    }

    // Check if student is already enrolled
    const { data: existingEnrollment, error: enrollmentCheckError } = await client
      .from('enrollments')
      .select('id, status')
      .eq('student_id', student_id)
      .eq('class_instance_id', class_instance_id)
      .in('status', ['active', 'waitlist'])
      .maybeSingle()

    if (enrollmentCheckError) throw enrollmentCheckError

    if (existingEnrollment) {
      throw createError({
        statusCode: 400,
        message: `Student is already enrolled in this class with status: ${existingEnrollment.status}`,
      })
    }

    // Get student details including age and current enrollments
    const { data: student, error: studentError } = await client
      .from('students')
      .select('id, first_name, last_name, date_of_birth')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      throw createError({
        statusCode: 404,
        message: 'Student not found',
      })
    }

    // Calculate student age
    const age = student.date_of_birth
      ? Math.floor(
          (new Date().getTime() - new Date(student.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        )
      : 0

    // Get current enrollments for conflict checking
    const { data: currentEnrollmentsData, error: enrollmentsError } = await client
      .from('enrollments')
      .select(`
        id,
        student_id,
        class_instance_id,
        status,
        class_instances (
          id,
          name,
          class_definitions (
            name,
            dance_styles (name)
          ),
          teachers (
            first_name,
            last_name
          )
        ),
        schedule_classes:class_instances (
          schedule_classes (
            day_of_week,
            start_time,
            end_time
          )
        )
      `)
      .eq('student_id', student_id)
      .in('status', ['active', 'waitlist'])

    if (enrollmentsError) throw enrollmentsError

    // Transform to StudentEnrollment format
    const currentEnrollments: StudentEnrollment[] = (currentEnrollmentsData || [])
      .filter(e => e.class_instances && e.schedule_classes?.schedule_classes?.[0])
      .map(e => {
        const classInstance = e.class_instances as any
        const scheduleClass = (e.schedule_classes as any)?.schedule_classes?.[0]
        return {
          id: e.id,
          student_id: e.student_id,
          class_instance_id: e.class_instance_id,
          status: e.status as 'active' | 'waitlist' | 'dropped',
          class_name: classInstance?.name || classInstance?.class_definitions?.name || 'Unknown Class',
          day_of_week: scheduleClass?.day_of_week || 0,
          start_time: scheduleClass?.start_time || '00:00',
          end_time: scheduleClass?.end_time || '00:00',
          teacher_name: classInstance?.teachers
            ? `${classInstance.teachers.first_name} ${classInstance.teachers.last_name}`
            : undefined,
          dance_style: classInstance?.class_definitions?.dance_styles?.name,
        }
      })

    // Get class details for validation
    const { data: classInstance, error: classError } = await client
      .from('class_instances')
      .select(`
        id,
        name,
        class_definitions (
          id,
          name,
          min_age,
          max_age,
          max_students,
          dance_styles (name)
        ),
        teachers (
          first_name,
          last_name
        ),
        schedule_classes (
          day_of_week,
          start_time,
          end_time
        )
      `)
      .eq('id', class_instance_id)
      .single()

    if (classError || !classInstance) {
      throw createError({
        statusCode: 404,
        message: 'Class not found',
      })
    }

    const classDef = classInstance.class_definitions as any
    const scheduleClass = (classInstance.schedule_classes as any)?.[0]

    if (!scheduleClass) {
      throw createError({
        statusCode: 400,
        message: 'Class schedule not found',
      })
    }

    // Get current enrollment count for capacity check
    const { count: currentEnrollmentCount } = await client
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_instance_id', class_instance_id)
      .eq('status', 'active')

    // Validate enrollment request
    const validation = await validateEnrollmentRequest({
      student: {
        id: student_id,
        age,
        currentEnrollments,
      },
      classDetails: {
        class_instance_id,
        class_name: classInstance.name || classDef?.name || 'Unknown Class',
        day_of_week: scheduleClass.day_of_week,
        start_time: scheduleClass.start_time,
        end_time: scheduleClass.end_time,
        teacher_name: (classInstance.teachers as any)
          ? `${(classInstance.teachers as any).first_name} ${(classInstance.teachers as any).last_name}`
          : undefined,
        dance_style: classDef?.dance_styles?.name,
        min_age: classDef?.min_age,
        max_age: classDef?.max_age,
        max_students: classDef?.max_students,
        current_enrollment_count: currentEnrollmentCount || 0,
      },
    })

    // If there are blocking conflicts, don't allow the request
    if (!validation.canEnroll) {
      throw createError({
        statusCode: 400,
        message: 'Cannot create enrollment request due to conflicts',
        data: {
          conflicts: validation.conflicts,
          warnings: validation.warnings,
        },
      })
    }

    // Determine initial status based on capacity
    const initialStatus = validation.requiresWaitlist ? 'waitlist' : 'pending'

    // Create enrollment request
    const { data: enrollmentRequest, error: createError } = await client
      .from('enrollment_requests')
      .insert({
        student_id,
        class_instance_id,
        guardian_id: guardian.id,
        status: initialStatus,
        notes,
        has_schedule_conflict: validation.conflicts.length > 0,
        conflict_details: {
          conflicts: validation.conflicts,
          warnings: validation.warnings,
        },
        requested_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) throw createError

    // Create notification for this request
    await client.from('enrollment_notifications').insert({
      enrollment_request_id: enrollmentRequest.id,
      guardian_id: guardian.id,
      notification_type: validation.requiresWaitlist ? 'waitlist_added' : 'request_received',
      subject: validation.requiresWaitlist
        ? 'Class Waitlist - Enrollment Request Received'
        : 'Enrollment Request Received',
      message: validation.requiresWaitlist
        ? `Your enrollment request for ${student.first_name} in ${classInstance.name} has been received. The class is currently full, and ${student.first_name} has been added to the waitlist.`
        : `Your enrollment request for ${student.first_name} in ${classInstance.name} has been received and is pending approval.`,
      metadata: {
        student_name: `${student.first_name} ${student.last_name}`,
        class_name: classInstance.name,
        status: initialStatus,
      },
    })

    return {
      message: validation.requiresWaitlist
        ? 'Class is full. Enrollment request created and added to waitlist.'
        : 'Enrollment request created successfully and pending approval.',
      enrollmentRequest,
      validation,
      requiresWaitlist: validation.requiresWaitlist,
    }
  } catch (error: any) {
    console.error('Error creating enrollment request:', error)

    // Re-throw createError errors directly
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create enrollment request',
    })
  }
})
