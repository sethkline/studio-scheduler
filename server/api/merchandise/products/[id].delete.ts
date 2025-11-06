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

    // Delete the product (variants and inventory will cascade delete)
    const { error } = await client
      .from('merchandise_products')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true, message: 'Product deleted successfully' }
  } catch (error) {
    console.error('Delete product API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete product'
    })
  }
})
