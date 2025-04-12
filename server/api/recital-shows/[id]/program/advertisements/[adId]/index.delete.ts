// server/api/recital-shows/[id]/program/advertisements/[adId]/index.delete.ts
import { getSupabaseClient } from '../../../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const recitalId = getRouterParam(event, 'id')
    const adId = getRouterParam(event, 'adId')
    
    // First, find the program for this recital
    const { data: program, error: programError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', recitalId)
      .single()
    
    if (programError) throw programError
    
    // Then verify advertisement exists for this program
    const { data: ad, error: adError } = await client
      .from('recital_program_advertisements')
      .select('id, image_url, order_position')
      .eq('id', adId)
      .eq('recital_program_id', program.id)
      .single()
    
    if (adError) {
      if (adError.code === 'PGRST116') {
        return createError({
          statusCode: 404,
          statusMessage: 'Advertisement not found for this program'
        })
      }
      throw adError
    }
    
    // Delete advertisement image if exists
    if (ad.image_url) {
      try {
        // Extract the path from the URL
        const urlPath = new URL(ad.image_url).pathname
        const filePath = urlPath.split('/').slice(-3).join('/')
        
        await client.storage
          .from('recital-programs')
          .remove([filePath])
      } catch (imageError) {
        console.error('Failed to delete image file:', imageError)
        // Continue with advertisement deletion even if image deletion fails
      }
    }
    
    // Delete the advertisement
    const { error: deleteError } = await client
      .from('recital_program_advertisements')
      .delete()
      .eq('id', adId)
    
    if (deleteError) throw deleteError
    
    // Update order positions of remaining advertisements
    const { data: remainingAds, error: fetchError } = await client
      .from('recital_program_advertisements')
      .select('id, order_position')
      .eq('recital_program_id', program.id)
      .order('order_position')
    
    if (fetchError) throw fetchError
    
    // Reorder remaining advertisements
    for (let i = 0; i < remainingAds.length; i++) {
      const { error: updateError } = await client
        .from('recital_program_advertisements')
        .update({ order_position: i })
        .eq('id', remainingAds[i].id)
      
      if (updateError) throw updateError
    }
    
    return {
      message: 'Advertisement deleted successfully'
    }
  } catch (error) {
    console.error('Delete advertisement error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete advertisement'
    })
  }
})