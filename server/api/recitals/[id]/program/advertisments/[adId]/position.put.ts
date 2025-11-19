import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '~/server/utils/supabase'
import { getUserSupabaseClient } from '../../../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const recitalId = getRouterParam(event, 'id')
    const adId = getRouterParam(event, 'adId')
    const body = await readBody(event)
    
    if (!recitalId || !adId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Recital ID and advertisement ID are required'
      })
    }
    
    if (typeof body.position !== 'number') {
      return createError({
        statusCode: 400,
        statusMessage: 'New position value is required'
      })
    }
    
    // First, get the advertisement to verify it exists
    const { data: ad, error: adFetchError } = await client
      .from('recital_program_advertisements')
      .select('order_position, recital_program_id')
      .eq('id', adId)
      .single()
    
    if (adFetchError) {
      console.error('Error fetching advertisement:', adFetchError)
      return createError({
        statusCode: 404,
        statusMessage: 'Advertisement not found'
      })
    }
    
    // Verify this ad belongs to the correct recital
    const { data: program, error: programError } = await client
      .from('recital_programs')
      .select('id')
      .eq('id', ad.recital_program_id)
      .eq('recital_id', recitalId)
      .single()
    
    if (programError) {
      console.error('Error verifying recital program:', programError)
      return createError({
        statusCode: 403,
        statusMessage: 'Advertisement does not belong to this recital'
      })
    }
    
    // Get all advertisements for this program
    const { data: ads, error: adsError } = await client
      .from('recital_program_advertisements')
      .select('id, order_position')
      .eq('recital_program_id', ad.recital_program_id)
      .order('order_position')
    
    if (adsError) throw adsError
    
    const totalAds = ads.length
    const newPosition = Math.max(0, Math.min(body.position, totalAds - 1))
    const currentPosition = ad.order_position
    
    // If position hasn't changed, return early
    if (newPosition === currentPosition) {
      return {
        message: 'Position unchanged',
        advertisement: ad
      }
    }
    
    // Begin a transaction to update all affected positions
    // This is better handled via a stored procedure, but for simplicity:
    
    // 1. Moving an ad to a later position
    if (newPosition > currentPosition) {
      for (const otherAd of ads) {
        if (otherAd.id === adId) {
          // Update the moved ad
          await client
            .from('recital_program_advertisements')
            .update({ order_position: newPosition })
            .eq('id', adId)
        } else if (otherAd.order_position > currentPosition && otherAd.order_position <= newPosition) {
          // Shift ads in between down by 1
          await client
            .from('recital_program_advertisements')
            .update({ order_position: otherAd.order_position - 1 })
            .eq('id', otherAd.id)
        }
      }
    }
    // 2. Moving an ad to an earlier position
    else {
      for (const otherAd of ads) {
        if (otherAd.id === adId) {
          // Update the moved ad
          await client
            .from('recital_program_advertisements')
            .update({ order_position: newPosition })
            .eq('id', adId)
        } else if (otherAd.order_position >= newPosition && otherAd.order_position < currentPosition) {
          // Shift ads in between up by 1
          await client
            .from('recital_program_advertisements')
            .update({ order_position: otherAd.order_position + 1 })
            .eq('id', otherAd.id)
        }
      }
    }
    
    // Get the updated advertisement
    const { data: updatedAd, error: updateError } = await client
      .from('recital_program_advertisements')
      .select('*')
      .eq('id', adId)
      .single()
    
    if (updateError) throw updateError
    
    return {
      message: 'Advertisement position updated successfully',
      advertisement: updatedAd
    }
  } catch (error) {
    console.error('Update advertisement position API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update advertisement position'
    })
  }
})