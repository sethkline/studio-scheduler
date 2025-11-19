// server/api/studio/logo.delete.ts
import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdmin(event)

  try {
    const client = await getUserSupabaseClient(event)
    
    // Check if profile exists
    const { data: profile, error: profileError } = await client
      .from('studio_profile')
      .select('id, logo_url')
      .maybeSingle()
    
    if (profileError) throw profileError
    
    // If no profile exists or no logo to delete
    if (!profile || !profile.logo_url) {
      return {
        message: 'No logo to delete',
        profile: profile || {}
      }
    }
    
    // Extract the file path from the URL
    const logoPath = profile.logo_url.split('/').slice(-2).join('/')
    
    // Delete the file from storage
    const { error: deleteError } = await client.storage
      .from('studio-assets')
      .remove([logoPath])
    
    if (deleteError) throw deleteError
    
    // Update the profile to remove the logo URL
    const { data: updatedProfile, error: updateError } = await client
      .from('studio_profile')
      .update({
        logo_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .select()
    
    if (updateError) throw updateError
    
    return {
      message: 'Logo deleted successfully',
      profile: updatedProfile[0]
    }
  } catch (error) {
    console.error('Delete logo API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to delete logo'
    })
  }
})