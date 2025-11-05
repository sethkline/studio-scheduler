import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    // Get all media purchases for this user
    // Note: This assumes a video_purchases table exists. Adjust based on your actual schema
    const { data: purchases, error: purchasesError } = await client
      .from('video_purchases')
      .select(`
        *,
        video:recital_videos(
          *,
          recital_show:recital_shows(
            name,
            date,
            recital_series:recital_series(name)
          )
        )
      `)
      .eq('user_id', user.id)
      .order('purchase_date', { ascending: false })

    if (purchasesError) {
      console.warn('Video purchases table may not exist:', purchasesError)
      return {
        purchases: [],
      }
    }

    return {
      purchases: purchases || [],
    }
  } catch (error: any) {
    console.error('Error fetching media purchases:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch media purchases',
    })
  }
})
