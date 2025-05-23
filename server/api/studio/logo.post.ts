// server/api/studio/logo.post.ts
import { getSupabaseClient } from '../../utils/supabase'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    
    // Parse multipart form data
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      return createError({
        statusCode: 400,
        statusMessage: 'No file was uploaded'
      })
    }
    
    // Get the file from form data
    const file = formData.find(part => part.name === 'file')
    if (!file || !file.data) {
      return createError({
        statusCode: 400,
        statusMessage: 'No file was found in the request'
      })
    }
    
    // Check file type (allow only images)
    const fileType = file.type
    if (!fileType || !fileType.startsWith('image/')) {
      return createError({
        statusCode: 400,
        statusMessage: 'Uploaded file must be an image'
      })
    }
    
    // Get the file extension from the content type
    const fileExtension = fileType.split('/')[1]
    
    // Generate a unique filename
    const fileName = `${uuidv4()}.${fileExtension}`
    const filePath = `studio-logos/${fileName}`
    
    // Upload to Supabase Storage
    const { error: uploadError } = await client.storage
      .from('studio-assets')
      .upload(filePath, file.data, {
        contentType: fileType,
        cacheControl: '3600'
      })
    
    if (uploadError) throw uploadError
    
    // Get the public URL for the uploaded file
    const { data: urlData } = client.storage
      .from('studio-assets')
      .getPublicUrl(filePath)
    
    const logo_url = urlData.publicUrl
    // Create a proxied URL using our image proxy
    const proxied_logo_url = `/api/images/studio-logos/${fileName}`
    
    // Check if profile already exists
    const { data: existingProfile } = await client
      .from('studio_profile')
      .select('id, logo_url')
      .maybeSingle()
    
    // Delete old logo if it exists
    if (existingProfile && existingProfile.logo_url) {
      try {
        // Extract the path from the URL
        const oldPath = existingProfile.logo_url.split('/').pop()
        const oldFolder = existingProfile.logo_url.includes('studio-logos') ? 'studio-logos' : ''
        
        if (oldPath && oldFolder) {
          // Remove the old file without failing if it doesn't exist
          await client.storage
            .from('studio-assets')
            .remove([`${oldFolder}/${oldPath}`])
            .catch(() => {
              // Ignore errors from file not found
              console.log('Previous logo file not found or already removed')
            })
        }
      } catch (error) {
        console.error('Error removing old logo:', error)
        // Continue with the update process even if deletion fails
      }
    }
    
    // Update the profile with the new logo URL
    let result
    
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await client
        .from('studio_profile')
        .update({
          logo_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id)
        .select()
      
      if (error) throw error
      result = data[0]
    } else {
      // Create new profile with only the logo (should be rare)
      const { data, error } = await client
        .from('studio_profile')
        .insert([{ logo_url }])
        .select()
      
      if (error) throw error
      result = data[0]
    }
    
    // Add the proxied URL to the result
    return {
      message: 'Logo uploaded successfully',
      profile: {
        ...result,
        proxied_logo_url
      }
    }
  } catch (error) {
    console.error('Logo upload API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to upload logo'
    })
  }
})