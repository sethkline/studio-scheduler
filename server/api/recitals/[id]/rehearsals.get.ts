import { getSupabaseClient } from '../../../utils/supabase'

/**
 * Get all rehearsals for a recital with optional filtering
 * GET /api/recitals/[id]/rehearsals
 *
 * Query params:
 * - type: Filter by rehearsal type (tech, dress, stage, full, other)
 * - status: Filter by status (scheduled, in-progress, completed, cancelled)
 * - date_from: Filter by start date (inclusive)
 * - date_to: Filter by end date (inclusive)
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const recitalShowId = getRouterParam(event, 'id')
    const query = getQuery(event)

    // Build query
    let dbQuery = client
      .from('recital_rehearsals')
      .select(`
        id,
        recital_show_id,
        name,
        type,
        date,
        start_time,
        end_time,
        location,
        description,
        call_time,
        notes,
        requires_costumes,
        requires_props,
        requires_tech,
        parents_allowed,
        status,
        created_at,
        updated_at
      `)
      .eq('recital_show_id', recitalShowId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    // Apply filters
    if (query.type) {
      dbQuery = dbQuery.eq('type', query.type)
    }

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }

    if (query.date_from) {
      dbQuery = dbQuery.gte('date', query.date_from)
    }

    if (query.date_to) {
      dbQuery = dbQuery.lte('date', query.date_to)
    }

    const { data: rehearsals, error } = await dbQuery

    if (error) throw error

    // Get participant and attendance counts for each rehearsal
    const rehearsalsWithCounts = await Promise.all(
      (rehearsals || []).map(async (rehearsal) => {
        // Get participant count
        const { count: participantCount } = await client
          .from('rehearsal_participants')
          .select('id', { count: 'exact', head: true })
          .eq('rehearsal_id', rehearsal.id)

        // Get attendance count
        const { count: attendanceCount } = await client
          .from('rehearsal_attendance')
          .select('id', { count: 'exact', head: true })
          .eq('rehearsal_id', rehearsal.id)
          .in('status', ['present', 'late'])

        return {
          ...rehearsal,
          participant_count: participantCount || 0,
          attendance_count: attendanceCount || 0
        }
      })
    )

    return {
      rehearsals: rehearsalsWithCounts
    }
  } catch (error: any) {
    console.error('List rehearsals API error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch rehearsals'
    })
  }
})
