import { requireAuth, requireRole } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireRole(event, ['parent', 'admin', 'staff'])

  const client = await getUserSupabaseClient(event)
  const user = event.context.user
  const body = await readBody(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const { student_id, class_instance_id } = body

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

    // Check if student is already enrolled in this class
    const { data: existingEnrollment, error: checkError } = await client
      .from('enrollments')
      .select('id, status')
      .eq('student_id', student_id)
      .eq('class_instance_id', class_instance_id)
      .maybeSingle()

    if (checkError) throw checkError

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        throw createError({
          statusCode: 400,
          message: 'Student is already enrolled in this class',
        })
      }
    }

    // Get class instance details for capacity check
    const { data: classInstance, error: classError } = await client
      .from('class_instances')
      .select(`
        *,
        class_definition:class_definitions(max_students)
      `)
      .eq('id', class_instance_id)
      .single()

    if (classError) throw classError

    // Check current enrollment count
    const { count: currentEnrollments } = await client
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_instance_id', class_instance_id)
      .eq('status', 'active')

    const maxStudents = classInstance.class_definition?.max_students

    if (maxStudents && currentEnrollments && currentEnrollments >= maxStudents) {
      // Class is full - create as waitlist
      const { data: enrollment, error: enrollmentError } = await client
        .from('enrollments')
        .insert({
          student_id,
          class_instance_id,
          status: 'waitlist',
          enrolled_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (enrollmentError) throw enrollmentError

      return {
        message: 'Class is full. Student added to waitlist.',
        enrollment,
        waitlisted: true,
      }
    }

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await client
      .from('enrollments')
      .insert({
        student_id,
        class_instance_id,
        status: 'active',
        enrolled_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (enrollmentError) throw enrollmentError

    return {
      message: 'Student successfully enrolled',
      enrollment,
      waitlisted: false,
    }
  } catch (error: any) {
    console.error('Error creating enrollment:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create enrollment',
    })
  }
})
