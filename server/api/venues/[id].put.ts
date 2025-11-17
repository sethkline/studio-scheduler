// server/api/venues/[id].put.ts

/**
 * PUT /api/venues/:id
 * Update an existing venue
 * Requires: admin or staff role
 */
export default defineEventHandler(async (event) => {
  try {
    // Require admin or staff role
    await requireAdminOrStaff(event)

    const client = await serverSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Venue ID is required'
      })
    }

    // Validate that venue exists
    const { data: existingVenue, error: fetchError } = await client
      .from('venues')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existingVenue) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Venue not found'
      })
    }

    // Validate name if provided
    if (body.name !== undefined && body.name.trim() === '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Venue name cannot be empty'
      })
    }

    // Prepare update data (only include fields that are present in the request)
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.address !== undefined) updateData.address = body.address?.trim() || null
    if (body.city !== undefined) updateData.city = body.city?.trim() || null
    if (body.state !== undefined) updateData.state = body.state?.trim() || null
    if (body.zip_code !== undefined) updateData.zip_code = body.zip_code?.trim() || null
    if (body.capacity !== undefined) updateData.capacity = body.capacity || null
    if (body.description !== undefined) updateData.description = body.description?.trim() || null

    // Update venue
    const { data, error } = await client
      .from('venues')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating venue:', error)
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    return {
      data,
      message: 'Venue updated successfully'
    }
  } catch (error: any) {
    console.error('PUT /api/venues/[id] error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update venue'
    })
  }
})
