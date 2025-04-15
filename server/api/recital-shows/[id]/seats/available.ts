// server/api/recital-shows/[id]/seats/available.ts
import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const showId = getRouterParam(event, 'id')
    const query = getQuery(event)
    
    // Parse query parameters for filtering
    const section = query.section as string
    const handicapAccess = query.handicap_access === 'true'
    
    // Build the query
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
        price_in_cents
      `)
      .eq('show_id', showId)
      .eq('status', 'available') // Only get available seats
    
    // Apply optional filters
    if (section) {
      seatQuery = seatQuery.eq('section', section)
    }
    
    if (handicapAccess) {
      seatQuery = seatQuery.eq('handicap_access', true)
    }
    
    // Execute the query
    const { data: seats, error: seatsError } = await seatQuery
    
    if (seatsError) throw seatsError
    
    // Get section statistics
    const { data: sections, error: sectionsError } = await client
      .from('show_seats')
      .select('section, section_type, status')
      .eq('show_id', showId)
    
    if (sectionsError) throw sectionsError
    
    // Process section statistics
    const sectionStats = []
    const sectionMap = {}
    
    sections.forEach(seat => {
      if (!sectionMap[seat.section]) {
        sectionMap[seat.section] = {
          name: seat.section,
          section_type: seat.section_type,
          total: 0,
          available: 0
        }
        sectionStats.push(sectionMap[seat.section])
      }
      
      sectionMap[seat.section].total++
      
      if (seat.status === 'available') {
        sectionMap[seat.section].available++
      }
    })
    
    // If no seats exist yet, provide a sample seat for development
    if (seats.length === 0 && !section && !handicapAccess) {
      // Check if show exists
      const { data: show, error: showError } = await client
        .from('recital_shows')
        .select('id, name')
        .eq('id', showId)
        .single()
      
      if (showError) throw showError
      
      // Only provide sample data if the show exists
      if (show) {
        // Create 50 sample seats
        const sampleSeats = []
        
        // Create sample sections
        const sampleSections = [
          { name: 'Main Orchestra', type: 'center-main' },
          { name: 'Left Orchestra', type: 'left-wing' },
          { name: 'Right Orchestra', type: 'right-wing' },
          { name: 'Balcony', type: 'balcony' }
        ]
        
        // Create sample rows (A-J)
        const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
        
        // Generate seats for each section and row
        sampleSections.forEach(section => {
          rows.forEach(row => {
            // Number of seats per row
            const seatsPerRow = section.name === 'Balcony' ? 20 : 15
            
            for (let i = 1; i <= seatsPerRow; i++) {
              // Make some seats handicap accessible (just for demonstration)
              const isHandicap = (row === 'A' && i % 10 === 0) || (row === 'J' && i % 10 === 0)
              
              // Make some seats unavailable (just for demonstration)
              const isAvailable = !(row === 'C' && i > 10) && !(row === 'F' && i < 5)
              
              // Only add available seats to the response
              if (isAvailable) {
                sampleSeats.push({
                  id: `sample-${section.name}-${row}-${i}`,
                  section: section.name,
                  section_type: section.type,
                  row_name: row,
                  seat_number: i.toString(),
                  seat_type: isHandicap ? 'handicap' : 'regular',
                  handicap_access: isHandicap,
                  status: 'available',
                  price_in_cents: section.name === 'Balcony' ? 1500 : 2000
                })
              }
            }
          })
        })
        
        // Calculate section stats for sample data
        const sampleSectionStats = sampleSections.map(section => ({
          name: section.name,
          section_type: section.type,
          total: section.name === 'Balcony' ? 200 : 150,
          available: section.name === 'Balcony' ? 180 : 120
        }))
        
        // Return sample data
        return {
          available_seats: sampleSeats,
          sections: sampleSectionStats
        }
      }
    }
    
    return {
      available_seats: seats,
      sections: sectionStats
    }
  } catch (error) {
    console.error('Get available seats API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch available seats'
    })
  }
})