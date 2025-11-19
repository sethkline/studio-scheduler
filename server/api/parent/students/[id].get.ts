import { requireAuth, requireRole } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireRole(event, ['parent', 'admin', 'staff'])

  const client = await getUserSupabaseClient(event)
  const user = event.context.user
  const studentId = event.context.params?.id

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!studentId) {
    throw createError({
      statusCode: 400,
      message: 'Student ID is required',
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
      .select('*')
      .eq('guardian_id', guardian.id)
      .eq('student_id', studentId)
      .single()

    if (relationshipError || !relationship) {
      throw createError({
        statusCode: 403,
        message: 'Access denied: You do not have permission to view this student',
      })
    }

    // Get student details
    const { data: student, error: studentError } = await client
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single()

    if (studentError) throw studentError

    // Get all guardians for this student
    const { data: allRelationships, error: allRelError } = await client
      .from('student_guardian_relationships')
      .select(`
        *,
        guardian:guardians(*)
      `)
      .eq('student_id', studentId)

    if (allRelError) throw allRelError

    const guardians = allRelationships?.map((rel: any) => ({
      ...rel.guardian,
      relationship: {
        relationship: rel.relationship,
        relationship_custom: rel.relationship_custom,
        primary_contact: rel.primary_contact,
        authorized_pickup: rel.authorized_pickup,
        financial_responsibility: rel.financial_responsibility,
        can_authorize_medical: rel.can_authorize_medical,
      },
    })) || []

    // Get student's current enrollments
    const { data: enrollments, error: enrollmentsError } = await client
      .from('enrollments')
      .select(`
        *,
        class_instance:class_instances(
          id,
          name,
          class_definition:class_definitions(
            name,
            dance_style:dance_styles(name, color)
          ),
          teacher:profiles(first_name, last_name)
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'active')

    if (enrollmentsError) throw enrollmentsError

    return {
      student,
      guardians,
      enrollments: enrollments || [],
    }
  } catch (error: any) {
    console.error('Error fetching student details:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch student details',
    })
  }
})
