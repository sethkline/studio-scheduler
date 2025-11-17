// server/api/public/recital-shows/[id]/seats/index.get.ts
import { getSupabaseClient } from '../../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    // Fetch show_seats with proper joins to get seat details
    const { data: showSeats, error: seatsError } = await client
      .from('show_seats')
      .select(`
        id,
        status,
        price_in_cents,
        reserved_until,
        seat:seats (
          id,
          row_name,
          seat_number,
          seat_type,
          venue_section:venue_sections (
            id,
            name,
            display_order
          ),
          price_zone:price_zones (
            id,
            name,
            color
          )
        )
      `)
      .eq('show_id', id)
      .order('seat(venue_section(display_order))')
      .order('seat(row_name)')
      .order('seat(seat_number)')

    if (seatsError) {
      console.error('Error fetching show seats:', seatsError)
      throw seatsError
    }

    if (!showSeats || showSeats.length === 0) {
      return {
        seats: [],
        sections: []
      }
    }

    // Transform the data to a flatter structure that the frontend expects
    const seats = showSeats.map(showSeat => ({
      id: showSeat.id,
      status: showSeat.status,
      price_in_cents: showSeat.price_in_cents,
      reserved_until: showSeat.reserved_until,
      row_name: showSeat.seat?.row_name || '',
      seat_number: showSeat.seat?.seat_number || '',
      seat_type: showSeat.seat?.seat_type || 'regular',
      section: showSeat.seat?.venue_section?.name || 'Unknown',
      section_id: showSeat.seat?.venue_section?.id,
      section_type: showSeat.seat?.venue_section?.name || 'center', // You may need to add a type field to venue_sections
      handicap_access: showSeat.seat?.seat_type === 'ada',
      price_zone_id: showSeat.seat?.price_zone?.id,
      price_zone_name: showSeat.seat?.price_zone?.name,
      price_zone_color: showSeat.seat?.price_zone?.color
    }))

    // Calculate section statistics
    const sectionStats = {}
    seats.forEach(seat => {
      if (!sectionStats[seat.section]) {
        sectionStats[seat.section] = {
          name: seat.section,
          section_type: seat.section_type,
          total: 0,
          available: 0,
          sold: 0,
          reserved: 0
        }
      }

      sectionStats[seat.section].total++

      if (seat.status === 'available' && !seat.reserved_until) {
        sectionStats[seat.section].available++
      } else if (seat.status === 'sold') {
        sectionStats[seat.section].sold++
      } else if (seat.status === 'reserved') {
        sectionStats[seat.section].reserved++
      }
    })

    return {
      seats,
      sections: Object.values(sectionStats)
    }
  } catch (error) {
    console.error('Get show seats API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch show seats'
    })
  }
})

