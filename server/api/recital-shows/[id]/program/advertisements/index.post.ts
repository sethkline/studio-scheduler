// server/api/recital-shows/[id]/program/advertisements/index.post.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '~/server/utils/supabase'
import { getUserSupabaseClient } from '../../../../utils/supabase'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const recitalId = getRouterParam(event, 'id')
    console.log(`Creating advertisement for recital ${recitalId}`)
    
    // Parse multipart form data
    const formData = await readMultipartFormData(event)
    console.log(formData)
    
    if (!formData || !formData.length) {
      return createError({
        statusCode: 400,
        statusMessage: 'Invalid form data'
      })
    }
    
    // Extract JSON data part
    const dataPart = formData.find(part => part.name === 'data')
    if (!dataPart || !dataPart.data) {
      return createError({
        statusCode: 400,
        statusMessage: 'Advertisement data is required'
      })
    }
    
    // Parse advertisement data
    let adData
    try {
      adData = JSON.parse(dataPart.data.toString())
    } catch (error) {
      return createError({
        statusCode: 400,
        statusMessage: 'Invalid JSON data'
      })
    }
    
    // Validate required fields
    if (!adData.title) {
      return createError({
        statusCode: 400,
        statusMessage: 'Advertisement title is required'
      })
    }
    
    // Find program for this recital
    const { data: program, error: programError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', recitalId)
      .maybeSingle()
    
    if (programError) throw programError
    
    // If program doesn't exist, create one
    let programId
    if (!program) {
      const { data: newProgram, error: createError } = await client
        .from('recital_programs')
        .insert([{ recital_id: recitalId }])
        .select('id')
      
      if (createError) throw createError
      programId = newProgram[0].id
    } else {
      programId = program.id
    }
    
    // Get highest order position for existing advertisements
    const { data: existingAds, error: adsError } = await client
      .from('recital_program_advertisements')
      .select('order_position')
      .eq('recital_program_id', programId)
      .order('order_position', { ascending: false })
      .limit(1)
    
    if (adsError) throw adsError
    
    // Determine new order position
    const newOrderPosition = existingAds && existingAds.length > 0 
      ? existingAds[0].order_position + 1 
      : 0
    
    // Check if there's an image part
    const imagePart = formData.find(part => 
      part.name !== 'data' && part.type && part.type.startsWith('image/')
    )
    
    let imageUrl = null
    let proxiedImageUrl = null
    
    if (imagePart && imagePart.data) {
      // Generate a unique file path within the recital-ads bucket
      const fileExt = imagePart.type.split('/')[1] || 'jpg'
      const filePath = `${recitalId}/${uuidv4()}.${fileExt}`
      
      // Upload to Supabase Storage using the recital-ads bucket
      const { error: uploadError } = await client.storage
        .from('recital-ads')
        .upload(filePath, imagePart.data, {
          contentType: imagePart.type,
          upsert: true
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: urlData } = client.storage
        .from('recital-ads')
        .getPublicUrl(filePath)
      
      imageUrl = urlData.publicUrl
      
      // Generate proxied URL for the image
      proxiedImageUrl = `/api/images/${filePath}`
    }
    
    // Insert the advertisement
    const { data: advertisement, error: insertError } = await client
      .from('recital_program_advertisements')
      .insert([{
        recital_program_id: programId,
        title: adData.title,
        description: adData.description || null,
        image_url: imageUrl,
        order_position: newOrderPosition
      }])
      .select()
    
    if (insertError) throw insertError
    
    // Add the proxied URL to the response
    const adWithProxiedUrl = {
      ...advertisement[0],
      proxied_image_url: proxiedImageUrl
    }
    
    return {
      message: 'Advertisement added successfully',
      advertisement: adWithProxiedUrl
    }
  } catch (error) {
    console.error('Add advertisement error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to add advertisement'
    })
  }
})