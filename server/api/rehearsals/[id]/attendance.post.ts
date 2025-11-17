import { getSupabaseClient } from '../../../utils/supabase'

/**
 * Create attendance records for a rehearsal
 * POST /api/rehearsals/[id]/attendance
 *
 * This endpoint is used to initialize attendance records for all students
 * participating in a rehearsal
 *
 * Body: {
 *   student_ids: string[]
 * }
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const rehearsalId = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!body.student_ids || !Array.isArray(body.student_ids)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'student_ids array is required'
      })
    }

    // Create attendance records for all students
    const attendanceData = body.student_ids.map((studentId: string) => ({
      rehearsal_id: rehearsalId,
      student_id: studentId,
      status: 'expected'
    }))

    const { data, error } = await client
      .from('rehearsal_attendance')
      .upsert(attendanceData, {
        onConflict: 'rehearsal_id,student_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) throw error

    return {
      message: 'Attendance records created successfully',
      count: data?.length || 0
    }
  } catch (error: any) {
    console.error('Create attendance API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create attendance records'
    })
  }
})
