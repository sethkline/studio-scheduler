import { getSupabaseClient } from '../../../../../utils/supabase'
import { readMultipartFormData } from 'h3'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const recitalId = getRouterParam(event, 'id')
    
    // Parse form data which may include both file and JSON data
    const formData = await readMultipartFormData(event)
    
    // Find JSON data part and image file part
    let adData = {}
    let imageFile = null
    
    for (const part of formData || []) {
      if (part.name === 'data' && part.type === 'application/json') {
        adData = JSON.parse(new TextDecoder().decode(part.data))
      } else if (part.type && part.type.startsWith('image/')) {
        imageFile = part
      }
    }
    
    // Validate required data
    if (!recitalId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Recital ID is required'
      })
    }
    
    if (!adData.title) {
      return createError({
        statusCode: 400,
        statusMessage: 'Advertisement title is required'
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
    
    // Get the highest current order_position to place new ad at the end
    const { data: lastAd, error: lastAdError } = await client
      .from('recital_program_advertisements')
      .select('order_position')
      .eq('recital_program_id', programId)
      .order('order_position', { ascending: false })
      .limit(1)
    
    const newOrderPosition = lastAd && lastAd.length > 0 ? lastAd[0].order_position + 1 : 0
    
    // If an image was uploaded, handle it
    let imageUrl = null
    
    if (imageFile) {
      const fileName = `${programId}-ad-${uuidv4()}`
      const fileExt = imageFile.filename ? imageFile.filename.split('.').pop() : 'jpg'
      const filePath = `${fileName}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await client
        .storage
        .from('program-assets')
        .upload(filePath, imageFile.data, {
          contentType: imageFile.type,
          upsert: true
        })
      
      if (uploadError) throw uploadError
      
      // Get the public URL for the uploaded file
      const { data: publicUrlData } = await client
        .storage
        .from('program-assets')
        .getPublicUrl(filePath)
      
      imageUrl = publicUrlData.publicUrl
    }
    
    // Insert the advertisement
    const { data, error } = await client
      .from('recital_program_advertisements')
      .insert([{
        recital_program_id: programId,
        title: adData.title,
        description: adData.description || null,
        image_url: imageUrl,
        order_position: newOrderPosition
      }])
      .select()
    
    if (error) throw error
    
    return {
      message: 'Advertisement added successfully',
      advertisement: data[0]
    }
  } catch (error) {
    console.error('Add advertisement API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to add advertisement'
    })
  }
})