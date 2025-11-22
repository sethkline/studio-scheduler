import { getSupabaseClient } from '../../utils/supabase'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const user = await serverSupabaseUser(event)

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Get teacher profile
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('*, teacher:teachers!inner(id)')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.teacher) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Teacher profile not found'
      })
    }

    const teacherId = profile.teacher.id

    // Get today's date and current time
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentDay = now.getDay() // 0-6 (Sunday-Saturday)

    // Get week range (current week, Sunday to Saturday)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    // Get all teacher's classes from class_instances
    const { data: allClasses, error: classesError } = await client
      .from('class_instances')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        room,
        class_definition:class_definition_id (
          id,
          name,
          dance_style:dance_style_id (
            id,
            name,
            color
          ),
          class_level:level_id (
            id,
            name
          )
        )
      `)
      .eq('teacher_id', teacherId)

    if (classesError) throw classesError

    // Transform classes data
    const classes = (allClasses || []).map((c: any) => ({
      id: c.id,
      day_of_week: c.day_of_week,
      start_time: c.start_time,
      end_time: c.end_time,
      room: c.room,
      name: c.class_definition?.name || 'Untitled Class',
      dance_style_name: c.class_definition?.dance_style?.name || '',
      dance_style_color: c.class_definition?.dance_style?.color || '#6B46C1',
      level_name: c.class_definition?.class_level?.name || '',
      student_count: 0 // Will be populated below
    }))

    // Get student counts for each class
    for (const classItem of classes) {
      const { count } = await client
        .from('class_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_instance_id', classItem.id)
        .eq('status', 'active')

      classItem.student_count = count || 0
    }

    // Filter today's classes
    const todaysClasses = classes.filter((c: any) => c.day_of_week === currentDay)

    // Get this week's classes (all unique classes)
    const weeklyClasses = classes

    // Get teacher's availability
    const { data: availability, error: availabilityError } = await client
      .from('teacher_availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('day_of_week')
      .order('start_time')

    if (availabilityError) throw availabilityError

    // Calculate stats
    const stats = {
      totalClasses: classes.length,
      totalStudents: classes.reduce((sum: number, c: any) => sum + c.student_count, 0),
      classesToday: todaysClasses.length,
      classesThisWeek: weeklyClasses.length
    }

    return {
      stats,
      todaysClasses,
      weeklyClasses,
      availability: availability || []
    }
  } catch (error: any) {
    console.error('Teacher dashboard API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch teacher dashboard data'
    })
  }
})
