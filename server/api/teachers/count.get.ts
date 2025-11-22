import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()

    const { count, error } = await client
      .from('teachers')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return {
      count: count || 0
    }
  } catch (error) {
    console.error('Teachers count API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to count teachers'
    })
  }
})
