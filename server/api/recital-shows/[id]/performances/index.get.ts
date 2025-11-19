// server/api/recital-shows/[id]/performances/index.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    
    // Get all performances for this recital
    const { data, error } = await client
      .from('recital_performances')
      .select(`
        id,
        performance_order,
        song_title,
        song_artist,
        duration,
        notes,
        choreographer,
        class_instance:class_instance_id (
          id,
          name,
          class_definition:class_definition_id (
            id,
            name,
            dance_style:dance_style_id (
              id,
              name,
              color
            )
          )
        )
      `)
      .eq('recital_id', id)
      .order('performance_order')
    
    if (error) throw error
    
    return {
      performances: data || []
    }
  } catch (error) {
    console.error('Get performances API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch performances'
    })
  }
})