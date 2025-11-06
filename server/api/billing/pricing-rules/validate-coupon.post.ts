/**
 * POST /api/billing/pricing-rules/validate-coupon
 * Validate a coupon code
 */

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody<{ coupon_code: string }>(event)

  if (!body.coupon_code) {
    throw createError({
      statusCode: 400,
      message: 'Coupon code is required',
    })
  }

  // Find active coupon
  const { data: coupon, error } = await client
    .from('pricing_rules')
    .select('*')
    .eq('coupon_code', body.coupon_code.toUpperCase())
    .eq('is_active', true)
    .single()

  if (error || !coupon) {
    return {
      success: false,
      valid: false,
      message: 'Invalid coupon code',
    }
  }

  const today = new Date().toISOString().split('T')[0]

  // Check validity dates
  if (coupon.valid_from && coupon.valid_from > today) {
    return {
      success: false,
      valid: false,
      message: 'This coupon is not yet valid',
    }
  }

  if (coupon.valid_to && coupon.valid_to < today) {
    return {
      success: false,
      valid: false,
      message: 'This coupon has expired',
    }
  }

  // Check usage limits
  if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
    return {
      success: false,
      valid: false,
      message: 'This coupon has reached its usage limit',
    }
  }

  return {
    success: true,
    valid: true,
    data: {
      id: coupon.id,
      name: coupon.name,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_percentage: coupon.discount_percentage,
      discount_amount: coupon.discount_amount,
      discount_scope: coupon.discount_scope,
    },
    message: 'Coupon is valid',
  }
})
