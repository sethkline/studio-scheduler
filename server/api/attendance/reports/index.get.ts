import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    const query = getQuery(event)
    const {
      student_id,
      class_instance_id,
      start_date,
      end_date,
      status,
      include_makeup,
    } = query

    // Verify user has permission
    const { data: profile } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw createError({
        statusCode: 404,
        message: 'User profile not found',
      })
    }

    // Build attendance query
    let attendanceQuery = client
      .from('attendance')
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name,
          photo_url
        ),
        class_instance:class_instances(
          id,
          name,
          dance_style:dance_styles(name, color)
        ),
        marked_by_user:profiles!attendance_marked_by_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .order('attendance_date', { ascending: false })

    // Apply filters
    if (student_id) {
      attendanceQuery = attendanceQuery.eq('student_id', student_id as string)

      // If parent, verify they are guardian of this student
      if (profile.user_role === 'parent') {
        const { data: guardian } = await client
          .from('guardians')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (guardian) {
          const { data: relationship } = await client
            .from('student_guardian_relationships')
            .select('id')
            .eq('guardian_id', guardian.id)
            .eq('student_id', student_id as string)
            .maybeSingle()

          if (!relationship) {
            throw createError({
              statusCode: 403,
              message: 'You can only view attendance for your own students',
            })
          }
        } else {
          throw createError({
            statusCode: 403,
            message: 'Guardian profile not found',
          })
        }
      }
    }

    if (class_instance_id) {
      attendanceQuery = attendanceQuery.eq('class_instance_id', class_instance_id as string)
    }

    if (start_date) {
      attendanceQuery = attendanceQuery.gte('attendance_date', start_date as string)
    }

    if (end_date) {
      attendanceQuery = attendanceQuery.lte('attendance_date', end_date as string)
    }

    if (status) {
      attendanceQuery = attendanceQuery.eq('status', status as string)
    }

    if (include_makeup === 'false') {
      attendanceQuery = attendanceQuery.eq('is_makeup', false)
    }

    const { data: records, error: attendanceError } = await attendanceQuery

    if (attendanceError) throw attendanceError

    // Calculate summary statistics
    const totalClasses = records?.length || 0
    const totalPresent = records?.filter((r: any) => r.status === 'present' || r.status === 'tardy').length || 0
    const totalAbsent = records?.filter((r: any) => r.status === 'absent').length || 0
    const totalExcused = records?.filter((r: any) => r.status === 'excused').length || 0
    const totalTardy = records?.filter((r: any) => r.status === 'tardy').length || 0
    const attendancePercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100 * 100) / 100 : 0

    // Get student summaries if no specific student filter
    let studentSummaries = null
    if (!student_id && class_instance_id) {
      const { data: summaries, error: summaryError } = await client
        .from('v_student_attendance_summary')
        .select('*')
        .eq('class_instance_id', class_instance_id as string)
        .order('attendance_percentage', { ascending: false })

      if (!summaryError) {
        studentSummaries = summaries
      }
    }

    return {
      filters: {
        student_id: student_id || null,
        class_instance_id: class_instance_id || null,
        start_date: start_date || null,
        end_date: end_date || null,
        status: status || null,
        include_makeup: include_makeup !== 'false',
      },
      summary: {
        total_classes: totalClasses,
        total_present: totalPresent,
        total_absent: totalAbsent,
        total_excused: totalExcused,
        total_tardy: totalTardy,
        attendance_percentage: attendancePercentage,
      },
      records: records || [],
      student_summaries: studentSummaries,
    }
  } catch (error: any) {
    console.error('Error fetching attendance report:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch attendance report',
    })
  }
})
