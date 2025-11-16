// server/api/choreography/formations/index.post.ts
// Create new formation for a choreography note

import { getSupabaseClient } from '../../../utils/supabase'
import { requireRole, requireChoreographyNoteAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require authentication and role (teacher, staff, or admin)
    await requireRole(event, ['teacher', 'staff', 'admin'])
    const client = getSupabaseClient()
    const body = await readBody(event)

    // Validate required fields
    if (!body.choreography_note_id || !body.formation_name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: choreography_note_id, formation_name'
      })
    }

    // Verify user has access to the choreography note
    await requireChoreographyNoteAccess(event, body.choreography_note_id)

    const formationData = {
      choreography_note_id: body.choreography_note_id,
      formation_name: body.formation_name,
      formation_order: body.formation_order || 0,
      formation_data: body.formation_data || null,
      stage_diagram_url: body.stage_diagram_url || null,
      notes: body.notes || null
    }

    const { data, error } = await client
      .from('choreography_formations')
      .insert(formationData)
      .select('*')
      .single()

    if (error) {
      console.error('Formation creation error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create formation',
        data: error
      })
    }

    return {
      formation: data,
      message: 'Formation created successfully'
    }
  } catch (error: any) {
    console.error('Formation API error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create formation'
    })
  }
})
