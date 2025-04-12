// server/api/recital-shows/[id]/program/cover.put.ts
import { getSupabaseClient } from '../../../../../utils/supabase'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    // Handle file upload
    const formData = await readMultipartFormData(event)
    
    if (!formData || !formData.length || !formData[0].data) {
      return createError({
        statusCode: 400,
        statusMessage: 'No file provided'
      })
    }
    
    const file = formData[0]
    const fileData = file.data
    const contentType = file.type || 'application/octet-stream'
    
    // Validate file type (only image files)
    if (!contentType.startsWith('image/')) {
      return createError({
        statusCode: 400,
        statusMessage: 'Only image files are allowed'
      })
    }
    
    // Upload to Supabase Storage
    const fileName = `cover-images/${id}/${uuidv4()}.${contentType.split('/')[1]}`
    
    const { error: uploadError, data: uploadData } = await client.storage
      .from('recital-programs')
      .upload(fileName, fileData, {
        contentType,
        upsert: true
      })
    
    if (uploadError) throw uploadError
    
    // Get public URL
    const { data: urlData } = client.storage
      .from('recital-programs')
      .getPublicUrl(fileName)
    
    const coverImageUrl = urlData.publicUrl
    
    // Check if program already exists
    const { data: existingProgram, error: checkError } = await client
      .from('recital_programs')
      .select('id, cover_image_url')
      .eq('recital_id', id)
      .maybeSingle()
    
    if (checkError) throw checkError
    
    let programResult
    
    // If program exists, update the cover image
    if (existingProgram) {
      // If there's an existing cover image, delete it (optional)
      if (existingProgram.cover_image_url) {
        try {
          // Extract the path from the URL - implementation depends on your storage setup
          const urlPath = new URL(existingProgram.cover_image_url).pathname
          const filePath = urlPath.split('/').slice(-3).join('/')
          
          // Delete old file - this is optional and depends on your storage configuration
          await client.storage
            .from('recital-programs')
            .remove([filePath])
        } catch (imageError) {
          console.error('Failed to delete old image file:', imageError)
          // Continue with update even if deletion fails
        }
      }
      
      // Update program with new cover image URL
      const { data, error } = await client
        .from('recital_programs')
        .update({ cover_image_url: coverImageUrl })
        .eq('id', existingProgram.id)
        .select()
      
      if (error) throw error
      programResult = data[0]
    } 
    // Otherwise create new program with cover image
    else {
      const { data, error } = await client
        .from('recital_programs')
        .insert([{ 
          recital_id: id,
          cover_image_url: coverImageUrl
        }])
        .select()
      
      if (error) throw error
      programResult = data[0]
    }
    
    return {
      message: 'Cover image uploaded successfully',
      program: programResult
    }
  } catch (error) {
    console.error('Cover image upload error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to upload cover image'
    })
  }
})