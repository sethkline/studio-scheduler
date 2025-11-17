// server/api/venues/[id]/price-zones/[zoneId].put.ts
import { requireAdmin } from '../../../../utils/auth'

/**
 * PUT /api/venues/[id]/price-zones/[zoneId]
 * Update a price zone
 * Requires: admin role
 */
export default defineEventHandler(async (event) => {
  try {
    // Require admin role
    await requireAdmin(event)

    const client = await serverSupabaseClient(event)
    const venueId = getRouterParam(event, 'id')
    const zoneId = getRouterParam(event, 'zoneId')
    const body = await readBody(event)

    if (!venueId || !zoneId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Venue ID and Price Zone ID are required'
      })
    }

    // Verify price zone exists and belongs to this venue
    const { data: existingZone, error: zoneError } = await client
      .from('price_zones')
      .select('id, venue_id')
      .eq('id', zoneId)
      .eq('venue_id', venueId)
      .single()

    if (zoneError || !existingZone) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Price zone not found'
      })
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {}

    if (body.name !== undefined && body.name.trim() !== '') {
      updateData.name = body.name.trim()
    }

    if (body.price_in_cents !== undefined) {
      if (typeof body.price_in_cents !== 'number' || body.price_in_cents < 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Price must be a non-negative number'
        })
      }
      updateData.price_in_cents = body.price_in_cents
    }

    if (body.color !== undefined) {
      updateData.color = body.color?.trim() || null
    }

    updateData.updated_at = new Date().toISOString()

    // Update price zone
    const { data, error } = await client
      .from('price_zones')
      .update(updateData)
      .eq('id', zoneId)
      .select()
      .single()

    if (error) {
      console.error('Error updating price zone:', error)
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    return {
      data,
      message: 'Price zone updated successfully'
    }
  } catch (error: any) {
    console.error('PUT /api/venues/[id]/price-zones/[zoneId] error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update price zone'
    })
  }
})
