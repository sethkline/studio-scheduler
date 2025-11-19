import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Get all participants for a rehearsal
 * GET /api/rehearsals/[id]/participants
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const rehearsalId = getRouterParam(event, 'id')

    // Get participants with class/performance details
    const { data: participants, error } = await client
      .from('rehearsal_participants')
      .select(`
        id,
        rehearsal_id,
        class_instance_id,
        performance_id,
        call_time,
        expected_duration,
        performance_order,
        notes,
        class_instance:class_instances (
          id,
          name,
          class_definition:class_definitions (
            id,
            name
          )
        ),
        performance:recital_performances (
          id,
          song_title,
          song_artist,
          class_instance:class_instances (
            id,
            name
          )
        )
      `)
      .eq('rehearsal_id', rehearsalId)
      .order('performance_order', { ascending: true })

    if (error) throw error

    return {
      participants: participants || []
    }
  } catch (error: any) {
    console.error('Get participants API error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch participants'
    })
  }
})
