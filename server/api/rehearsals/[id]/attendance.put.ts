import { getSupabaseClient } from '../../../utils/supabase'

/**
 * Bulk update attendance records for a rehearsal
 * PUT /api/rehearsals/[id]/attendance
 *
 * Body: {
 *   attendance: [
 *     { id, status, check_in_time?, check_out_time?, notes? },
 *     ...
 *   ]
 * }
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const rehearsalId = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!body.attendance || !Array.isArray(body.attendance)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Attendance array is required'
      })
    }

    // Update each attendance record
    const updates = body.attendance.map(async (record: any) => {
      const updateData: any = {}

      if (record.status !== undefined) updateData.status = record.status
      if (record.check_in_time !== undefined) updateData.check_in_time = record.check_in_time
      if (record.check_out_time !== undefined) updateData.check_out_time = record.check_out_time
      if (record.notes !== undefined) updateData.notes = record.notes

      const { error } = await client
        .from('rehearsal_attendance')
        .update(updateData)
        .eq('id', record.id)
        .eq('rehearsal_id', rehearsalId) // Ensure record belongs to this rehearsal

      if (error) {
        console.error(`Failed to update attendance record ${record.id}:`, error)
        throw error
      }
    })

    await Promise.all(updates)

    return {
      message: 'Attendance records updated successfully',
      updated_count: body.attendance.length
    }
  } catch (error: any) {
    console.error('Update attendance API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update attendance records'
    })
  }
})
