/**
 * GET /api/evaluations/student-history
 *
 * Get evaluation history for a student to compare progress over time.
 *
 * Query params:
 * - student_id: UUID (required)
 * - class_instance_id: UUID (optional - filter by specific class)
 * - limit: number (optional - default 10)
 *
 * Access: Teachers (if they teach student), Admin/Staff, Parents (own children)
 */

import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

    const studentId = query.student_id as string
    const classInstanceId = query.class_instance_id as string
    const limit = parseInt(query.limit as string) || 10

    if (!studentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Student ID is required'
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
      // Verify teacher has/had this student in their class
      const { data: hasStudent } = await client
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .in('class_instance_id',
          client
            .from('class_instances')
            .select('id')
            .eq('teacher_id', user.id)
        )
        .limit(1)
        .single()

      if (!hasStudent) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not teach this student'
        })
      }
    } else if (profile?.user_role === 'parent') {
      // Get guardian record for this user
      const { data: guardian } = await client
        .from('guardians')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!guardian) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Guardian profile not found'
        })
      }

      // Verify this guardian has access to this student
      const { data: relationship } = await client
        .from('student_guardian_relationships')
        .select('id')
        .eq('guardian_id', guardian.id)
        .eq('student_id', studentId)
        .single()

      if (!relationship) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Permission denied'
        })
      }
    } else if (!['admin', 'staff'].includes(profile?.user_role || '')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied'
      })
    }

    // Build query
    let dbQuery = client
      .from('evaluations')
      .select(`
        *,
        teacher:teachers!evaluations_teacher_id_fkey(id, first_name, last_name),
        class_instance:class_instances!evaluations_class_instance_id_fkey(
          id,
          name,
          class_definition:class_definitions(
            id,
            name,
            dance_style:dance_styles(id, name, color),
            class_level:class_levels(id, name)
          )
        ),
        schedule:schedules!evaluations_schedule_id_fkey(id, name, start_date, end_date),
        evaluation_skills(*)
      `)
      .eq('student_id', studentId)
      .eq('status', 'submitted') // Only show submitted evaluations

    if (classInstanceId) {
      dbQuery = dbQuery.eq('class_instance_id', classInstanceId)
    }

    const { data: evaluations, error } = await dbQuery
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      student_id: studentId,
      evaluations: evaluations || [],
      count: evaluations?.length || 0
    }
  } catch (error: any) {
    console.error('Student evaluation history API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch student evaluation history'
    })
  }
})
