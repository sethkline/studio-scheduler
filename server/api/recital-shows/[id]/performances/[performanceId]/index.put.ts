// server/api/recital-shows/[id]/performances/[performanceId]/index.put.ts
import { getSupabaseClient } from '../../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const recitalId = getRouterParam(event, 'id')
    const performanceId = getRouterParam(event, 'performanceId')
    const body = await readBody(event)
    
    // Validate that the performance belongs to this recital
    const { data: performance, error: checkError } = await client
      .from('recital_performances')
      .select('id')
      .eq('id', performanceId)
      .eq('recital_id', recitalId)
      .single()
    
    if (checkError) {
      // If no performance found, return appropriate error
      if (checkError.code === 'PGRST116') {
        return createError({
          statusCode: 404,
          statusMessage: 'Performance not found for this recital'
        })
      }
      throw checkError
    }

    // Extract dancers from notes if present
    let dancerNames = []
    let performanceNotes = body.notes || ''
    
    // Check if notes contains a dancer list
    if (performanceNotes && performanceNotes.includes('Dancers:')) {
      console.log('Found dancers section in notes field')
      
      // Extract the dancers section
      const dancerSection = performanceNotes.substring(performanceNotes.indexOf('Dancers:') + 8).trim()
      
      // Parse the dancer names
      dancerNames = dancerSection.split(',')
        .map(name => name.trim())
        .filter(name => name)
      
      console.log(`Extracted ${dancerNames.length} dancers from notes`)
      
      // Remove dancers section from notes to avoid duplication
      performanceNotes = performanceNotes.replace(/Dancers:.*$/s, '').trim()
      
      // Update the body with the cleaned notes
      body.notes = performanceNotes
    }
    
    // Update the performance
    const { data, error } = await client
      .from('recital_performances')
      .update(body)
      .eq('id', performanceId)
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
    
    if (error) throw error
    
    // Handle dancers if we have any
    if (dancerNames.length > 0) {
      // First delete existing dancers
      const { error: deleteError } = await client
        .from('performance_dancers')
        .delete()
        .eq('performance_id', performanceId)
      
      if (deleteError) {
        console.error('Error deleting existing dancers:', deleteError)
      } else {
        console.log('Successfully deleted existing dancers')
      }
      
      // Then add new dancers
      for (const dancerName of dancerNames) {
        const { error: dancerError } = await client
          .from('performance_dancers')
          .insert({
            performance_id: performanceId,
            dancer_name: dancerName,
            created_at: new Date().toISOString()
          })
          
        if (dancerError) {
          console.error(`Error adding dancer "${dancerName}":`, dancerError)
        } else {
          console.log(`Successfully added dancer "${dancerName}" to performance`)
        }
      }
    }
    
    return {
      message: 'Performance updated successfully',
      performance: data[0]
    }
  } catch (error) {
    console.error('Update performance error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to update performance'
    })
  }
})