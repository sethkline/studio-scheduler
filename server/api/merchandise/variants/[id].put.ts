import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Variant ID is required'
      })
    }

    // Build update object
    const updates: any = {}

    if (body.sku !== undefined) updates.sku = body.sku
    if (body.size !== undefined) updates.size = body.size
    if (body.color !== undefined) updates.color = body.color
    if (body.price_adjustment_in_cents !== undefined) updates.price_adjustment_in_cents = body.price_adjustment_in_cents
    if (body.is_available !== undefined) updates.is_available = body.is_available

    // Update the variant
    const { data: variant, error } = await client
      .from('merchandise_variants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!variant) {
      return createError({
        statusCode: 404,
        statusMessage: 'Variant not found'
      })
    }

    return { variant }
  } catch (error) {
    console.error('Update variant API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update variant'
    })
  }
})
