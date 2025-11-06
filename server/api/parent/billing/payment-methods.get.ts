/**
 * GET /api/parent/billing/payment-methods
 * Get saved payment methods for the authenticated parent
 */

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    const { data, error } = await client
      .from('payment_methods')
      .select('*')
      .eq('parent_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch payment methods: ${error.message}`)
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch payment methods: ${error.message}`,
    })
  }
})
