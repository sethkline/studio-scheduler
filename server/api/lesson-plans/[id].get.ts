/**
 * GET /api/lesson-plans/[id]
 * Get a single lesson plan by ID with full details
 */
import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Lesson plan ID is required'
    })
  }

  // Fetch lesson plan with all related data
  const { data, error } = await client
    .from('lesson_plans')
    .select(`
      *,
      class_instance:class_instances(
        id,
        class_definition_id,
        class_definitions(
          id,
          name,
          dance_styles(id, name, color),
          class_levels(id, name)
        )
      ),
      teacher:teachers(
        id,
        first_name,
        last_name,
        email,
        profile_image_url
      ),
      template:lesson_plan_templates(
        id,
        name
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Lesson plan not found'
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch lesson plan',
      data: error
    })
  }

  // Fetch linked objectives
  const { data: objectives, error: objectivesError } = await client
    .from('lesson_plan_objectives')
    .select(`
      id,
      is_primary,
      notes,
      learning_objective:learning_objectives(
        id,
        title,
        description,
        category,
        skill_level,
        dance_styles(id, name, color),
        class_levels(id, name)
      )
    `)
    .eq('lesson_plan_id', id)

  if (objectivesError) {
    console.error('Failed to fetch objectives:', objectivesError)
  }

  // Fetch shared teachers
  const { data: shares, error: sharesError } = await client
    .from('lesson_plan_shares')
    .select(`
      id,
      permission_level,
      message,
      created_at,
      shared_with_teacher:teachers!shared_with_teacher_id(
        id,
        first_name,
        last_name,
        email
      ),
      shared_by_teacher:teachers!shared_by_teacher_id(
        id,
        first_name,
        last_name
      )
    `)
    .eq('lesson_plan_id', id)

  if (sharesError) {
    console.error('Failed to fetch shares:', sharesError)
  }

  // Fetch attachments
  const { data: attachments, error: attachmentsError } = await client
    .from('lesson_plan_attachments')
    .select('*')
    .eq('lesson_plan_id', id)

  if (attachmentsError) {
    console.error('Failed to fetch attachments:', attachmentsError)
  }

  return {
    lesson_plan: {
      ...data,
      linked_objectives: objectives || [],
      shared_with: shares || [],
      attachments: attachments || []
    }
  }
})
