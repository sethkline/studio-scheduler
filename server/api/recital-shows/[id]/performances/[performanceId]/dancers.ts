// server/api/recital-shows/[id]/performances/[performanceId]/dancers.ts
import { getSupabaseClient } from '../../../../../utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient();
    const recitalId = getRouterParam(event, 'id');
    const performanceId = getRouterParam(event, 'performanceId');
    
    // Validate the performance exists and belongs to this recital
    const { data: performance, error: performanceError } = await client
      .from('recital_performances')
      .select('id, song_title, notes')
      .eq('id', performanceId)
      .eq('recital_id', recitalId)
      .single();
    
    if (performanceError) {
      console.error('Performance validation error:', performanceError);
      return createError({
        statusCode: 404,
        statusMessage: 'Performance not found for this recital'
      });
    }
    
    // Get dancers from performance_dancers table
    const { data: dancers, error: dancersError } = await client
      .from('performance_dancers')
      .select('id, dancer_name')
      .eq('performance_id', performanceId);
    
    if (dancersError) {
      console.error('Error fetching dancers:', dancersError);
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch dancers'
      });
    }
    
    // If no dancers found in performance_dancers table, try to extract from notes as fallback
    if (dancers.length === 0 && performance.notes && performance.notes.includes('Dancers:')) {
      console.log('No dancers in table, extracting from notes as fallback');
      
      const dancerSection = performance.notes.substring(performance.notes.indexOf('Dancers:') + 8).trim();
      const extractedDancers = dancerSection.split(',')
        .map(name => name.trim())
        .filter(name => name)
        .map(name => ({ dancer_name: name }));
      
      return {
        performance: {
          id: performance.id,
          song_title: performance.song_title
        },
        dancers: extractedDancers,
        source: 'notes',
        count: extractedDancers.length
      };
    }
    
    // Format and return dancers
    return {
      performance: {
        id: performance.id,
        song_title: performance.song_title
      },
      dancers: dancers,
      source: 'database',
      count: dancers.length
    };
  } catch (error) {
    console.error('Get performance dancers API error:', error);
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch performance dancers'
    });
  }
});