// server/api/choreography/index.post.ts
// Create new choreography note

import { getSupabaseClient } from '../../utils/supabase'
import { requireRole, requireTeacherAccess, verifyClassInstance } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require authentication and role (teacher, staff, or admin)
    const profile = await requireRole(event, ['teacher', 'staff', 'admin'])
    const client = getSupabaseClient()
    const body = await readBody(event)

    // Validate required fields
    if (!body.class_instance_id || !body.teacher_id || !body.title) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: class_instance_id, teacher_id, title'
      })
    }

    // Verify class instance exists
    await verifyClassInstance(body.class_instance_id)

    // Verify user has permission to create choreography for this teacher
    // Teachers can only create for themselves, staff/admin can create for anyone
    await requireTeacherAccess(event, body.teacher_id)

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
      created_by: profile.user_id,
      updated_by: profile.user_id
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
