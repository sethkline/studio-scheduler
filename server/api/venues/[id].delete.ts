// server/api/venues/[id].delete.ts
import { getSupabaseClient } from '../../utils/supabase'

/**
 * DELETE /api/venues/:id
 * Delete a venue (only if not in use)
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Venue ID is required'
      })
    }

    // Validate that venue exists
    const { data: existingVenue, error: fetchError } = await client
      .from('venues')
      .select('id, name')
      .eq('id', id)
      .single()

    if (fetchError || !existingVenue) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Venue not found'
      })
    }

    // Check for associated recital shows
    const { data: shows, error: showsError } = await client
      .from('recital_shows')
      .select('id')
      .eq('venue_id', id)
      .limit(1)

    if (showsError) {
      console.error('Error checking for associated shows:', showsError)
    }

    if (shows && shows.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cannot delete venue that has associated shows. Please remove or reassign the shows first.'
      })
    }

    // Check for associated seats
    const { data: sections } = await client
      .from('venue_sections')
      .select('id')
      .eq('venue_id', id)

    if (sections && sections.length > 0) {
      const sectionIds = sections.map((s: any) => s.id)

      const { count: seatCount } = await client
        .from('seats')
        .select('id', { count: 'exact', head: true })
        .in('venue_section_id', sectionIds)

      if (seatCount && seatCount > 0) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Cannot delete venue that has seats configured. Please remove sections and seats first.'
        })
      }
    }

    // Delete associated price zones first
    const { error: priceZoneError } = await client
      .from('price_zones')
      .delete()
      .eq('venue_id', id)

    if (priceZoneError) {
      console.error('Error deleting price zones:', priceZoneError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to delete associated price zones'
      })
    }

    // Delete associated sections
    const { error: sectionError } = await client
      .from('venue_sections')
      .delete()
      .eq('venue_id', id)

    if (sectionError) {
      console.error('Error deleting sections:', sectionError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to delete associated sections'
      })
    }

    // Delete venue
    const { error: deleteError } = await client
      .from('venues')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting venue:', deleteError)
      throw createError({
        statusCode: 400,
        statusMessage: deleteError.message
      })
    }

    return {
      success: true,
      message: 'Venue deleted successfully'
    }
  } catch (error: any) {
    console.error('DELETE /api/venues/[id] error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete venue'
    })
  }
})
