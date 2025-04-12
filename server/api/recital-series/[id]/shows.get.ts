import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const seriesId = getRouterParam(event, 'id')
    
    // Fetch all shows for a specific recital series
    const { data, error } = await client
      .from('recital_shows')
      .select(`
        id,
        name,
        description,
        date,
        start_time,
        end_time,
        location,
        status,
        ticket_price_in_cents,
        advance_ticket_sale_start,
        ticket_sale_start,
        ticket_sale_end,
        is_pre_sale_active,
        pre_sale_start,
        pre_sale_end,
        can_sell_tickets,
        program:recital_programs(id)
      `)
      .eq('series_id', seriesId)
      .order('date')
      .order('start_time')
    
    if (error) throw error
    
    return {
      shows: data
    }
  } catch (error) {
    console.error('Recital shows API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch recital shows'
    })
  }
})