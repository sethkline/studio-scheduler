// server/api/choreography/index.post.ts
// Create new choreography note

import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)

    // Validate required fields
    if (!body.class_instance_id || !body.teacher_id || !body.title) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: class_instance_id, teacher_id, title'
      })
    }

    // Get current user ID from auth
    const authHeader = getHeader(event, 'authorization')
    let userId = null
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await client.auth.getUser(token)
      userId = user?.id
    }

    const choreographyData = {
      class_instance_id: body.class_instance_id,
      teacher_id: body.teacher_id,
      title: body.title,
      description: body.description || null,
      notes: body.notes || null,
      music_title: body.music_title || null,
      music_artist: body.music_artist || null,
      music_link: body.music_link || null,
      counts_notation: body.counts_notation || null,
      created_by: userId,
      updated_by: userId
    }

    const { data, error } = await client
      .from('choreography_notes')
      .insert(choreographyData)
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
          last_name
        )
      `)
      .single()

    if (error) {
      console.error('Choreography note creation error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create choreography note',
        data: error
      })
    }

    return {
      choreography_note: data,
      message: 'Choreography note created successfully'
    }
  } catch (error: any) {
    console.error('Choreography note API error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create choreography note'
    })
  }
})
