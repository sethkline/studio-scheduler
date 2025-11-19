// server/api/venues/[id]/seats/index.post.ts

import { requireAdminOrStaff } from '../../../../utils/auth'
import type { CreateSeatInput } from '~/types'

/**
 * POST /api/venues/[id]/seats
 * Create a single seat for a venue
 * Requires: admin or staff role
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

  const body = await readBody<CreateSeatInput>(event)

  // Validate required fields
  if (!body.section_id || !body.row_name || !body.seat_number) {
    throw createError({
      statusCode: 400,
      message: 'section_id, row_name, and seat_number are required'
    })
  }

  // Ensure venue_id matches
  if (body.venue_id && body.venue_id !== venueId) {
    throw createError({
      statusCode: 400,
      message: 'Venue ID in body does not match URL parameter'
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

  // Verify section exists and belongs to this venue
  const { data: section, error: sectionError } = await client
    .from('venue_sections')
    .select('id, venue_id')
    .eq('id', body.section_id)
    .single()

  if (sectionError || !section) {
    throw createError({
      statusCode: 404,
      message: 'Section not found'
    })
  }

  if (section.venue_id !== venueId) {
    throw createError({
      statusCode: 400,
      message: 'Section does not belong to this venue'
    })
  }

  // If price_zone_id is provided, verify it exists and belongs to this venue
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

  // Create the seat
  const seatData = {
    venue_id: venueId,
    section_id: body.section_id,
    row_name: body.row_name,
    seat_number: body.seat_number,
    seat_type: body.seat_type || 'regular',
    price_zone_id: body.price_zone_id || null,
    is_sellable: body.is_sellable !== undefined ? body.is_sellable : true,
    x_position: body.x_position || null,
    y_position: body.y_position || null
  }

  const { data: createdSeat, error: insertError } = await client
    .from('seats')
    .insert(seatData)
    .select(`
      *,
      section:venue_sections(id, name),
      price_zone:price_zones(id, name, price_in_cents, color)
    `)
    .single()

  if (insertError) {
    throw createError({
      statusCode: 400,
      message: `Failed to create seat: ${insertError.message}`
    })
  }

  return {
    data: createdSeat,
    message: 'Seat created successfully'
  }
})
