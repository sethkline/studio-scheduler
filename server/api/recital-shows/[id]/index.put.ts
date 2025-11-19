// server/api/recital-shows/[id]/index.put.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const rawBody = await readBody(event)
    
    // Clean the body data - convert empty strings to null
    const body = Object.entries(rawBody).reduce((acc, [key, value]) => {
      acc[key] = value === '' ? null : value;
      return acc;
    }, {});
    
    const { data, error } = await client
      .from('recital_shows')
      .update(body)
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Recital show updated successfully',
      show: data[0]
    }
  } catch (error) {
    console.error('Update recital show API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update recital show'
    })
  }
})