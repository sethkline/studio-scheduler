// server/api/venues/index.post.ts
import { requireAdminOrStaff } from '~/server/utils/auth'
import { requireAdminOrStaff } from '../../utils/auth'

/**
 * POST /api/venues
 * Create a new venue
 * Requires: admin or staff role
 */
export default defineEventHandler(async (event) => {
  try {
    // Require admin or staff role
    await requireAdminOrStaff(event)

    const client = await serverSupabaseClient(event)
    const body = await readBody(event)

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Venue name is required'
      })
    }

    // Prepare venue data
    const venueData = {
      name: body.name.trim(),
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      zip_code: body.zip_code?.trim() || null,
      capacity: body.capacity || null,
      description: body.description?.trim() || null
    }

    // Insert venue
    const { data, error } = await client
      .from('venues')
      .insert([venueData])
      .select()
      .single()

    if (error) {
      console.error('Error creating venue:', error)
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    return {
      data,
      message: 'Venue created successfully'
    }
  } catch (error: any) {
    console.error('POST /api/venues error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create venue'
    })
  }
})
