// server/api/recital-shows/[id]/index.get.ts
import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    const { data, error } = await client
      .from('recital_shows')
      .select(`
        id,
        series_id,
        name,
        description,
        date,
        start_time,
        end_time,
        location,
        notes,
        status,
        ticket_price_in_cents,
        ticket_sale_start,
        ticket_sale_end,
        advance_ticket_sale_start,
        is_pre_sale_active,
        pre_sale_start,
        pre_sale_end,
        can_sell_tickets,
        venue_id,
        created_at,
        updated_at,
        series:series_id (id, name, theme, year, season),
        venue:venue_id (
          id,
          name,
          address,
          city,
          state,
          zip_code,
          capacity,
          description
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    return {
      show: data
    }
  } catch (error) {
    console.error('Get recital show API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch recital show'
    })
  }
})