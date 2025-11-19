// server/api/venues/[id]/price-zones/[zoneId].delete.ts
import { requireAdmin } from '~/server/utils/auth'
import { requireAdmin } from '../../../../utils/auth'

/**
 * DELETE /api/venues/[id]/price-zones/[zoneId]
 * Delete a price zone
 * Requires: admin role
 * Cannot delete if price zone is assigned to seats
 */
export default defineEventHandler(async (event) => {
  try {
    // Require admin role
    await requireAdmin(event)

    const client = await serverSupabaseClient(event)
    const venueId = getRouterParam(event, 'id')
    const zoneId = getRouterParam(event, 'zoneId')

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

    // Check if price zone is assigned to any seats
    const { data: seats, error: seatsError } = await client
      .from('seats')
      .select('id')
      .eq('price_zone_id', zoneId)
      .limit(1)

    if (seatsError) {
      console.error('Error checking seats:', seatsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check price zone dependencies'
      })
    }

    if (seats && seats.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete price zone assigned to seats. Please reassign or delete seats first.'
      })
    }

    // Delete price zone
    const { error } = await client
      .from('price_zones')
      .delete()
      .eq('id', zoneId)

    if (error) {
      console.error('Error deleting price zone:', error)
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    return {
      success: true,
      message: 'Price zone deleted successfully'
    }
  } catch (error: any) {
    console.error('DELETE /api/venues/[id]/price-zones/[zoneId] error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete price zone'
    })
  }
})
