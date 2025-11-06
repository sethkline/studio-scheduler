/**
 * PUT /api/billing/tuition-plans/[id]
 * Update a tuition plan
 */

import type { UpdateTuitionPlanInput, TuitionPlan } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')
  const body = await readBody<UpdateTuitionPlanInput>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Tuition plan ID is required',
    })
  }

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Validate base_price if provided
  if (body.base_price !== undefined && body.base_price < 0) {
    throw createError({
      statusCode: 400,
      message: 'Base price must be positive',
    })
  }

  // Build update object (only include provided fields)
  const updateData: any = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.description !== undefined) updateData.description = body.description
  if (body.plan_type !== undefined) updateData.plan_type = body.plan_type
  if (body.is_active !== undefined) updateData.is_active = body.is_active
  if (body.effective_from !== undefined) updateData.effective_from = body.effective_from
  if (body.effective_to !== undefined) updateData.effective_to = body.effective_to
  if (body.base_price !== undefined) updateData.base_price = body.base_price
  if (body.classes_per_week !== undefined) updateData.classes_per_week = body.classes_per_week
  if (body.registration_fee !== undefined) updateData.registration_fee = body.registration_fee
  if (body.costume_fee !== undefined) updateData.costume_fee = body.costume_fee
  if (body.recital_fee !== undefined) updateData.recital_fee = body.recital_fee
  if (body.class_definition_id !== undefined) updateData.class_definition_id = body.class_definition_id
  if (body.class_level_id !== undefined) updateData.class_level_id = body.class_level_id
  if (body.dance_style_id !== undefined) updateData.dance_style_id = body.dance_style_id

  // Update tuition plan
  const { data, error } = await client
    .from('tuition_plans')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      class_definition:class_definitions(id, name),
      class_level:class_levels(id, name),
      dance_style:dance_styles(id, name, color)
    `)
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 500,
      message: error.code === 'PGRST116' ? 'Tuition plan not found' : `Failed to update tuition plan: ${error.message}`,
    })
  }

  return {
    success: true,
    data: data as TuitionPlan,
    message: 'Tuition plan updated successfully',
  }
})
