import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = useSupabaseClient()
    const user = useSupabaseUser()

    if (!user.value) {
      return createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Get orders for the current user
    const { data: orders, error } = await client
      .from('merchandise_orders')
      .select(`
        *,
        items:merchandise_order_items(
          *,
          variant:merchandise_variants(
            *,
            product:merchandise_products(*)
          )
        )
      `)
      .eq('user_id', user.value.id)
      .order('order_date', { ascending: false })

    if (error) throw error

    return { orders }
  } catch (error) {
    console.error('Get my orders API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch orders'
    })
  }
})
