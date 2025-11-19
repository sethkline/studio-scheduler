// server/api/venues/[id]/sections/[sectionId].delete.ts
import { requireAdmin } from '~/server/utils/auth'
import { requireAdmin } from '../../../../utils/auth'

/**
 * DELETE /api/venues/[id]/sections/[sectionId]
 * Delete a venue section
 * Requires: admin role
 * Cannot delete if section has seats
 */
export default defineEventHandler(async (event) => {
  try {
    // Require admin role
    await requireAdmin(event)

    const client = await serverSupabaseClient(event)
    const venueId = getRouterParam(event, 'id')
    const sectionId = getRouterParam(event, 'sectionId')

    if (!venueId || !sectionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Venue ID and Section ID are required'
      })
    }

    // Verify section exists and belongs to this venue
    const { data: existingSection, error: sectionError } = await client
      .from('venue_sections')
      .select('id, venue_id')
      .eq('id', sectionId)
      .eq('venue_id', venueId)
      .single()

    if (sectionError || !existingSection) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Section not found'
      })
    }

    // Check if section has seats
    const { data: seats, error: seatsError } = await client
      .from('seats')
      .select('id')
      .eq('section_id', sectionId)
      .limit(1)

    if (seatsError) {
      console.error('Error checking seats:', seatsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check section dependencies'
      })
    }

    if (seats && seats.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete section with existing seats. Please delete seats first.'
      })
    }

    // Delete section
    const { error } = await client
      .from('venue_sections')
      .delete()
      .eq('id', sectionId)

    if (error) {
      console.error('Error deleting section:', error)
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    return {
      success: true,
      message: 'Section deleted successfully'
    }
  } catch (error: any) {
    console.error('DELETE /api/venues/[id]/sections/[sectionId] error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete section'
    })
  }
})
