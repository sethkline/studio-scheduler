// server/api/public/recital-shows/[id]/seats/index.ts
import { getSupabaseClient } from '../../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const query = getQuery(event)
    
    // Parse query parameters
    const section = query.section as string
    const handicapAccess = query.handicap_access === 'true'
    
    // Build the query
    let seatsQuery = client
      .from('show_seats')
      .select(`
        id,
        section,
        section_type,
        row_name,
        seat_number,
        seat_type,
        handicap_access,
        price_in_cents,
        status
      `)
      .eq('recital_show_id', id)
      .eq('status', 'available')
      .is('reserved_until', null)
      .order('section')
      .order('row_name')
      .order('seat_number')
    
    // Apply filters if provided
    if (section) {
      seatsQuery = seatsQuery.eq('section', section)
    }
    
    if (handicapAccess) {
      seatsQuery = seatsQuery.eq('handicap_access', true)
    }
    
    // Execute query
    const { data: seats, error: seatsError } = await seatsQuery
    
    if (seatsError) throw seatsError
    
    // Get section statistics
    const { data: sections, error: sectionsError } = await client
      .from('show_seats')
      .select(`
        section,
        section_type,
        status
      `)
      .eq('recital_show_id', id)
    
    if (sectionsError) throw sectionsError
    
    // Calculate available seats per section
    const sectionStats = sections.reduce((acc, seat) => {
      if (!acc[seat.section]) {
        acc[seat.section] = {
          name: seat.section,
          section_type: seat.section_type,
          total: 0,
          available: 0
        }
      }
      
      acc[seat.section].total++;
      
      if (seat.status === 'available' && !seat.reserved_until) {
        acc[seat.section].available++;
      }
      
      return acc
    }, {})
    
    return {
      available_seats: seats,
      sections: Object.values(sectionStats)
    }
  } catch (error) {
    console.error('Get available seats API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch available seats'
    })
  }
})

