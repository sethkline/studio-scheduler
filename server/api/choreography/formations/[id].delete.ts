// server/api/choreography/formations/[id].delete.ts
// Delete formation

import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Formation ID is required'
      })
    }

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
