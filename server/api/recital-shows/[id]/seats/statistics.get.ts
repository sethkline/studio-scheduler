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
      .eq('recital_show_id', id)

    if (totalError) throw totalError

    // If no seats exist, return early
    if (!totalCount) {
      return {
        stats: {
          total: 0,
          available: 0,
          sold: 0,
          reserved: 0,
          held: 0
        },
        sections: []
      }
    }

    // Count available seats
    const { count: availableCount, error: availableError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('recital_show_id', id)
      .eq('status', 'available')

    if (availableError) throw availableError

    // Count sold seats
    const { count: soldCount, error: soldError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('recital_show_id', id)
      .eq('status', 'sold')

    if (soldError) throw soldError

    // Count reserved seats
    const { count: reservedCount, error: reservedError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('recital_show_id', id)
      .eq('status', 'reserved')

    if (reservedError) throw reservedError

    // Count held seats
    const { count: heldCount, error: heldError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('recital_show_id', id)
      .eq('status', 'held')

    if (heldError) throw heldError

    // Get section statistics with seat data
    const { data: sectionData, error: sectionError } = await client
      .from('show_seats')
      .select(`
        status,
        seat:seat_id (
          section:section_id (
            id,
            name
          )
        )
      `)
      .eq('recital_show_id', id)
    
    if (sectionError) throw sectionError
    
    // Calculate section statistics
    const sections = {}

    sectionData.forEach(showSeat => {
      const sectionId = showSeat.seat?.section?.id
      const sectionName = showSeat.seat?.section?.name

      if (!sectionId || !sectionName) return

      if (!sections[sectionId]) {
        sections[sectionId] = {
          id: sectionId,
          name: sectionName,
          total: 0,
          available: 0,
          sold: 0,
          reserved: 0,
          held: 0
        }
      }

      sections[sectionId].total++

      if (showSeat.status === 'available') {
        sections[sectionId].available++
      } else if (showSeat.status === 'sold') {
        sections[sectionId].sold++
      } else if (showSeat.status === 'reserved') {
        sections[sectionId].reserved++
      } else if (showSeat.status === 'held') {
        sections[sectionId].held++
      }
    })

    return {
      stats: {
        total: totalCount || 0,
        available: availableCount || 0,
        sold: soldCount || 0,
        reserved: reservedCount || 0,
        held: heldCount || 0
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