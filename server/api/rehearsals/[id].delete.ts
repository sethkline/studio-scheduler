import { getSupabaseClient } from '../../utils/supabase'

/**
 * Delete a rehearsal and all related data
 * DELETE /api/rehearsals/[id]
 *
 * This will cascade delete:
 * - Rehearsal participants
 * - Rehearsal attendance records
 * - Rehearsal resources (files will need separate cleanup)
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const rehearsalId = getRouterParam(event, 'id')

    // First, check if rehearsal exists
    const { data: rehearsal, error: fetchError } = await client
      .from('recital_rehearsals')
      .select('id')
      .eq('id', rehearsalId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Rehearsal not found'
        })
      }
      throw fetchError
    }

    // Delete related records (if cascading is not set up in database)
    // Delete attendance records
    await client
      .from('rehearsal_attendance')
      .delete()
      .eq('rehearsal_id', rehearsalId)

    // Delete participants
    await client
      .from('rehearsal_participants')
      .delete()
      .eq('rehearsal_id', rehearsalId)

    // Delete resources
    // Note: This only deletes database records. File cleanup from storage should be handled separately
    await client
      .from('rehearsal_resources')
      .delete()
      .eq('rehearsal_id', rehearsalId)

    // Delete the rehearsal itself
    const { error: deleteError } = await client
      .from('recital_rehearsals')
      .delete()
      .eq('id', rehearsalId)

    if (deleteError) throw deleteError

    return {
      message: 'Rehearsal deleted successfully'
    }
  } catch (error: any) {
    console.error('Delete rehearsal API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete rehearsal'
    })
  }
})
