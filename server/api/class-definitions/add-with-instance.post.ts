// server/api/class-definitions/add-with-instance.post.ts
import { getSupabaseClient } from '../../utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const body = await readBody(event);
    
    // Validate required fields
    if (!body.name || !body.dance_style_id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Name and dance style are required'
      });
    }
    
    // First create a class definition
    const { data: classDefData, error: classDefError } = await client
      .from('class_definitions')
      .insert([{
        name: body.name,
        dance_style_id: body.dance_style_id,
        class_level_id: body.class_level_id || null,
        description: body.description || null,
        duration: body.duration || 60 // Default duration in minutes
      }])
      .select()
      .single();
    
    if (classDefError) {
      console.error('Class definition creation error:', classDefError);
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to create class definition'
      });
    }
    
    // Create a class instance
    const { data: classInstanceData, error: classInstanceError } = await client
      .from('class_instances')
      .insert([{
        class_definition_id: classDefData.id,
        name: body.name,
        status: 'active'
      }])
      .select(`
        id,
        name,
        class_definition:class_definition_id (
          id,
          name,
          dance_style:dance_style_id (
            id,
            name,
            color
          ),
          class_level:class_level_id (
            id,
            name
          )
        )
      `)
      .single();
    
    if (classInstanceError) {
      console.error('Class instance creation error:', classInstanceError);
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to create class instance'
      });
    }
    
    return {
      message: 'Class created successfully',
      classInstance: classInstanceData,
      classDefinition: classDefData
    };
  } catch (error) {
    console.error('Create class API error:', error);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create class'
    });
  }
});