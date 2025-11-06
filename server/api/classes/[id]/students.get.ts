/**
 * GET /api/classes/[id]/students
 *
 * Get all students enrolled in a class.
 * Access: Teachers (for their classes), Admin/Staff
 */

import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const classId = getRouterParam(event, 'id')

    if (!classId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Class ID is required'
      })
    }

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

    // Check permissions
    if (profile?.user_role === 'teacher') {
      // Verify teacher teaches this class
      const { data: classInstance } = await client
        .from('class_instances')
        .select('teacher_id')
        .eq('id', classId)
        .single()

      if (classInstance?.teacher_id !== user.id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not teach this class'
        })
      }
    } else if (!['admin', 'staff'].includes(profile?.user_role || '')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied'
      })
    }

    // Fetch enrolled students
    const { data: enrollments, error } = await client
      .from('enrollments')
      .select(`
        id,
        enrollment_date,
        status,
        student:students(
          id,
          first_name,
          last_name,
          date_of_birth,
          email,
          status
        )
      `)
      .eq('class_instance_id', classId)
      .eq('status', 'active')
      .order('student(last_name)')

    if (error) throw error

    // Extract students from enrollments
    const students = enrollments?.map(e => e.student).filter(Boolean) || []

    return {
      students
    }
  } catch (error: any) {
    console.error('Class students API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch students'
    })
  }
})
