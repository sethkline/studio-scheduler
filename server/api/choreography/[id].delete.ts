// server/api/choreography/[id].delete.ts
// Delete choreography note (soft delete by setting is_active to false)

import { getSupabaseClient } from '../../utils/supabase'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require authentication and role (teacher, staff, or admin)
    const profile = await requireRole(event, ['teacher', 'staff', 'admin'])
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const query = getQuery(event)
    const hardDelete = query.hard === 'true' // Optional hard delete (admin only)

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

    // Verify user has permission to delete this choreography note
    // Teachers can only delete their own, staff/admin can delete any
    if (profile.user_role === 'teacher') {
      const { data: teacher } = await client
        .from('teachers')
        .select('id')
        .eq('user_id', profile.user_id)
        .maybeSingle()

      if (!teacher || teacher.id !== existingNote.teacher_id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden - You can only delete your own choreography notes'
        })
      }
    }

    // Only admin can perform hard delete
    if (hardDelete && profile.user_role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Only administrators can permanently delete choreography notes'
      })
    }

    if (hardDelete) {
      // Hard delete - permanently remove from database
      const { error } = await client
        .from('choreography_notes')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Choreography note hard delete error:', error)
        throw createError({
          statusCode: error.code === 'PGRST116' ? 404 : 500,
          statusMessage: error.code === 'PGRST116' ? 'Choreography note not found' : 'Failed to delete choreography note',
          data: error
        })
      }
    } else {
      // Soft delete - set is_active to false
      const { error } = await client
        .from('choreography_notes')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        console.error('Choreography note soft delete error:', error)
        throw createError({
          statusCode: error.code === 'PGRST116' ? 404 : 500,
          statusMessage: error.code === 'PGRST116' ? 'Choreography note not found' : 'Failed to delete choreography note',
          data: error
        })
      }
    }

    return {
      message: 'Choreography note deleted successfully'
    }
  } catch (error: any) {
    console.error('Choreography note delete API error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete choreography note'
    })
  }
})
