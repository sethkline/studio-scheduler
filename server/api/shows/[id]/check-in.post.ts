import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const showId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const {
    student_id,
    check_in_method = 'manual',
    dressing_room_id,
    has_all_costumes = true,
    missing_items,
    guardian_contact,
    notes,
  } = body

  if (!student_id) {
    throw createError({ statusCode: 400, statusMessage: 'Student ID is required' })
  }

  try {
    // Calculate arrival status based on showtime
    const arrivalStatus = 'on_time' // TODO: Calculate based on actual show time

    const { data: checkIn, error } = await client
      .from('show_day_check_ins')
      .insert([{
        recital_show_id: showId,
        student_id,
        check_in_time: new Date().toISOString(),
        checked_in_by: user.id,
        check_in_method,
        dressing_room_id: dressing_room_id || null,
        arrival_status: arrivalStatus,
        has_all_costumes,
        missing_items: missing_items || null,
        guardian_present: false,
        guardian_contact: guardian_contact || null,
        notes: notes || null,
        is_ready: has_all_costumes,
      }])
      .select(`
        *,
        student:students(id, first_name, last_name),
        dressing_room:dressing_rooms(id, room_name)
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        throw createError({ statusCode: 400, statusMessage: 'Student already checked in' })
      }
      throw createError({ statusCode: 500, statusMessage: 'Failed to check in student' })
    }

    return { message: 'Student checked in successfully', check_in: checkIn }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to check in student',
    })
  }
})
