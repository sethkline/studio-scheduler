// server/api/classes/[id].put.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    const { data, error } = await client
      .from('class_definitions')
      .update(body)
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Class updated successfully',
      class: data[0]
    }
  } catch (error) {
    console.error('Update class API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update class'
    })
  }
})