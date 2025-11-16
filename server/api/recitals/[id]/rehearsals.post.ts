import { getSupabaseClient } from '../../../utils/supabase'

/**
 * Create a new rehearsal for a recital
 * POST /api/recitals/[id]/rehearsals
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const recitalShowId = getRouterParam(event, 'id')
    const body = await readBody(event)

    // Validate required fields
    if (!body.name?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Rehearsal name is required'
      })
    }

    if (!body.type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Rehearsal type is required'
      })
    }

    if (!body.date) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Rehearsal date is required'
      })
    }

    if (!body.start_time || !body.end_time) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Start time and end time are required'
      })
    }

    // Validate end time is after start time
    if (body.start_time >= body.end_time) {
      throw createError({
        statusCode: 400,
        statusMessage: 'End time must be after start time'
      })
    }

    // Prepare rehearsal data
    const rehearsalData = {
      recital_show_id: recitalShowId,
      name: body.name,
      type: body.type,
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      location: body.location || null,
      description: body.description || null,
      call_time: body.call_time || null,
      notes: body.notes || null,
      requires_costumes: body.requires_costumes || false,
      requires_props: body.requires_props || false,
      requires_tech: body.requires_tech || false,
      parents_allowed: body.parents_allowed || false,
      status: 'scheduled'
    }

    // Insert rehearsal
    const { data: rehearsal, error: rehearsalError } = await client
      .from('recital_rehearsals')
      .insert([rehearsalData])
      .select()
      .single()

    if (rehearsalError) throw rehearsalError

    // If participants are provided, add them
    if (body.participants && Array.isArray(body.participants) && body.participants.length > 0) {
      const participantData = body.participants.map((p: any, index: number) => ({
        rehearsal_id: rehearsal.id,
        class_instance_id: p.class_instance_id || null,
        performance_id: p.performance_id || null,
        call_time: p.call_time || body.call_time || body.start_time,
        expected_duration: p.expected_duration || 15,
        performance_order: p.performance_order || index + 1,
        notes: p.notes || null
      }))

      const { error: participantError } = await client
        .from('rehearsal_participants')
        .insert(participantData)

      if (participantError) {
        console.error('Failed to add participants:', participantError)
        // Don't fail the whole operation, just log the error
      }
    }

    return {
      message: 'Rehearsal created successfully',
      rehearsal
    }
  } catch (error: any) {
    console.error('Create rehearsal API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create rehearsal'
    })
  }
})
