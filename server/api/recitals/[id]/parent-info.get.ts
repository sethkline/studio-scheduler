// API Endpoint: Get parent information for a recital
// Story 2.1.6: Parent Information Center
// Returns all parent-facing information and resources

import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const recitalId = getRouterParam(event, 'id')

  if (!recitalId) {
    throw createError({
      statusCode: 400,
      message: 'Recital ID is required'
    })
  }

  const client = await getUserSupabaseClient(event)

  try {
    // Get recital with parent info fields
    const { data: recital, error: recitalError } = await client
      .from('recitals')
      .select(`
        *,
        recital_shows (
          id,
          show_date,
          show_time,
          venue
        )
      `)
      .eq('id', recitalId)
      .single()

    if (recitalError) throw recitalError

    // Get parent resources
    const { data: resources, error: resourcesError } = await client
      .from('recital_parent_resources')
      .select('*')
      .eq('recital_id', recitalId)
      .eq('is_public', true)
      .order('sort_order')

    return {
      recital,
      parentInfoContent: recital.parent_info_content || null,
      arrivalInstructions: recital.arrival_instructions,
      whatToBring: recital.what_to_bring,
      parkingInfo: recital.parking_info,
      photographyPolicy: recital.photography_policy,
      backstageRules: recital.backstage_rules,
      dressCode: recital.dress_code,
      weatherCancellationPolicy: recital.weather_cancellation_policy,
      accessibilityInfo: recital.accessibility_info,
      faq: recital.faq || [],
      resources: resources || []
    }
  } catch (error: any) {
    console.error('Error fetching parent info:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch parent info'
    })
  }
})
