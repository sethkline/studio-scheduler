// server/api/recital-shows/[id]/seats/generate.post.ts

import { requireAdminOrStaff } from '../../../../utils/auth'

/**
 * POST /api/recital-shows/[id]/seats/generate
 * Generates show_seats for a recital show based on its venue's seat map
 * Uses the database function generate_show_seats() to properly link seats
 * Requires: admin or staff role
 */
export default defineEventHandler(async (event) => {
  // Require authentication - CRITICAL for security
  await requireAdminOrStaff(event)

  const client = await serverSupabaseClient(event)
  const showId = getRouterParam(event, 'id')

  if (!showId) {
    throw createError({
      statusCode: 400,
      message: 'Show ID is required'
    })
  }

  try {
    // Verify show exists and has a venue assigned
    const { data: show, error: showError } = await client
      .from('recital_shows')
      .select('id, venue_id, recital_series:recital_series_id(name)')
      .eq('id', showId)
      .single()

    if (showError || !show) {
      throw createError({
        statusCode: 404,
        message: 'Show not found'
      })
    }

    if (!show.venue_id) {
      throw createError({
        statusCode: 400,
        message: 'Show does not have a venue assigned. Please assign a venue before generating seats.'
      })
    }

    // Call the database function to generate show_seats
    // This function:
    // 1. Gets all sellable seats from the venue's seat map
    // 2. Creates show_seats records with proper seat_id references
    // 3. Sets prices from the seats' price_zones
    // 4. Handles duplicates gracefully with ON CONFLICT DO NOTHING
    const { data, error } = await client.rpc('generate_show_seats', {
      p_show_id: showId
    })

    if (error) {
      throw createError({
        statusCode: 400,
        message: `Failed to generate seats: ${error.message}`
      })
    }

    const seatCount = data || 0

    return {
      success: true,
      message: `Successfully generated ${seatCount} seats for the show`,
      seat_count: seatCount,
      show_id: showId
    }
  } catch (error: any) {
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }

    // Otherwise wrap it
    console.error('Generate seats API error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to generate seats: ${error.message || 'Unknown error'}`
    })
  }
})
