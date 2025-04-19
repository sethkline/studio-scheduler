// server/api/recital-shows/[id]/performances/bulk.post.ts
import { getSupabaseClient } from '../../../../utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const recitalId = getRouterParam(event, 'id');
    const body = await readBody(event);
    
    // Validate request
    if (!Array.isArray(body.performances)) {
      return createError({
        statusCode: 400,
        statusMessage: 'Invalid request format. Expected an array of performances.'
      });
    }
    
    // Validate recital exists
    const { data: recital, error: recitalError } = await client
      .from('recital_shows')
      .select('id')
      .eq('id', recitalId)
      .single();
    
    if (recitalError) {
      return createError({
        statusCode: 404,
        statusMessage: 'Recital show not found'
      });
    }
    
    // Get existing performance orders for this recital to avoid conflicts
    const { data: existingPerformances, error: existingError } = await client
      .from('recital_performances')
      .select('performance_order')
      .eq('recital_id', recitalId);
    
    if (existingError) {
      console.error('Error fetching existing performances:', existingError);
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to check existing performances'
      });
    }
    
    // Create a set of existing performance orders
    const existingOrders = new Set(existingPerformances.map(p => p.performance_order));
    
    // Store conflicted performances for later reporting
    const skippedPerformances = [];
    const successfulPerformances = [];
    
    // Process each performance
    for (const performance of body.performances) {
      console.log(`Processing performance: ${performance.song_title || 'Untitled'}`);
      
      // Extract dancers - now this comes directly from the field
      let dancerNames = [];
      
      if (performance.dancers) {
        // Split the dancers string by commas
        dancerNames = performance.dancers.split(',').map(name => name.trim()).filter(name => name);
        console.log(`Found ${dancerNames.length} dancers in the dancers field: ${performance.dancers}`);
      } else if (performance.notes && performance.notes.toLowerCase().startsWith('dancers:')) {
        // Fallback for backward compatibility - extract from notes if needed
        const dancerText = performance.notes.substring(8).trim();
        dancerNames = dancerText.split(',').map(name => name.trim()).filter(name => name);
        console.log(`Found ${dancerNames.length} dancers in the notes field: ${dancerText}`);
        
        // Clear out the dancers part from notes
        performance.notes = '';
      } else {
        console.log('No dancers specified for this performance');
      }
      
      // Prepare the performance data
      const performanceData = {
        recital_id: recitalId,
        class_instance_id: performance.class_instance_id,
        performance_order: performance.performance_order || null,
        song_title: performance.song_title || '',
        song_artist: performance.song_artist || '',
        choreographer: performance.choreographer || '',
        duration: performance.duration || null,
        notes: performance.notes || ''
      };
      
      console.log(`Performance data: ${JSON.stringify(performanceData)}`);
      
      // Check if this order already exists
      if (performanceData.performance_order !== null && 
          existingOrders.has(performanceData.performance_order)) {
        console.log(`Performance order ${performanceData.performance_order} already exists, finding next available order`);
        // If there's a conflict, find the next available order number
        let nextOrder = Math.max(...Array.from(existingOrders), 0) + 1;
        performanceData.performance_order = nextOrder;
        console.log(`Assigned new performance order: ${nextOrder}`);
      }
      
      try {
        // Insert the performance
        const { data, error } = await client
          .from('recital_performances')
          .insert([performanceData])
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
          `);
        
        if (error) {
          console.error('Error inserting performance:', error);
          skippedPerformances.push({
            performance: performance,
            error: error.message
          });
          continue;
        } 
        
        if (data && data.length > 0) {
          const insertedPerformance = data[0];
          console.log(`Successfully inserted performance with ID: ${insertedPerformance.id}`);
          
          // Process dancers if we have any
          if (dancerNames.length > 0) {
            console.log(`Adding ${dancerNames.length} dancers to performance ${insertedPerformance.id}`);
            
            // Add all dancers in batch
            const dancerInserts = dancerNames.map(dancerName => ({
              performance_id: insertedPerformance.id,
              dancer_name: dancerName,
              student_id: null, // Explicitly set to null
              created_at: new Date().toISOString()
            }));
            
            // Insert the dancers
            const { error: dancersError } = await client
              .from('performance_dancers')
              .insert(dancerInserts);
            
            if (dancersError) {
              console.error('Error inserting dancers:', dancersError);
            } else {
              console.log(`Successfully added ${dancerNames.length} dancers to performance ${insertedPerformance.id}`);
              
              // Track dancer results with the performance
              insertedPerformance.dancerCount = dancerNames.length;
            }
          }
          
          successfulPerformances.push(insertedPerformance);
          // Add this order to our set so we don't reuse it
          existingOrders.add(insertedPerformance.performance_order);
        }
      } catch (insertError) {
        console.error('Exception inserting performance:', insertError);
        skippedPerformances.push({
          performance: performance,
          error: insertError.message
        });
      }
    }
    
    // Summarize overall processing results
    console.log('Bulk performance processing summary:');
    console.log(`- Total performances processed: ${body.performances.length}`);
    console.log(`- Successfully created: ${successfulPerformances.length}`);
    console.log(`- Skipped/failed: ${skippedPerformances.length}`);
    
    // Count total dancers
    const totalDancers = successfulPerformances.reduce((sum, perf) => sum + (perf.dancerCount || 0), 0);
    if (totalDancers > 0) {
      console.log(`- Total dancers: ${totalDancers}`);
    }
    
    // Clean up temporary properties before returning
    successfulPerformances.forEach(perf => {
      delete perf.dancerCount;
    });
    
    return {
      message: 'Performances processed',
      performances: successfulPerformances,
      skipped: skippedPerformances,
      created: successfulPerformances.length,
      total: body.performances.length,
      dancerCount: totalDancers
    };
  } catch (error) {
    console.error('Bulk performances API error:', error);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to process performances: ' + (error.message || 'Unknown error')
    });
  }
});