// server/api/choreography/formations/[id].delete.ts
// Delete formation

import { getSupabaseClient } from '../../../utils/supabase'
import { requireRole, requireChoreographyNoteAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Require authentication and role (teacher, staff, or admin)
    await requireRole(event, ['teacher', 'staff', 'admin'])
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

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

    const { error } = await client
      .from('choreography_formations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Formation delete error:', error)
      throw createError({
        statusCode: error.code === 'PGRST116' ? 404 : 500,
        statusMessage: error.code === 'PGRST116' ? 'Formation not found' : 'Failed to delete formation',
        data: error
      })
    }

    return {
      message: 'Formation deleted successfully'
    }
  } catch (error: any) {
    console.error('Formation delete API error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete formation'
    })
  }
})
