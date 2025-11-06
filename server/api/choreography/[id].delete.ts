// server/api/choreography/[id].delete.ts
// Delete choreography note (soft delete by setting is_active to false)

import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const query = getQuery(event)
    const hardDelete = query.hard === 'true' // Optional hard delete

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Choreography note ID is required'
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
