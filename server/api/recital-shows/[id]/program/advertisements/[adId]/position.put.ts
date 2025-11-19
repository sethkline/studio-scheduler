// server/api/recital-shows/[id]/program/advertisements/[adId]/position.put.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '~/server/utils/supabase'
import { getUserSupabaseClient } from '../../../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const recitalId = getRouterParam(event, 'id')
    const adId = getRouterParam(event, 'adId')
    const body = await readBody(event)
    
    // Validate request
    if (body.position === undefined || typeof body.position !== 'number') {
      return createError({
        statusCode: 400,
        statusMessage: 'Position is required and must be a number'
      })
    }
    
    // Find the program for this recital
    const { data: program, error: programError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', recitalId)
      .single()
    
    if (programError) throw programError
    
    // Get all advertisements for this program
    const { data: ads, error: adsError } = await client
      .from('recital_program_advertisements')
      .select('id, order_position')
      .eq('recital_program_id', program.id)
      .order('order_position')
    
    if (adsError) throw adsError
    
    // Find current advertisement and its position
    const currentAdIndex = ads.findIndex(ad => ad.id === adId)
    if (currentAdIndex === -1) {
      return createError({
        statusCode: 404,
        statusMessage: 'Advertisement not found for this program'
      })
    }
    
    // Validate and adjust target position if needed
    let targetPosition = body.position
    if (targetPosition < 0) targetPosition = 0
    if (targetPosition >= ads.length) targetPosition = ads.length - 1
    
    // Skip if position is not changing
    if (targetPosition === currentAdIndex) {
      // Get advertisement details for response
      const { data: adDetails, error: detailsError } = await client
        .from('recital_program_advertisements')
        .select('*')
        .eq('id', adId)
        .single()
      
      if (detailsError) throw detailsError
      
      return {
        message: 'Advertisement position unchanged',
        advertisement: adDetails
      }
    }
    
    // Remove ad from current position
    const updatedAds = [...ads]
    const [movedAd] = updatedAds.splice(currentAdIndex, 1)
    
    // Insert at new position
    updatedAds.splice(targetPosition, 0, movedAd)
    
    // Update all positions
    for (let i = 0; i < updatedAds.length; i++) {
      const { error: updateError } = await client
        .from('recital_program_advertisements')
        .update({ order_position: i })
        .eq('id', updatedAds[i].id)
      
      if (updateError) throw updateError
    }
    
    // Get updated advertisement details
    const { data: updatedAd, error: getError } = await client
      .from('recital_program_advertisements')
      .select('*')
      .eq('id', adId)
      .single()
    
    if (getError) throw getError
    
    return {
      message: 'Advertisement position updated successfully',
      advertisement: updatedAd
    }
  } catch (error) {
    console.error('Update advertisement position error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update advertisement position'
    })
  }
})