import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)
    const limit = parseInt(query.limit as string) || 5

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Fetch upcoming shows with ticket counts
    const { data: shows, error } = await client
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
        series:series_id (id, name, theme, year)
      `)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(limit)

    if (error) throw error

    // For each show, count tickets sold
    const showsWithTickets = await Promise.all(
      (shows || []).map(async (show) => {
        const { count: ticketCount, error: countError } = await client
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('show_id', show.id)

        return {
          ...show,
          ticket_count: ticketCount || 0
        }
      })
    )

    return showsWithTickets
  } catch (error) {
    console.error('Upcoming shows API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch upcoming shows'
    })
  }
})
