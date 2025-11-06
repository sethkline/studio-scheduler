/**
 * POST /api/billing/tuition-plans
 * Create a new tuition plan
 */

import type { CreateTuitionPlanInput, TuitionPlan } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody<CreateTuitionPlanInput>(event)

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Validate required fields
  if (!body.name || !body.plan_type || !body.base_price || !body.effective_from) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: name, plan_type, base_price, effective_from',
    })
  }

  // Validate base_price is positive
  if (body.base_price < 0) {
    throw createError({
      statusCode: 400,
      message: 'Base price must be positive',
    })
  }

  // Prepare data for insertion
  const planData = {
    name: body.name,
    description: body.description || null,
    plan_type: body.plan_type,
    is_active: body.is_active !== undefined ? body.is_active : true,
    effective_from: body.effective_from,
    effective_to: body.effective_to || null,
    base_price: body.base_price,
    classes_per_week: body.classes_per_week || null,
    registration_fee: body.registration_fee || 0,
    costume_fee: body.costume_fee || 0,
    recital_fee: body.recital_fee || 0,
    class_definition_id: body.class_definition_id || null,
    class_level_id: body.class_level_id || null,
    dance_style_id: body.dance_style_id || null,
    created_by: user.id,
  }

  // Insert tuition plan
  const { data, error } = await client
    .from('tuition_plans')
    .insert(planData)
    .select(`
      *,
      class_definition:class_definitions(id, name),
      class_level:class_levels(id, name),
      dance_style:dance_styles(id, name, color)
    `)
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to create tuition plan: ${error.message}`,
    })
  }

  return {
    success: true,
    data: data as TuitionPlan,
    message: 'Tuition plan created successfully',
  }
})
