// server/api/venues/[id]/seats/[seatId].put.ts

import type { UpdateSeatInput } from '~/types'

/**
 * PUT /api/venues/[id]/seats/[seatId]
 * Update a seat's properties
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const venueId = getRouterParam(event, 'id')
  const seatId = getRouterParam(event, 'seatId')

  if (!venueId || !seatId) {
    throw createError({
      statusCode: 400,
      message: 'Venue ID and Seat ID are required'
    })
  }

  const body = await readBody<UpdateSeatInput>(event)

  // Verify seat exists and belongs to this venue
  const { data: existingSeat, error: seatError } = await client
    .from('seats')
    .select('id, venue_id')
    .eq('id', seatId)
    .eq('venue_id', venueId)
    .single()

  if (seatError || !existingSeat) {
    throw createError({
      statusCode: 404,
      message: 'Seat not found or does not belong to this venue'
    })
  }

  // If price_zone_id is being updated, verify it exists and belongs to this venue
  if (body.price_zone_id) {
    const { data: priceZone, error: priceZoneError } = await client
      .from('price_zones')
      .select('id, venue_id')
      .eq('id', body.price_zone_id)
      .single()

    if (priceZoneError || !priceZone) {
      throw createError({
        statusCode: 404,
        message: 'Price zone not found'
      })
    }

    if (priceZone.venue_id !== venueId) {
      throw createError({
        statusCode: 400,
        message: 'Price zone does not belong to this venue'
      })
    }
  }

  // Update the seat
  const { data: updatedSeat, error: updateError } = await client
    .from('seats')
    .update(body)
    .eq('id', seatId)
    .select(`
      *,
      section:venue_sections(id, name),
      price_zone:price_zones(id, name, price_in_cents, color)
    `)
    .single()

  if (updateError) {
    throw createError({
      statusCode: 400,
      message: `Failed to update seat: ${updateError.message}`
    })
  }

  return {
    data: updatedSeat,
    message: 'Seat updated successfully'
  }
})
