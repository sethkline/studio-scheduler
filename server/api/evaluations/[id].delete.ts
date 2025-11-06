/**
 * DELETE /api/evaluations/[id]
 *
 * Delete an evaluation (draft evaluations only for teachers).
 * Access: Teachers (own draft evaluations), Admin/Staff (all)
 */

import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Evaluation ID is required'
      })
    }

    // Get authenticated user
    const authHeader = event.node.req.headers.authorization
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await client.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Get user profile to check role
    const { data: profile } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    // Fetch existing evaluation
    const { data: existing, error: fetchError } = await client
      .from('evaluations')
      .select('teacher_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Evaluation not found'
      })
    }

    // Check permissions
    if (profile?.user_role === 'teacher') {
      // Teachers can only delete their own draft evaluations
      if (existing.teacher_id !== user.id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Permission denied'
        })
      }

      if (existing.status === 'submitted') {
        throw createError({
          statusCode: 403,
          statusMessage: 'Cannot delete submitted evaluations'
        })
      }
    } else if (!['admin', 'staff'].includes(profile?.user_role || '')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied'
      })
    }

    // Delete evaluation (CASCADE will delete evaluation_skills)
    const { error: deleteError } = await client
      .from('evaluations')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return {
      message: 'Evaluation deleted successfully'
    }
  } catch (error: any) {
    console.error('Delete evaluation API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete evaluation'
    })
  }
})
