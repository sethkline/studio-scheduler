/**
 * POST /api/billing/family-discounts
 * Apply a discount or scholarship to a student/family
 */

import type { ApplyDiscountInput, FamilyDiscount } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody<ApplyDiscountInput>(event)

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Validate required fields
  if (!body.student_id || !body.pricing_rule_id || !body.valid_from) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: student_id, pricing_rule_id, valid_from',
    })
  }

  // Verify the pricing rule exists
  const { data: pricingRule, error: ruleError } = await client
    .from('pricing_rules')
    .select('*')
    .eq('id', body.pricing_rule_id)
    .eq('is_active', true)
    .single()

  if (ruleError || !pricingRule) {
    throw createError({
      statusCode: 404,
      message: 'Pricing rule not found or inactive',
    })
  }

  // Verify the student exists
  const { data: student, error: studentError } = await client
    .from('students')
    .select('*')
    .eq('id', body.student_id)
    .single()

  if (studentError || !student) {
    throw createError({
      statusCode: 404,
      message: 'Student not found',
    })
  }

  // Prepare discount data
  const discountData = {
    student_id: body.student_id,
    pricing_rule_id: body.pricing_rule_id,
    is_scholarship: body.is_scholarship || false,
    scholarship_amount: body.scholarship_amount || null,
    scholarship_percentage: body.scholarship_percentage || null,
    scholarship_notes: body.scholarship_notes || null,
    is_active: true,
    valid_from: body.valid_from,
    valid_to: body.valid_to || null,
    approved_by: body.is_scholarship ? user.id : null,
    approved_at: body.is_scholarship ? new Date().toISOString() : null,
  }

  // Insert family discount
  const { data, error } = await client
    .from('family_discounts')
    .insert(discountData)
    .select(`
      *,
      student:students(id, first_name, last_name),
      pricing_rule:pricing_rules(id, name, discount_type, discount_percentage, discount_amount)
    `)
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to apply discount: ${error.message}`,
    })
  }

  return {
    success: true,
    data: data as FamilyDiscount,
    message: body.is_scholarship ? 'Scholarship applied successfully' : 'Discount applied successfully',
  }
})
