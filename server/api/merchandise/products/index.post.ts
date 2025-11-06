import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)

    // Validate required fields
    if (!body.name || !body.category || body.base_price_in_cents === undefined) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: name, category, base_price_in_cents'
      })
    }

    // Create the product
    const { data: product, error } = await client
      .from('merchandise_products')
      .insert({
        name: body.name,
        description: body.description,
        category: body.category,
        base_price_in_cents: body.base_price_in_cents,
        image_url: body.image_url,
        additional_images: body.additional_images || [],
        is_active: body.is_active !== undefined ? body.is_active : true,
        sort_order: body.sort_order || 0
      })
      .select()
      .single()

    if (error) throw error

    return { product }
  } catch (error) {
    console.error('Create product API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create product'
    })
  }
})
