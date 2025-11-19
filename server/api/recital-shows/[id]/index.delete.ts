// server/api/recital-shows/[id]/index.delete.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    
    const { error } = await client
      .from('recital_shows')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return {
      message: 'Recital show deleted successfully'
    }
  } catch (error) {
    console.error('Delete recital show API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete recital show'
    })
  }
})