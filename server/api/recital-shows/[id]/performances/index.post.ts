// server/api/recital-shows/[id]/performances/index.post.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase';

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event);
    const recitalId = getRouterParam(event, 'id');
    const body = await readBody(event);
    
    // Validate required fields
    if (!body.class_instance_id) {
      return createError({
        statusCode: 400,
        statusMessage: 'Class instance is required'
      });
    }
    
    if (!body.performance_order) {
      return createError({
        statusCode: 400,
        statusMessage: 'Performance order number is required'
      });
    }
    
    // Extract dancers from notes if present
    let dancerNames = [];
    let performanceNotes = body.notes || '';
    
    // Check if notes contains a dancer list
    if (performanceNotes && performanceNotes.includes('Dancers:')) {
      console.log('Found dancers section in notes field');
      
      // Extract the dancers section
      const dancerSection = performanceNotes.substring(performanceNotes.indexOf('Dancers:') + 8).trim();
      
      // Parse the dancer names
      dancerNames = dancerSection.split(',')
        .map(name => name.trim())
        .filter(name => name);
      
      console.log(`Extracted ${dancerNames.length} dancers from notes`);
      
      // Remove dancers section from notes to avoid duplication
      performanceNotes = performanceNotes.replace(/Dancers:.*$/s, '').trim();
    }
    
    // Insert the new performance
    const { data, error } = await client
      .from('recital_performances')
      .insert([
        {
          recital_id: recitalId,
          class_instance_id: body.class_instance_id,
          performance_order: body.performance_order,
          song_title: body.song_title || '',
          song_artist: body.song_artist || '',
          choreographer: body.choreographer || '',
          duration: body.duration || null,
          notes: performanceNotes // Use cleaned notes without dancers section
        }
      ])
      .select(`
        id,
        performance_order,
        song_title,
        song_artist,
        choreographer,
        duration,
        notes,
        class_instance:class_instance_id (
          id,
          name,
          class_definition:class_definition_id (
            id,
            name,
            dance_style:dance_style_id (
              id,
              name,
              color
            )
          )
        )
      `)
      .single();
    
    if (error) {
      console.error('Create performance API error:', error);
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to create performance'
      });
    }
    
    // Add dancers to performance_dancers table if we have any
    if (dancerNames.length > 0) {
      console.log(`Adding ${dancerNames.length} dancers to performance_dancers table`);
      
      for (const dancerName of dancerNames) {
        const { error: dancerError } = await client
          .from('performance_dancers')
          .insert({
            performance_id: data.id,
            dancer_name: dancerName,
            created_at: new Date().toISOString()
          });
          
        if (dancerError) {
          console.error(`Error adding dancer "${dancerName}":`, dancerError);
        } else {
          console.log(`Successfully added dancer "${dancerName}" to performance_dancers table`);
        }
      }
    }
    
    return {
      message: 'Performance created successfully',
      performance: data
    };
  } catch (error) {
    console.error('Create performance API error:', error);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to create performance'
    });
  }
});