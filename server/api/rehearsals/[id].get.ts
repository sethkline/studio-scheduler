import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

/**
 * Get a single rehearsal with full details
 * GET /api/rehearsals/[id]
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const rehearsalId = getRouterParam(event, 'id')

    // Get rehearsal details
    const { data: rehearsal, error } = await client
      .from('recital_rehearsals')
      .select('*')
      .eq('id', rehearsalId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Rehearsal not found'
        })
      }
      throw error
    }

    // Get participant count
    const { count: participantCount } = await client
      .from('rehearsal_participants')
      .select('id', { count: 'exact', head: true })
      .eq('rehearsal_id', rehearsalId)

    // Get attendance statistics
    const { data: attendanceStats } = await client
      .from('rehearsal_attendance')
      .select('status')
      .eq('rehearsal_id', rehearsalId)

    const attendanceCount = attendanceStats?.filter(
      a => a.status === 'present' || a.status === 'late'
    ).length || 0

    // Get resources count
    const { count: resourceCount } = await client
      .from('rehearsal_resources')
      .select('id', { count: 'exact', head: true })
      .eq('rehearsal_id', rehearsalId)

    return {
      ...rehearsal,
      participant_count: participantCount || 0,
      attendance_count: attendanceCount,
      resources: [], // Will be populated by resources endpoint
      resource_count: resourceCount || 0
    }
  } catch (error: any) {
    console.error('Get rehearsal API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch rehearsal'
    })
  }
})
