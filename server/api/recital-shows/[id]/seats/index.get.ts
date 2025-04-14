import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const query = getQuery(event)
    
    // Parse query parameters
    const section = query.section as string
    const status = query.status as string
    const handicapAccess = query.handicap_access === 'true'
    
    // Build query
    let seatQuery = client
      .from('show_seats')
      .select(`
        id,
        section,
        section_type,
        row_name,
        seat_number,
        seat_type,
        handicap_access,
        status,
        price_in_cents,
        reserved_until
      `)
      .eq('show_id', id)
      .order('section')
      .order('row_name')
      .order('seat_number')
    
    // Apply filters if provided
    if (section) {
      seatQuery = seatQuery.eq('section', section)
    }
    
    if (status) {
      seatQuery = seatQuery.eq('status', status)
    }
    
    if (query.handicap_access !== undefined) {
      seatQuery = seatQuery.eq('handicap_access', handicapAccess)
    }
    
    // Execute query
    const { data, error } = await seatQuery
    
    if (error) throw error
    
    // Get total stats
    const { count: totalSeats, error: totalError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', id)
    
    if (totalError) throw totalError
    
    // Get available count
    const { count: availableSeats, error: availableError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', id)
      .eq('status', 'available')
    
    if (availableError) throw availableError
    
    // Get reserved count
    const { count: reservedSeats, error: reservedError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', id)
      .eq('status', 'reserved')
    
    if (reservedError) throw reservedError
    
    // Get sold count
    const { count: soldSeats, error: soldError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', id)
      .eq('status', 'sold')
    
    if (soldError) throw soldError
    
    // Process section statistics
    const sectionStats = []
    if (data && data.length > 0) {
      // Get unique sections
      const sections = [...new Set(data.map(seat => seat.section))]
      
      // Get stats for each section
      for (const section of sections) {
        const sectionSeats = data.filter(seat => seat.section === section)
        const availableInSection = sectionSeats.filter(seat => seat.status === 'available').length
        const reservedInSection = sectionSeats.filter(seat => seat.status === 'reserved').length
        const soldInSection = sectionSeats.filter(seat => seat.status === 'sold').length
        
        sectionStats.push({
          name: section,
          total: sectionSeats.length,
          available: availableInSection,
          reserved: reservedInSection,
          sold: soldInSection
        })
      }
    }
    
    return {
      seats: data || [],
      stats: {
        total: totalSeats || 0,
        available: availableSeats || 0,
        reserved: reservedSeats || 0,
        sold: soldSeats || 0
      },
      sectionStats
    }
  } catch (error) {
    console.error('Seats API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch seats'
    })
  }
})