import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Product ID is required'
      })
    }

    // Build update object with only provided fields
    const updates: any = {}

    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.category !== undefined) updates.category = body.category
    if (body.base_price_in_cents !== undefined) updates.base_price_in_cents = body.base_price_in_cents
    if (body.image_url !== undefined) updates.image_url = body.image_url
    if (body.additional_images !== undefined) updates.additional_images = body.additional_images
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order

    // Update the product
    const { data: product, error } = await client
      .from('merchandise_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!product) {
      return createError({
        statusCode: 404,
        statusMessage: 'Product not found'
      })
    }

    return { product }
  } catch (error) {
    console.error('Update product API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update product'
    })
  }
})
