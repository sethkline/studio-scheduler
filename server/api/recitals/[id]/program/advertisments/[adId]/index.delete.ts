import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '~/server/utils/supabase'
import { getUserSupabaseClient } from '../../../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const recitalId = getRouterParam(event, 'id')
    const adId = getRouterParam(event, 'adId')
    
    if (!recitalId || !adId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Recital ID and advertisement ID are required'
      })
    }
    
    // First, get the advertisement to retrieve the image URL
    const { data: ad, error: adFetchError } = await client
      .from('recital_program_advertisements')
      .select('image_url, recital_program_id')
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
    
    // Delete the image from storage if it exists
    if (ad.image_url) {
      // Extract the file path from the URL
      const urlParts = ad.image_url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      // Only attempt deletion if we can parse the filename
      if (fileName) {
        const { error: deleteFileError } = await client
          .storage
          .from('program-assets')
          .remove([fileName])
        
        if (deleteFileError) {
          // Log but don't fail if we can't delete the file
          console.error('Error deleting advertisement image:', deleteFileError)
        }
      }
    }
    
    // Delete the advertisement
    const { error } = await client
      .from('recital_program_advertisements')
      .delete()
      .eq('id', adId)
    
    if (error) throw error
    
    // Re-order remaining advertisements to close gaps
    const { data: remainingAds, error: remainingError } = await client
      .from('recital_program_advertisements')
      .select('id, order_position')
      .eq('recital_program_id', ad.recital_program_id)
      .order('order_position')
    
    if (!remainingError && remainingAds) {
      // Update positions for remaining ads to ensure sequential ordering
      for (let i = 0; i < remainingAds.length; i++) {
        if (remainingAds[i].order_position !== i) {
          await client
            .from('recital_program_advertisements')
            .update({ order_position: i })
            .eq('id', remainingAds[i].id)
        }
      }
    }
    
    return {
      message: 'Advertisement deleted successfully'
    }
  } catch (error) {
    console.error('Delete advertisement API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete advertisement'
    })
  }
})