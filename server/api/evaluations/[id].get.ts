/**
 * GET /api/evaluations/[id]
 *
 * Fetch a single evaluation by ID with all related data.
 * Access: Teachers (own evaluations), Admin/Staff (all), Parents (children's evaluations)
 */

import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Evaluation ID is required'
      })
    }

    // Get authenticated user
    const authHeader = event.node.req.headers.authorization
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await client.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Get user profile to check role
    const { data: profile } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    // Fetch evaluation with all relationships
    const { data: evaluation, error } = await client
      .from('evaluations')
      .select(`
        *,
        student:students!evaluations_student_id_fkey(id, first_name, last_name, date_of_birth),
        teacher:teachers!evaluations_teacher_id_fkey(id, first_name, last_name),
        class_instance:class_instances!evaluations_class_instance_id_fkey(
          id,
          name,
          class_definition:class_definitions(
            id,
            name,
            dance_style:dance_styles(id, name, color),
            class_level:class_levels(id, name)
          )
        ),
        schedule:schedules!evaluations_schedule_id_fkey(id, name, start_date, end_date),
        recommended_level:class_levels!evaluations_recommended_next_level_fkey(id, name),
        evaluation_skills(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Evaluation not found'
        })
      }
      throw error
    }

    // Check permissions
    if (profile?.user_role === 'teacher') {
      // Teachers can only view their own evaluations
      if (evaluation.teacher_id !== user.id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Permission denied'
        })
      }
    } else if (profile?.user_role === 'parent') {
      // Parents can only view their children's evaluations
      const { data: guardianship } = await client
        .from('guardians')
        .select('student_id')
        .eq('guardian_id', user.id)
        .eq('student_id', evaluation.student_id)
        .single()

      if (!guardianship) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Permission denied'
        })
      }
    } else if (!['admin', 'staff'].includes(profile?.user_role || '')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied'
      })
    }

    return {
      evaluation
    }
  } catch (error: any) {
    console.error('Get evaluation API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch evaluation'
    })
  }
})
