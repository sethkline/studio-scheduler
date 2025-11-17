// server/api/venues/index.get.ts

/**
 * GET /api/venues
 * List all venues with their sections and price zones
 * Public endpoint - uses RLS for access control
 */
export default defineEventHandler(async (event) => {
  try {
    // Use serverSupabaseClient which respects RLS and user auth
    const client = await serverSupabaseClient(event)

    // Fetch all venues with their related sections and price zones
    const { data, error } = await client
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching venues:', error)
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    return {
      data: data || []
    }
  } catch (error: any) {
    console.error('GET /api/venues error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch venues'
    })
  }
})
