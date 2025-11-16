import { getSupabaseClient } from '../../utils/supabase'

/**
 * Update a rehearsal
 * PUT /api/rehearsals/[id]
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const rehearsalId = getRouterParam(event, 'id')
    const body = await readBody(event)

    // Validate if times are provided
    if (body.start_time && body.end_time && body.start_time >= body.end_time) {
      throw createError({
        statusCode: 400,
        statusMessage: 'End time must be after start time'
      })
    }

    // Prepare update data (only include fields that are provided)
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.date !== undefined) updateData.date = body.date
    if (body.start_time !== undefined) updateData.start_time = body.start_time
    if (body.end_time !== undefined) updateData.end_time = body.end_time
    if (body.location !== undefined) updateData.location = body.location
    if (body.description !== undefined) updateData.description = body.description
    if (body.call_time !== undefined) updateData.call_time = body.call_time
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.requires_costumes !== undefined) updateData.requires_costumes = body.requires_costumes
    if (body.requires_props !== undefined) updateData.requires_props = body.requires_props
    if (body.requires_tech !== undefined) updateData.requires_tech = body.requires_tech
    if (body.parents_allowed !== undefined) updateData.parents_allowed = body.parents_allowed
    if (body.status !== undefined) updateData.status = body.status

    // Update rehearsal
    const { data: rehearsal, error } = await client
      .from('recital_rehearsals')
      .update(updateData)
      .eq('id', rehearsalId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Rehearsal not found'
        })
      }
      throw error
    }

    return {
      message: 'Rehearsal updated successfully',
      rehearsal
    }
  } catch (error: any) {
    console.error('Update rehearsal API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update rehearsal'
    })
  }
})
