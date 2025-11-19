// server/api/venues/[id].get.ts

/**
 * GET /api/venues/:id
 * Fetch a single venue with sections, price zones, and seat counts
 * Public endpoint - uses RLS for access control
 */
export default defineEventHandler(async (event) => {
  try {
    // Use serverSupabaseClient which respects RLS and user auth
    const client = await serverSupabaseClient(event)
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Venue ID is required'
      })
    }

    // Fetch venue with related data
    const { data: venue, error } = await client
      .from('venues')
      .select(`
        *,
        venue_sections (
          id,
          venue_id,
          name,
          display_order,
          created_at,
          updated_at
        ),
        price_zones (
          id,
          venue_id,
          name,
          price_in_cents,
          color,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching venue:', error)
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Venue not found'
        })
      }
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    // Get seat count for this venue (using venue_id directly)
    const { count: seatCount } = await client
      .from('seats')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', id)

    return {
      data: {
        ...venue,
        seat_count: seatCount || 0
      }
    }
  } catch (error: any) {
    console.error('GET /api/venues/[id] error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch venue'
    })
  }
})
