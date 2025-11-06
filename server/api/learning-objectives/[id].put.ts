/**
 * PUT /api/learning-objectives/[id]
 * Update a learning objective
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import type { UpdateLearningObjectiveInput } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')
  const body = await readBody<UpdateLearningObjectiveInput>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Learning objective ID is required'
    })
  }

  // Build update object
  const updateData: any = {}

  if (body.class_definition_id !== undefined) updateData.class_definition_id = body.class_definition_id
  if (body.dance_style_id !== undefined) updateData.dance_style_id = body.dance_style_id
  if (body.class_level_id !== undefined) updateData.class_level_id = body.class_level_id
  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description
  if (body.category !== undefined) updateData.category = body.category
  if (body.skill_level !== undefined) updateData.skill_level = body.skill_level
  if (body.sequence_order !== undefined) updateData.sequence_order = body.sequence_order
  if (body.is_active !== undefined) updateData.is_active = body.is_active

  // Update learning objective
  const { data, error } = await client
    .from('learning_objectives')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      dance_style:dance_styles(id, name, color),
      class_level:class_levels(id, name),
      class_definition:class_definitions(id, name)
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Learning objective not found'
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update learning objective',
      data: error
    })
  }

  return {
    success: true,
    objective: data
  }
})
