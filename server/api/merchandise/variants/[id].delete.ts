import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Variant ID is required'
      })
    }

    // Delete the variant (inventory will cascade delete)
    const { error } = await client
      .from('merchandise_variants')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true, message: 'Variant deleted successfully' }
  } catch (error) {
    console.error('Delete variant API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete variant'
    })
  }
})
