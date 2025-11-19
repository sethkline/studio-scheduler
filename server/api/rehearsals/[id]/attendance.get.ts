import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Get all attendance records for a rehearsal
 * GET /api/rehearsals/[id]/attendance
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const rehearsalId = getRouterParam(event, 'id')

    // Get attendance records with student details
    const { data: attendance, error } = await client
      .from('rehearsal_attendance')
      .select(`
        id,
        rehearsal_id,
        student_id,
        status,
        check_in_time,
        check_out_time,
        notes,
        parent_notified_at,
        created_at,
        updated_at,
        student:students (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('rehearsal_id', rehearsalId)
      .order('student(last_name)', { ascending: true })

    if (error) throw error

    return {
      attendance: attendance || []
    }
  } catch (error: any) {
    console.error('Get attendance API error:', error)

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch attendance records'
    })
  }
})
