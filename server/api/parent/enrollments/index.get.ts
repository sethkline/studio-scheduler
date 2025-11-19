import { requireAuth, requireRole } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireRole(event, ['parent', 'admin', 'staff'])

  const client = await getUserSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
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

    // Get all students linked to this guardian
    const { data: relationships, error: relationshipsError } = await client
      .from('student_guardian_relationships')
      .select('student_id')
      .eq('guardian_id', guardian.id)

    if (relationshipsError) throw relationshipsError

    const studentIds = relationships?.map((rel: any) => rel.student_id) || []

    if (studentIds.length === 0) {
      return {
        enrollments: [],
      }
    }

    // Get all enrollments for these students
    const { data: enrollments, error: enrollmentsError } = await client
      .from('enrollments')
      .select(`
        *,
        student:students(id, first_name, last_name),
        class_instance:class_instances(
          id,
          name,
          class_definition:class_definitions(
            name,
            dance_style:dance_styles(name, color)
          ),
          teacher:profiles(first_name, last_name),
          schedule_classes(day_of_week, start_time, end_time)
        )
      `)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })

    if (enrollmentsError) throw enrollmentsError

    return {
      enrollments: enrollments || [],
    }
  } catch (error: any) {
    console.error('Error fetching enrollments:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch enrollments',
    })
  }
})
