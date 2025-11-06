/**
 * POST /api/billing/pricing-rules
 * Create a new pricing rule (discount)
 */

import type { CreatePricingRuleInput, PricingRule } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody<CreatePricingRuleInput>(event)

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Validate required fields
  if (!body.name || !body.discount_type || !body.discount_scope) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: name, discount_type, discount_scope',
    })
  }

  // Validate discount value is provided
  if (!body.discount_percentage && !body.discount_amount) {
    throw createError({
      statusCode: 400,
      message: 'Either discount_percentage or discount_amount must be provided',
    })
  }

  // Validate discount values
  if (body.discount_percentage && (body.discount_percentage < 0 || body.discount_percentage > 100)) {
    throw createError({
      statusCode: 400,
      message: 'Discount percentage must be between 0 and 100',
    })
  }

  if (body.discount_amount && body.discount_amount < 0) {
    throw createError({
      statusCode: 400,
      message: 'Discount amount must be positive',
    })
  }

  // Prepare data for insertion
  const ruleData = {
    name: body.name,
    description: body.description || null,
    discount_type: body.discount_type,
    discount_scope: body.discount_scope,
    discount_percentage: body.discount_percentage || null,
    discount_amount: body.discount_amount || null,
    min_classes: body.min_classes || 1,
    applies_to_class_number: body.applies_to_class_number || null,
    requires_sibling: body.requires_sibling || false,
    early_registration_days: body.early_registration_days || null,
    coupon_code: body.coupon_code || null,
    max_uses: body.max_uses || null,
    is_active: body.is_active !== undefined ? body.is_active : true,
    valid_from: body.valid_from || null,
    valid_to: body.valid_to || null,
    created_by: user.id,
  }

  // Insert pricing rule
  const { data, error } = await client
    .from('pricing_rules')
    .insert(ruleData)
    .select()
    .single()

  if (error) {
    // Check for unique constraint violation on coupon_code
    if (error.code === '23505') {
      throw createError({
        statusCode: 409,
        message: 'A pricing rule with this coupon code already exists',
      })
    }

    throw createError({
      statusCode: 500,
      message: `Failed to create pricing rule: ${error.message}`,
    })
  }

  return {
    success: true,
    data: data as PricingRule,
    message: 'Pricing rule created successfully',
  }
})
