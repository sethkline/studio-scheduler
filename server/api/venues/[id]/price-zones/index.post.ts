// server/api/venues/[id]/price-zones/index.post.ts
import { requireAdmin } from '../../../../utils/auth'

/**
 * POST /api/venues/[id]/price-zones
 * Create a new price zone for a venue
 * Requires: admin role
 */
export default defineEventHandler(async (event) => {
  try {
    // Require admin role
    await requireAdmin(event)

    const client = await serverSupabaseClient(event)
    const venueId = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!venueId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Venue ID is required'
      })
    }

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Price zone name is required'
      })
    }

    if (body.price_in_cents === undefined || body.price_in_cents === null) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Price is required'
      })
    }

    if (typeof body.price_in_cents !== 'number' || body.price_in_cents < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Price must be a non-negative number'
      })
    }

    // Verify venue exists
    const { data: venue, error: venueError } = await client
      .from('venues')
      .select('id')
      .eq('id', venueId)
      .single()

    if (venueError || !venue) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Venue not found'
      })
    }

    // Prepare price zone data
    const priceZoneData = {
      venue_id: venueId,
      name: body.name.trim(),
      price_in_cents: body.price_in_cents,
      color: body.color?.trim() || null
    }

    // Insert price zone
    const { data, error } = await client
      .from('price_zones')
      .insert([priceZoneData])
      .select()
      .single()

    if (error) {
      console.error('Error creating price zone:', error)
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    return {
      data,
      message: 'Price zone created successfully'
    }
  } catch (error: any) {
    console.error('POST /api/venues/[id]/price-zones error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create price zone'
    })
  }
})
