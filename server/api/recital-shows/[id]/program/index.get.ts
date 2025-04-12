// server/api/recital-shows/[id]/program/index.get.ts
import { getSupabaseClient } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    
    // First, get the show details
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
        series:series_id(name, theme)
      `)
      .eq('id', id)
      .single()
    
    if (showError) throw showError
    
    // Next, get program details if they exist
    const { data: program, error: programError } = await client
      .from('recital_programs')
      .select('*')
      .eq('recital_id', id)
      .maybeSingle()
    
    if (programError) throw programError
    
    // Get performances
    const { data: performances, error: performancesError } = await client
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
    
    if (performancesError) throw performancesError
    
    // Get advertisements if program exists
    let advertisements = []
    if (program) {
      const { data: ads, error: adsError } = await client
        .from('recital_program_advertisements')
        .select('*')
        .eq('recital_program_id', program.id)
        .order('order_position')
      
      if (adsError) throw adsError
      advertisements = ads || []
    }
    
    return {
      show,
      program: program || null,
      performances: performances || [],
      advertisements: advertisements || []
    }
  } catch (error) {
    console.error('Program API (GET) error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch program details'
    })
  }
})