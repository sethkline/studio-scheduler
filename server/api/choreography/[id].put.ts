// server/api/choreography/[id].put.ts
// Update choreography note (version history is automatically created via trigger)

import { getSupabaseClient } from '../../utils/supabase'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require authentication and role (teacher, staff, or admin)
    const profile = await requireRole(event, ['teacher', 'staff', 'admin'])
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Choreography note ID is required'
      })
    }

    // Fetch existing choreography note to verify ownership
    const { data: existingNote, error: fetchError } = await client
      .from('choreography_notes')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingNote) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Choreography note not found'
      })
    }

    // Verify user has permission to update this choreography note
    // Teachers can only update their own, staff/admin can update any
    if (profile.user_role === 'teacher') {
      const { data: teacher } = await client
        .from('teachers')
        .select('id')
        .eq('user_id', profile.user_id)
        .maybeSingle()

      if (!teacher || teacher.id !== existingNote.teacher_id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden - You can only update your own choreography notes'
        })
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_by: profile.user_id
    }

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.music_title !== undefined) updateData.music_title = body.music_title
    if (body.music_artist !== undefined) updateData.music_artist = body.music_artist
    if (body.music_link !== undefined) updateData.music_link = body.music_link
    if (body.video_url !== undefined) updateData.video_url = body.video_url
    if (body.video_thumbnail_url !== undefined) updateData.video_thumbnail_url = body.video_thumbnail_url
    if (body.counts_notation !== undefined) updateData.counts_notation = body.counts_notation
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { data, error } = await client
      .from('choreography_notes')
      .update(updateData)
      .eq('id', id)
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
      console.error('Choreography note update error:', error)
      throw createError({
        statusCode: error.code === 'PGRST116' ? 404 : 500,
        statusMessage: error.code === 'PGRST116' ? 'Choreography note not found' : 'Failed to update choreography note',
        data: error
      })
    }

    return {
      choreography_note: data,
      message: 'Choreography note updated successfully'
    }
  } catch (error: any) {
    console.error('Choreography note update API error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update choreography note'
    })
  }
})
