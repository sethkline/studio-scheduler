import { getSupabaseClient } from '../../../../utils/supabase'
import { readMultipartFormData } from 'h3'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const recitalId = getRouterParam(event, 'id')
    
    if (!recitalId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Recital ID is required'
      })
    }
    
    // Parse the multipart form data
    const files = await readMultipartFormData(event)
    if (!files || files.length === 0) {
      return createError({
        statusCode: 400,
        statusMessage: 'No file uploaded'
      })
    }
    
    const file = files[0]
    
    if (!file.type || !file.type.startsWith('image/')) {
      return createError({
        statusCode: 400,
        statusMessage: 'Uploaded file is not an image'
      })
    }
    
    // First, check if the recital exists
    const { data: recital, error: recitalError } = await client
      .from('recitals')
      .select('id')
      .eq('id', recitalId)
      .single()
    
    if (recitalError) {
      console.error('Error fetching recital:', recitalError)
      return createError({
        statusCode: 404,
        statusMessage: 'Recital not found'
      })
    }
    
    // Check if a program already exists for this recital
    const { data: existingProgram, error: programError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', recitalId)
      .single()
    
    let programId
    
    if (existingProgram) {
      programId = existingProgram.id
    } else {
      // Create new program if it doesn't exist
      const { data, error } = await client
        .from('recital_programs')
        .insert([{
          recital_id: recitalId
        }])
        .select()
      
      if (error) throw error
      programId = data[0].id
    }
    
    // Upload the file to Supabase Storage
    const fileName = `${recitalId}-cover-${uuidv4()}`
    const fileExt = file.filename.split('.').pop()
    const filePath = `${fileName}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await client
      .storage
      .from('program-assets')
      .upload(filePath, file.data, {
        contentType: file.type,
        upsert: true
      })
    
    if (uploadError) throw uploadError
    
    // Get the public URL for the uploaded file
    const { data: publicUrlData } = await client
      .storage
      .from('program-assets')
      .getPublicUrl(filePath)
    
    // Update the program with the new cover image URL
    const { data, error } = await client
      .from('recital_programs')
      .update({
        cover_image_url: publicUrlData.publicUrl
      })
      .eq('id', programId)
      .select()
    
    if (error) throw error
    
    return {
      message: 'Cover image uploaded successfully',
      program: data[0]
    }
  } catch (error) {
    console.error('Upload cover image API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to upload cover image'
    })
  }
})