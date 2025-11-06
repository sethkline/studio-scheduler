/**
 * GET /api/evaluations
 *
 * Fetch evaluations with filtering, pagination, and related data.
 * Access: Teachers (own evaluations), Admin/Staff (all), Parents (children's evaluations)
 */

import { getSupabaseClient } from '../../utils/supabase'
import type { EvaluationFilters } from '~/types/assessment'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const query = getQuery(event)

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

    // Parse pagination
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Parse filters
    const filters: EvaluationFilters = {
      student_id: query.student_id as string,
      teacher_id: query.teacher_id as string,
      class_instance_id: query.class_instance_id as string,
      schedule_id: query.schedule_id as string,
      status: query.status as 'draft' | 'submitted',
      from_date: query.from_date as string,
      to_date: query.to_date as string,
    }

    // Build query with relationships
    let dbQuery = client
      .from('evaluations')
      .select(`
        *,
        student:students!evaluations_student_id_fkey(id, first_name, last_name),
        teacher:teachers!evaluations_teacher_id_fkey(id, first_name, last_name),
        class_instance:class_instances!evaluations_class_instance_id_fkey(id, name),
        schedule:schedules!evaluations_schedule_id_fkey(id, name, start_date, end_date),
        evaluation_skills(*)
      `, { count: 'exact' })

    // Apply role-based filtering
    if (profile?.user_role === 'teacher') {
      // Teachers can only see their own evaluations
      dbQuery = dbQuery.eq('teacher_id', user.id)
    } else if (profile?.user_role === 'parent') {
      // Parents can only see their children's evaluations
      const { data: guardianships } = await client
        .from('guardians')
        .select('student_id')
        .eq('guardian_id', user.id)

      const studentIds = guardianships?.map(g => g.student_id) || []
      if (studentIds.length > 0) {
        dbQuery = dbQuery.in('student_id', studentIds)
      } else {
        // Parent has no children, return empty
        return {
          evaluations: [],
          pagination: {
            page,
            limit,
            totalItems: 0,
            totalPages: 0
          }
        }
      }
    } else if (!['admin', 'staff'].includes(profile?.user_role || '')) {
      // Other roles don't have access
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied'
      })
    }

    // Apply filters
    if (filters.student_id) {
      dbQuery = dbQuery.eq('student_id', filters.student_id)
    }
    if (filters.teacher_id && ['admin', 'staff'].includes(profile?.user_role || '')) {
      dbQuery = dbQuery.eq('teacher_id', filters.teacher_id)
    }
    if (filters.class_instance_id) {
      dbQuery = dbQuery.eq('class_instance_id', filters.class_instance_id)
    }
    if (filters.schedule_id) {
      dbQuery = dbQuery.eq('schedule_id', filters.schedule_id)
    }
    if (filters.status) {
      dbQuery = dbQuery.eq('status', filters.status)
    }
    if (filters.from_date) {
      dbQuery = dbQuery.gte('created_at', filters.from_date)
    }
    if (filters.to_date) {
      dbQuery = dbQuery.lte('created_at', filters.to_date)
    }

    // Execute with pagination and ordering
    const { data, count, error } = await dbQuery
      .range(from, to)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      evaluations: data,
      pagination: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  } catch (error: any) {
    console.error('Evaluations API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch evaluations'
    })
  }
})
