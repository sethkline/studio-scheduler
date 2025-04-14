// server/api/recital-shows/[id]/seats/statistics.get.ts
import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    // Count total seats
    const { count: totalCount, error: totalError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', id)
    
    if (totalError) throw totalError
    
    // If no seats exist, return early
    if (!totalCount) {
      return {
        stats: {
          total: 0,
          available: 0,
          sold: 0,
          reserved: 0
        },
        sections: []
      }
    }
    
    // Count available seats
    const { count: availableCount, error: availableError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', id)
      .eq('status', 'available')
    
    if (availableError) throw availableError
    
    // Count sold seats
    const { count: soldCount, error: soldError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', id)
      .eq('status', 'sold')
    
    if (soldError) throw soldError
    
    // Count reserved seats
    const { count: reservedCount, error: reservedError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', id)
      .eq('status', 'reserved')
    
    if (reservedError) throw reservedError
    
    // Get section statistics
    const { data: sectionData, error: sectionError } = await client
      .from('show_seats')
      .select('section, section_type, seat_type, status')
      .eq('show_id', id)
    
    if (sectionError) throw sectionError
    
    // Calculate section statistics
    const sections = {}
    
    sectionData.forEach(seat => {
      if (!sections[seat.section]) {
        sections[seat.section] = {
          name: seat.section,
          section_type: seat.section_type,
          total: 0,
          available: 0,
          sold: 0,
          reserved: 0
        }
      }
      
      sections[seat.section].total++
      
      if (seat.status === 'available') {
        sections[seat.section].available++
      } else if (seat.status === 'sold') {
        sections[seat.section].sold++
      } else if (seat.status === 'reserved') {
        sections[seat.section].reserved++
      }
    })
    
    return {
      stats: {
        total: totalCount || 0,
        available: availableCount || 0,
        sold: soldCount || 0,
        reserved: reservedCount || 0
      },
      sections: Object.values(sections)
    }
  } catch (error) {
    console.error('Get seat statistics API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to get seat statistics'
    })
  }
})