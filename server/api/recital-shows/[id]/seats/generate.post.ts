// server/api/recital-shows/[id]/seats/generate.post.ts
import { getSupabaseClient } from '../../../../utils/supabase'
import { requireAdminOrStaff } from '../../../../utils/auth'

/**
 * POST /api/recital-shows/:id/seats/generate
 * Generate show_seats from venue template using database function
 * Requires: admin or staff role
 */
export default defineEventHandler(async (event) => {
  try {
    // Require admin or staff role
    await requireAdminOrStaff(event)

    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    // Validate show ID
    if (!id || id.trim() === '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Show ID is required'
      })
    }

    // Check if show exists and has a venue assigned
    const { data: show, error: showError } = await client
      .from('recital_shows')
      .select('id, name, venue_id')
      .eq('id', id)
      .single()

    if (showError) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Show not found'
      })
    }

    if (!show.venue_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Show does not have a venue assigned. Please assign a venue before generating seats.'
      })
    }

    // Check if seats already exist for this show
    const { count: existingSeatsCount } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', id)

    if (existingSeatsCount && existingSeatsCount > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: `Show already has ${existingSeatsCount} seats. Delete existing seats before regenerating.`
      })
    }

    // Call database function to generate seats from venue template
    const { data, error: functionError } = await client
      .rpc('generate_show_seats', { p_show_id: id })

    if (functionError) {
      console.error('Database function error:', functionError)
      throw createError({
        statusCode: 500,
        statusMessage: functionError.message || 'Failed to generate seats from venue template'
      })
    }

    const seatCount = data || 0

    if (seatCount === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No seats were generated. The venue may not have any sellable seats defined.'
      })
    }

    return {
      message: `Successfully generated ${seatCount} seats from venue template`,
      seat_count: seatCount,
      show_id: id
    }
  } catch (error) {
    console.error('Generate seats API error:', error)

    // If it's already a createError, just throw it
    if (error.statusCode) {
      throw error
    }

    // Otherwise, wrap it
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate seats: ' + (error.message || 'Unknown error')
    })
  }
})