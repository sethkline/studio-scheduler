import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const recitalId = getRouterParam(event, 'id')
    
    if (!recitalId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Recital ID is required'
      })
    }
    
    // First, get the recital to verify it exists
    const { data: recital, error: recitalError } = await client
      .from('recitals')
      .select('id, name, description, date, location, theme, program_notes')
      .eq('id', recitalId)
      .single()
    
    if (recitalError) {
      console.error('Error fetching recital:', recitalError)
      return createError({
        statusCode: 404,
        statusMessage: 'Recital not found'
      })
    }
    
    // Get the recital program
    const { data: program, error: programError } = await client
      .from('recital_programs')
      .select('id, cover_image_url, artistic_director_note, acknowledgments')
      .eq('recital_id', recitalId)
      .single()
    
    // Note: Program might not exist yet, which is not an error
    
    // Get the advertisements
    const { data: advertisements, error: adsError } = await client
      .from('recital_program_advertisements')
      .select('id, title, description, image_url, order_position')
      .eq('recital_program_id', program?.id || '')
      .order('order_position')
    
    // Get the performances
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
            dance_style:dance_style_id (id, name, color)
          )
        )
      `)
      .eq('recital_id', recitalId)
      .order('performance_order')
    
    if (perfError) {
      console.error('Error fetching performances:', perfError)
    }
    
    // Combine all data
    return {
      recital,
      program: program || null,
      advertisements: advertisements || [],
      performances: performances || []
    }
  } catch (error) {
    console.error('Get recital program API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch recital program'
    })
  }
})