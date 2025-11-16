// server/api/choreography/formations/[id].put.ts
// Update formation

import { getSupabaseClient } from '../../../utils/supabase'
import { requireRole, requireChoreographyNoteAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require authentication and role (teacher, staff, or admin)
    await requireRole(event, ['teacher', 'staff', 'admin'])
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Formation ID is required'
      })
    }

    // Fetch existing formation to get choreography note ID
    const { data: existingFormation, error: fetchError } = await client
      .from('choreography_formations')
      .select('choreography_note_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !existingFormation) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Formation not found'
      })
    }

    // Verify user has access to the choreography note
    await requireChoreographyNoteAccess(event, existingFormation.choreography_note_id)

    // Build update object with only provided fields
    const updateData: any = {}

    if (body.formation_name !== undefined) updateData.formation_name = body.formation_name
    if (body.formation_order !== undefined) updateData.formation_order = body.formation_order
    if (body.formation_data !== undefined) updateData.formation_data = body.formation_data
    if (body.stage_diagram_url !== undefined) updateData.stage_diagram_url = body.stage_diagram_url
    if (body.notes !== undefined) updateData.notes = body.notes

    const { data, error } = await client
      .from('choreography_formations')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Formation update error:', error)
      throw createError({
        statusCode: error.code === 'PGRST116' ? 404 : 500,
        statusMessage: error.code === 'PGRST116' ? 'Formation not found' : 'Failed to update formation',
        data: error
      })
    }

    return {
      formation: data,
      message: 'Formation updated successfully'
    }
  } catch (error: any) {
    console.error('Formation update API error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update formation'
    })
  }
})
