// server/api/venues/[id]/sections/index.post.ts
import { requireAdmin } from '~/server/utils/auth'
import { requireAdmin } from '../../../../utils/auth'

/**
 * POST /api/venues/[id]/sections
 * Create a new section for a venue
 * Requires: admin role
 */
export default defineEventHandler(async (event) => {
  try {
    // Require admin role
    await requireAdmin(event)

    const client = await serverSupabaseClient(event)
    const venueId = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!venueId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Venue ID is required'
      })
    }

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Section name is required'
      })
    }

    // Verify venue exists
    const { data: venue, error: venueError } = await client
      .from('venues')
      .select('id')
      .eq('id', venueId)
      .single()

    if (venueError || !venue) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Venue not found'
      })
    }

    // Get current max display order
    const { data: sections } = await client
      .from('venue_sections')
      .select('display_order')
      .eq('venue_id', venueId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextDisplayOrder = sections && sections.length > 0
      ? sections[0].display_order + 1
      : 1

    // Prepare section data
    const sectionData = {
      venue_id: venueId,
      name: body.name.trim(),
      display_order: body.display_order ?? nextDisplayOrder
    }

    // Insert section
    const { data, error } = await client
      .from('venue_sections')
      .insert([sectionData])
      .select()
      .single()

    if (error) {
      console.error('Error creating section:', error)
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    return {
      data,
      message: 'Section created successfully'
    }
  } catch (error: any) {
    console.error('POST /api/venues/[id]/sections error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create section'
    })
  }
})
