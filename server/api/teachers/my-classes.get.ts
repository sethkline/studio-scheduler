/**
 * GET /api/teachers/my-classes
 *
 * Get all classes taught by the authenticated teacher.
 * Access: Teachers
 */

import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()

    // Get authenticated user
    const authHeader = event.node.req.headers.authorization
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await client.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Get user profile to check role
    const { data: profile } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (!['teacher', 'admin', 'staff'].includes(profile?.user_role || '')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied'
      })
    }

    // Fetch classes taught by this teacher
    let query = client
      .from('class_instances')
      .select(`
        id,
        name,
        status,
        teacher_id,
        created_at,
        class_definition:class_definitions(
          id,
          name,
          dance_style_id,
          class_level_id,
          dance_style:dance_styles(id, name, color),
          class_level:class_levels(id, name)
        )
      `)
      .eq('status', 'active')
      .order('name')

    // Filter by teacher for teacher role
    if (profile?.user_role === 'teacher') {
      query = query.eq('teacher_id', user.id)
    }

    const { data: classes, error } = await query

    if (error) throw error

    return {
      classes: classes || []
    }
  } catch (error: any) {
    console.error('My classes API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch classes'
    })
  }
})
