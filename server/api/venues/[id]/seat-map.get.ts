// server/api/venues/[id]/seat-map.get.ts

import type { SeatMapData } from '~/types'

/**
 * GET /api/venues/[id]/seat-map
 * Fetch complete seat map data for a venue (sections, price zones, and seats)
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const venueId = getRouterParam(event, 'id')

  if (!venueId) {
    throw createError({
      statusCode: 400,
      message: 'Venue ID is required'
    })
  }

  // Fetch venue
  const { data: venue, error: venueError } = await client
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single()

  if (venueError || !venue) {
    throw createError({
      statusCode: 404,
      message: 'Venue not found'
    })
  }

  // Fetch sections
  const { data: sections, error: sectionsError } = await client
    .from('venue_sections')
    .select('*')
    .eq('venue_id', venueId)
    .order('display_order', { ascending: true })

  if (sectionsError) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch sections: ${sectionsError.message}`
    })
  }

  // Fetch price zones
  const { data: priceZones, error: priceZonesError } = await client
    .from('price_zones')
    .select('*')
    .eq('venue_id', venueId)

  if (priceZonesError) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch price zones: ${priceZonesError.message}`
    })
  }

  // Fetch all seats for this venue
  const { data: seats, error: seatsError } = await client
    .from('seats')
    .select(`
      *,
      section:venue_sections(id, name),
      price_zone:price_zones(id, name, price_in_cents, color)
    `)
    .eq('venue_id', venueId)
    .order('row_name', { ascending: true })

  if (seatsError) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch seats: ${seatsError.message}`
    })
  }

  const seatMapData: SeatMapData = {
    venue_id: venueId,
    sections: sections || [],
    price_zones: priceZones || [],
    seats: seats || []
  }

  return {
    data: seatMapData
  }
})
