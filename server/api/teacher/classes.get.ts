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

    // Get all teacher's classes
    const { data: classes, error: classesError } = await client
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
          description,
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
      .order('day_of_week')
      .order('start_time')

    if (classesError) throw classesError

    return classes || []
  } catch (error: any) {
    console.error('Teacher classes API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch teacher classes'
    })
  }
})
