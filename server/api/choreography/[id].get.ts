// server/api/choreography/[id].get.ts
// Get single choreography note with formations and version history

import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Choreography note ID is required'
      })
    }

    // Fetch choreography note with related data
    const { data: choreographyNote, error: noteError } = await client
      .from('choreography_notes')
      .select(`
        *,
        class_instance:class_instances (
          id,
          name,
          class_definition:class_definitions (
            id,
            name,
            dance_style:dance_styles (
              name,
              color
            )
          )
        ),
        teacher:teachers (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (noteError) {
      console.error('Choreography note fetch error:', noteError)
      throw createError({
        statusCode: noteError.code === 'PGRST116' ? 404 : 500,
        statusMessage: noteError.code === 'PGRST116' ? 'Choreography note not found' : 'Failed to fetch choreography note',
        data: noteError
      })
    }

    // Fetch formations
    const { data: formations, error: formationsError } = await client
      .from('choreography_formations')
      .select('*')
      .eq('choreography_note_id', id)
      .order('formation_order', { ascending: true })

    if (formationsError) {
      console.error('Formations fetch error:', formationsError)
    }

    // Fetch version history
    const { data: versions, error: versionsError } = await client
      .from('choreography_versions')
      .select('*')
      .eq('choreography_note_id', id)
      .order('version', { ascending: false })

    if (versionsError) {
      console.error('Versions fetch error:', versionsError)
    }

    return {
      choreography_note: choreographyNote,
      formations: formations || [],
      versions: versions || []
    }
  } catch (error: any) {
    console.error('Choreography note detail API error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch choreography note details'
    })
  }
})
