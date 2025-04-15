// server/api/public/recital-shows/[id]/seats/suggested.ts
import { getSupabaseClient } from '../../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const query = getQuery(event)
    
    // Parse query parameters
    const count = parseInt(query.count as string) || 2
    const preferCenter = query.prefer_center !== 'false'
    const handicapAccess = query.handicap_access === 'true'
    
    // Call the seat suggestion function
    const { data, error } = await client.rpc('find_best_available_seats', {
      p_recital_show_id: id,
      p_seat_count: count,
      p_prefer_center: preferCenter,
      p_handicap_access: handicapAccess
    })
    
    if (error) throw error
    
    if (!data.success) {
      return {
        success: false,
        message: data.error,
        available_count: data.available_count || 0
      }
    }
    
    return {
      success: true,
      seats: data.seats
    }
  } catch (error) {
    console.error('Get suggested seats API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to find suggested seats'
    })
  }
})