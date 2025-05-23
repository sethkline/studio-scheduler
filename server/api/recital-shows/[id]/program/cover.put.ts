// server/api/recital-shows/[id]/program/cover.put.ts
import { getSupabaseClient } from '../../../../utils/supabase';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const id = getRouterParam(event, 'id');
    
    // Parse multipart form data
    const formData = await readMultipartFormData(event);
    if (!formData || formData.length === 0) {
      throw new Error('No file uploaded');
    }
    
    const file = formData[0];
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('Uploaded file is not an image');
    }
    
    // Generate a unique filename with extension
    const fileExt = file.filename?.split('.').pop() || 'jpg';
    const filePath = `${id}/${randomUUID()}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { data: fileData, error: uploadError } = await client.storage
      .from('recital-covers')
      .upload(filePath, file.data, {
        contentType: file.type,
        upsert: true,
      });
    
    if (uploadError) throw uploadError;
    
    // Get the public URL
    const { data: publicUrlData } = client.storage
      .from('recital-covers')
      .getPublicUrl(filePath);
    
    const coverImageUrl = publicUrlData.publicUrl;
    
    // Update the recital program with the new cover image URL
    const { data: programData, error: programQueryError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', id)
      .single();
    
    if (programQueryError && programQueryError.code !== 'PGRST116') {
      // PGRST116 is the "no rows returned" error, which is expected if program doesn't exist yet
      throw programQueryError;
    }
    
    let programId;
    
    if (programData?.id) {
      // Update existing program
      const { error: updateError } = await client
        .from('recital_programs')
        .update({ cover_image_url: coverImageUrl })
        .eq('id', programData.id);
      
      if (updateError) throw updateError;
      programId = programData.id;
    } else {
      // Create new program
      const { data: newProgramData, error: insertError } = await client
        .from('recital_programs')
        .insert({
          recital_id: id,
          cover_image_url: coverImageUrl
        })
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      programId = newProgramData.id;
    }
    
    // Get the updated program
    const { data: updatedProgram, error: fetchError } = await client
      .from('recital_programs')
      .select('*')
      .eq('id', programId)
      .single();
    
    if (fetchError) throw fetchError;
    
    return {
      program: updatedProgram,
      coverImageUrl
    };
  } catch (error) {
    console.error('Upload cover image API error:', error);
    return createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to upload cover image'
    });
  }
});