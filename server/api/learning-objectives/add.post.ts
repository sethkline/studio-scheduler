/**
 * POST /api/learning-objectives/add
 * Create a new learning objective
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import type { CreateLearningObjectiveInput } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody<CreateLearningObjectiveInput>(event)

  // Validate required fields
  if (!body.title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title is required'
    })
  }

  // Create learning objective
  const { data, error } = await client
    .from('learning_objectives')
    .insert({
      class_definition_id: body.class_definition_id,
      dance_style_id: body.dance_style_id,
      class_level_id: body.class_level_id,
      title: body.title,
      description: body.description,
      category: body.category,
      skill_level: body.skill_level,
      sequence_order: body.sequence_order || 0,
      is_active: body.is_active !== undefined ? body.is_active : true
    })
    .select(`
      *,
      dance_style:dance_styles(id, name, color),
      class_level:class_levels(id, name),
      class_definition:class_definitions(id, name)
    `)
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create learning objective',
      data: error
    })
  }

  return {
    success: true,
    objective: data
  }
})
