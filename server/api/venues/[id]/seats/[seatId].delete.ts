// server/api/venues/[id]/seats/[seatId].delete.ts

import { requireAdminOrStaff } from '../../../../utils/auth'

/**
 * DELETE /api/venues/[id]/seats/[seatId]
 * Delete a seat from a venue
 * Requires: admin or staff role
 */
export default defineEventHandler(async (event) => {
  // Require admin or staff role
  await requireAdminOrStaff(event)

  const client = await serverSupabaseClient(event)
  const venueId = getRouterParam(event, 'id')
  const seatId = getRouterParam(event, 'seatId')

  if (!venueId || !seatId) {
    throw createError({
      statusCode: 400,
      message: 'Venue ID and Seat ID are required'
    })
  }

  // Verify seat exists and belongs to this venue
  const { data: existingSeat, error: seatError } = await client
    .from('seats')
    .select('id, venue_id, row_name, seat_number')
    .eq('id', seatId)
    .eq('venue_id', venueId)
    .single()

  if (seatError || !existingSeat) {
    throw createError({
      statusCode: 404,
      message: 'Seat not found or does not belong to this venue'
    })
  }

  // Check if this seat is used in any show_seats (i.e., associated with a show)
  const { data: showSeats, error: showSeatsError } = await client
    .from('show_seats')
    .select('id')
    .eq('seat_id', seatId)
    .limit(1)

  if (showSeatsError) {
    throw createError({
      statusCode: 500,
      message: `Failed to check seat usage: ${showSeatsError.message}`
    })
  }

  if (showSeats && showSeats.length > 0) {
    throw createError({
      statusCode: 400,
      message: 'Cannot delete seat that is associated with a show. Please remove it from all shows first.'
    })
  }

  // Delete the seat
  const { error: deleteError } = await client
    .from('seats')
    .delete()
    .eq('id', seatId)

  if (deleteError) {
    throw createError({
      statusCode: 400,
      message: `Failed to delete seat: ${deleteError.message}`
    })
  }

  return {
    success: true,
    message: `Seat ${existingSeat.row_name}${existingSeat.seat_number} deleted successfully`
  }
})
