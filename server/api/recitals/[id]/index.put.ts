// server/api/recitals/[id]/index.put.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const id = getRouterParam(event, 'id')
  
  // Validate ID
  if (!id) {
    return createError({
      statusCode: 400,
      statusMessage: 'Recital ID is required'
    })
  }
  
  try {
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.name || !body.date || !body.location || !body.status) {
      return createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    // Update the recital
    const { data, error } = await client
      .from('recitals')
      .update(body)
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return createError({
        statusCode: 404,
        statusMessage: 'Recital not found'
      })
    }
    
    return {
      message: 'Recital updated successfully',
      recital: data[0]
    }
  } catch (error) {
    console.error('Update recital API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update recital'
    })
  }
})