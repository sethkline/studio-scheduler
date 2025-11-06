import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Product ID is required'
      })
    }

    // Get the product with variants and inventory
    const { data: product, error: productError } = await client
      .from('merchandise_products')
      .select(`
        *,
        variants:merchandise_variants(
          *,
          inventory:merchandise_inventory(*)
        )
      `)
      .eq('id', id)
      .single()

    if (productError) throw productError

    if (!product) {
      return createError({
        statusCode: 404,
        statusMessage: 'Product not found'
      })
    }

    return product
  } catch (error) {
    console.error('Get product API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch product'
    })
  }
})
