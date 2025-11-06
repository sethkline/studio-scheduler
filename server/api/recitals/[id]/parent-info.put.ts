// API Endpoint: Update parent information for a recital
// Story 2.1.6: Parent Information Center
// Updates parent-facing content and settings

import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const recitalId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!recitalId) {
    throw createError({
      statusCode: 400,
      message: 'Recital ID is required'
    })
  }

  const client = getSupabaseClient()

  try {
    const updateData: any = {
      parent_info_updated_at: new Date().toISOString()
    }

    // Only update fields that are provided
    if (body.parentInfoContent !== undefined) updateData.parent_info_content = body.parentInfoContent
    if (body.arrivalInstructions !== undefined) updateData.arrival_instructions = body.arrivalInstructions
    if (body.whatToBring !== undefined) updateData.what_to_bring = body.whatToBring
    if (body.parkingInfo !== undefined) updateData.parking_info = body.parkingInfo
    if (body.photographyPolicy !== undefined) updateData.photography_policy = body.photographyPolicy
    if (body.backstageRules !== undefined) updateData.backstage_rules = body.backstageRules
    if (body.dressCode !== undefined) updateData.dress_code = body.dressCode
    if (body.weatherCancellationPolicy !== undefined) updateData.weather_cancellation_policy = body.weatherCancellationPolicy
    if (body.accessibilityInfo !== undefined) updateData.accessibility_info = body.accessibilityInfo
    if (body.faq !== undefined) updateData.faq = body.faq

    const { data: recital, error } = await client
      .from('recitals')
      .update(updateData)
      .eq('id', recitalId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      recital
    }
  } catch (error: any) {
    console.error('Error updating parent info:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to update parent info'
    })
  }
})
