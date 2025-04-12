import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  
  try {
    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    // Fetch recitals with program status
    const { data: recitals, count, error } = await client
      .from('recitals')
      .select(`
        id,
        name,
        description,
        date,
        location,
        notes,
        status,
        theme,
        program_notes,
        created_at,
        updated_at
      `, { count: 'exact' })
      .order('date', { ascending: false })
      .range(from, to)
    
    if (error) throw error
    
    // Check if each recital has a program
    const recitalIds = recitals.map(recital => recital.id)
    
    let programsData = []
    if (recitalIds.length > 0) {
      const { data: programs, error: programsError } = await client
        .from('recital_programs')
        .select('recital_id')
        .in('recital_id', recitalIds)
      
      if (programsError) throw programsError
      
      programsData = programs
    }
    
    // Add has_program flag to each recital
    const enrichedRecitals = recitals.map(recital => ({
      ...recital,
      has_program: programsData.some(p => p.recital_id === recital.id)
    }))
    
    return {
      recitals: enrichedRecitals,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Fetch recitals API error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch recitals'
    })
  }
})