// server/api/venues/[id]/seat-map.post.ts

import { requireAdminOrStaff } from '../../../utils/auth'
import type { BulkCreateSeatsInput } from '~/types'

/**
 * POST /api/venues/[id]/seat-map
 * Bulk save seats for a venue (creates multiple seats at once)
 * Requires: admin or staff role
 * Note: The insert operation is atomic - either all seats are created or none are
 */
export default defineEventHandler(async (event) => {
  // Require admin or staff role
  await requireAdminOrStaff(event)

  const client = await serverSupabaseClient(event)
  const venueId = getRouterParam(event, 'id')

  if (!venueId) {
    throw createError({
      statusCode: 400,
      message: 'Venue ID is required'
    })
  }

  const body = await readBody<BulkCreateSeatsInput>(event)

  if (!body.seats || !Array.isArray(body.seats) || body.seats.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Seats array is required and must not be empty'
    })
  }

  // Validate that all seats belong to this venue
  const invalidSeats = body.seats.filter(seat => seat.venue_id !== venueId)
  if (invalidSeats.length > 0) {
    throw createError({
      statusCode: 400,
      message: 'All seats must belong to the specified venue'
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
      message: 'Venue not found'
    })
  }

  // Insert all seats in a single transaction
  const { data: createdSeats, error: insertError } = await client
    .from('seats')
    .insert(body.seats)
    .select(`
      *,
      section:venue_sections(id, name),
      price_zone:price_zones(id, name, price_in_cents, color)
    `)

  if (insertError) {
    throw createError({
      statusCode: 400,
      message: `Failed to create seats: ${insertError.message}`
    })
  }

  return {
    data: createdSeats,
    message: `Successfully created ${createdSeats?.length || 0} seats`
  }
})
