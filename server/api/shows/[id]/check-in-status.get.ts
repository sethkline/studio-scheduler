import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const showId = getRouterParam(event, 'id')

  try {
    // Get all check-ins for this show
    const { data: checkIns, error } = await client
      .from('show_day_check_ins')
      .select(`
        *,
        student:students(id, first_name, last_name),
        dressing_room:dressing_rooms(id, room_name),
        staff:profiles!show_day_check_ins_checked_in_by_fkey(id, first_name, last_name)
      `)
      .eq('recital_show_id', showId)

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch check-ins' })

    // Get all students who should be at this show (from confirmations)
    const { data: expectedStudents } = await client
      .from('recital_performer_confirmations')
      .select(`
        student_id,
        student:students(id, first_name, last_name)
      `)
      .eq('recital_id', showId)
      .eq('status', 'confirmed')

    const totalStudents = expectedStudents?.length || 0
    const checkedInCount = checkIns?.length || 0
    const onTimeCount = checkIns?.filter(c => c.arrival_status === 'on_time').length || 0
    const lateCount = checkIns?.filter(c => c.arrival_status === 'late' || c.arrival_status === 'very_late').length || 0
    const missingCostumesCount = checkIns?.filter(c => !c.has_all_costumes).length || 0
    const readyCount = checkIns?.filter(c => c.is_ready).length || 0

    const summary = {
      total_students: totalStudents,
      checked_in: checkedInCount,
      not_checked_in: totalStudents - checkedInCount,
      on_time: onTimeCount,
      late: lateCount,
      missing_costumes: missingCostumesCount,
      ready_for_performance: readyCount,
    }

    // Get list of students not yet checked in
    const checkedInIds = new Set((checkIns || []).map(c => c.student_id))
    const notCheckedIn = (expectedStudents || [])
      .filter(s => !checkedInIds.has(s.student_id))
      .map(s => s.student)

    return {
      summary,
      check_ins: checkIns || [],
      not_checked_in: notCheckedIn,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch check-in status',
    })
  }
})
