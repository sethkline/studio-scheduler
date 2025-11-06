// server/api/choreography/index.get.ts
// Get list of choreography notes with optional filters

import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    let choreographyQuery = client
      .from('choreography_notes')
      .select(`
        *,
        class_instance:class_instances!inner (
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
          last_name
        )
      `)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    // Apply filters if provided
    if (query.class_instance_id) {
      choreographyQuery = choreographyQuery.eq('class_instance_id', query.class_instance_id)
    }

    if (query.teacher_id) {
      choreographyQuery = choreographyQuery.eq('teacher_id', query.teacher_id)
    }

    if (query.search) {
      choreographyQuery = choreographyQuery.or(
        `title.ilike.%${query.search}%,notes.ilike.%${query.search}%,music_title.ilike.%${query.search}%`
      )
    }

    const { data, error, count } = await choreographyQuery

    if (error) {
      console.error('Choreography notes query error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch choreography notes',
        data: error
      })
    }

    return {
      choreography_notes: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Choreography notes API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch choreography notes'
    })
  }
})
