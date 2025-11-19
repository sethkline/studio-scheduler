// server/api/recital-shows/[id]/program/index.get.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    
    // Fetch recital show data
    const { data: show, error: showError } = await client
      .from('recital_shows')
      .select(`
        id,
        name,
        description,
        date,
        start_time,
        location,
        series_id,
        series:series_id (
          name,
          theme
        )
      `)
      .eq('id', id)
      .single()
    
    if (showError) throw showError
    
    // Fetch program data if it exists
    const { data: program, error: programError } = await client
      .from('recital_programs')
      .select(`
        id,
        recital_id,
        cover_image_url,
        artistic_director_note,
        acknowledgments
      `)
      .eq('recital_id', id)
      .maybeSingle()
    
    if (programError) throw programError
    
    // Transform the cover image URL if it exists
    if (program?.cover_image_url) {
      try {
        const url = new URL(program.cover_image_url);
        const pathSegments = url.pathname.split('/');
        const bucketIndex = pathSegments.findIndex(segment => segment === 'recital-covers');
        
        if (bucketIndex >= 0 && bucketIndex < pathSegments.length - 1) {
          const relativePath = pathSegments.slice(bucketIndex + 1).join('/');
          program.proxied_cover_image_url = `/api/images/${relativePath}`;
          console.log('Transformed cover image URL:', program.cover_image_url, 'to', program.proxied_cover_image_url);
        }
      } catch (error) {
        console.warn('Error transforming cover image URL:', error);
      }
    }
    
    // Fetch advertisements if program exists
    let advertisements = []
    if (program) {
      const { data: ads, error: adsError } = await client
        .from('recital_program_advertisements')
        .select('*')
        .eq('recital_program_id', program.id)
        .order('order_position')
      
      if (adsError) throw adsError
      advertisements = ads || []
      
      // Transform ad image URLs if they exist
      advertisements.forEach(ad => {
        if (ad.image_url) {
          try {
            const url = new URL(ad.image_url);
            const pathSegments = url.pathname.split('/');
            const bucketIndex = pathSegments.findIndex(segment => segment === 'recital-ads');
            
            if (bucketIndex >= 0 && bucketIndex < pathSegments.length - 1) {
              const relativePath = pathSegments.slice(bucketIndex + 1).join('/');
              ad.proxied_image_url = `/api/images/${relativePath}`;
            }
          } catch (error) {
            console.warn('Error transforming advertisement image URL:', error);
          }
        }
      });
    }
    
    // Fetch performances
    const { data: performances, error: perfError } = await client
      .from('recital_performances')
      .select(`
        id,
        performance_order,
        song_title,
        song_artist,
        duration,
        notes,
        choreographer,
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
      .eq('recital_id', id)
      .order('performance_order')
    
    if (perfError) throw perfError
    
    return {
      show,
      program,
      advertisements,
      performances: performances || []
    }
  } catch (error) {
    console.error('Fetch recital program API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch recital program'
    })
  }
})