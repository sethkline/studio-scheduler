// server/api/choreography/formations/index.post.ts
// Create new formation for a choreography note

import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)

    // Validate required fields
    if (!body.choreography_note_id || !body.formation_name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: choreography_note_id, formation_name'
      })
    }

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
