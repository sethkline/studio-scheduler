// server/api/venues/[id]/sections/[sectionId].put.ts
import { requireAdmin } from '../../../../utils/auth'

/**
 * PUT /api/venues/[id]/sections/[sectionId]
 * Update a venue section
 * Requires: admin role
 */
export default defineEventHandler(async (event) => {
  try {
    // Require admin role
    await requireAdmin(event)

    const client = await serverSupabaseClient(event)
    const venueId = getRouterParam(event, 'id')
    const sectionId = getRouterParam(event, 'sectionId')
    const body = await readBody(event)

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

    // Prepare update data (only include provided fields)
    const updateData: any = {}

    if (body.name !== undefined && body.name.trim() !== '') {
      updateData.name = body.name.trim()
    }

    if (body.display_order !== undefined) {
      updateData.display_order = body.display_order
    }

    updateData.updated_at = new Date().toISOString()

    // Update section
    const { data, error } = await client
      .from('venue_sections')
      .update(updateData)
      .eq('id', sectionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating section:', error)
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    return {
      data,
      message: 'Section updated successfully'
    }
  } catch (error: any) {
    console.error('PUT /api/venues/[id]/sections/[sectionId] error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update section'
    })
  }
})
