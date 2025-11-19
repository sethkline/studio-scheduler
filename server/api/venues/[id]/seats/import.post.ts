// server/api/venues/[id]/seats/import.post.ts

import { requireAdminOrStaff } from '~/server/utils/auth'
import { requireAdminOrStaff } from '../../../../utils/auth'
import type { CreateSeatInput } from '~/types'

/**
 * POST /api/venues/[id]/seats/import
 * Import seats from CSV in bulk
 * Handles duplicates gracefully by skipping them
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

  const body = await readBody<{ seats: CreateSeatInput[] }>(event)

  if (!body.seats || !Array.isArray(body.seats) || body.seats.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Seats array is required and must not be empty'
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

  // Get existing seats for duplicate detection
  const { data: existingSeats, error: fetchError } = await client
    .from('seats')
    .select('section_id, row_name, seat_number')
    .eq('venue_id', venueId)

  if (fetchError) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch existing seats: ${fetchError.message}`
    })
  }

  // Create a set of existing seat keys for fast lookup
  const existingSeatKeys = new Set(
    existingSeats?.map((s) => `${s.section_id}:${s.row_name}:${s.seat_number}`) || []
  )

  // Process seats: filter out duplicates
  const seatsToCreate: CreateSeatInput[] = []
  const skipped: { seat: CreateSeatInput; error: string }[] = []

  body.seats.forEach((seat) => {
    // Validate venue_id matches
    if (seat.venue_id !== venueId) {
      skipped.push({
        seat,
        error: 'Venue ID mismatch'
      })
      return
    }

    // Check for duplicate
    const seatKey = `${seat.section_id}:${seat.row_name}:${seat.seat_number}`
    if (existingSeatKeys.has(seatKey)) {
      skipped.push({
        seat,
        error: 'Duplicate seat (already exists)'
      })
      return
    }

    // Check for duplicate within the import batch
    if (seatsToCreate.some(
      (s) => s.section_id === seat.section_id &&
             s.row_name === seat.row_name &&
             s.seat_number === seat.seat_number
    )) {
      skipped.push({
        seat,
        error: 'Duplicate seat (appears multiple times in import)'
      })
      return
    }

    // Validate required fields
    if (!seat.section_id || !seat.row_name || !seat.seat_number) {
      skipped.push({
        seat,
        error: 'Missing required fields (section_id, row_name, or seat_number)'
      })
      return
    }

    // Validate seat type
    const validSeatTypes = ['regular', 'ada', 'house', 'blocked']
    if (!validSeatTypes.includes(seat.seat_type)) {
      skipped.push({
        seat,
        error: `Invalid seat_type: ${seat.seat_type}`
      })
      return
    }

    // Add to seats to create
    seatsToCreate.push(seat)
  })

  // Insert seats if there are any to create
  let createdSeats: any[] = []
  if (seatsToCreate.length > 0) {
    const { data, error: insertError } = await client
      .from('seats')
      .insert(seatsToCreate)
      .select(`
        *,
        section:venue_sections(id, name),
        price_zone:price_zones(id, name, price_in_cents, color)
      `)

    if (insertError) {
      throw createError({
        statusCode: 400,
        message: `Failed to import seats: ${insertError.message}`
      })
    }

    createdSeats = data || []
  }

  return {
    created: createdSeats.length,
    skipped: skipped.map(s => ({
      row_name: s.seat.row_name,
      seat_number: s.seat.seat_number,
      error: s.error
    })),
    total: body.seats.length,
    seats: createdSeats,
    message: `Successfully imported ${createdSeats.length} of ${body.seats.length} seats${
      skipped.length > 0 ? ` (${skipped.length} skipped)` : ''
    }`
  }
})
