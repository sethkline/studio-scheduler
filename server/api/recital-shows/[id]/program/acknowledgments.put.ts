import { getSupabaseClient } from '../../../../utils/supabase';
import { createError } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const recitalId = getRouterParam(event, 'id');
    const body = await readBody(event);

    console.log('Service updating acknowledgments', body);
    
    // Validate required fields - this is where your error is happening
    if (!body.acknowledgments) {
      return createError({
        statusCode: 400,
        statusMessage: 'Content is required'
      });
    }
    
    // First, check if a program already exists
    const { data: existingProgram, error: fetchError } = await client
      .from('recital_programs')
      .select('id')
      .eq('recital_id', recitalId)
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw fetchError;
    }
    
    if (existingProgram) {
      // Update existing program
      const { data, error } = await client
        .from('recital_programs')
        .update({
          acknowledgments: body.acknowledgments,
          updated_at: new Date().toISOString()
        })
        .eq('recital_id', recitalId)
        .select('*');
        
      if (error) throw error;
      
      return {
        message: 'Acknowledgments updated successfully',
        program: data[0]
      };
    } else {
      // Create new program record
      const { data, error } = await client
        .from('recital_programs')
        .insert([{
          recital_id: recitalId,
          acknowledgments: body.acknowledgments
        }])
        .select('*');
        
      if (error) throw error;
      
      return {
        message: 'Program created with acknowledgments',
        program: data[0]
      };
    }
  } catch (error) {
    console.error('Update acknowledgments API error:', error);
    return createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update acknowledgments'
    });
  }
});