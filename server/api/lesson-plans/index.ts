/**
 * GET /api/lesson-plans
 * List lesson plans with filtering and pagination
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import type { LessonPlanFilters } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event) as LessonPlanFilters

  // Pagination
  const page = parseInt(String(query.page || '1'))
  const limit = parseInt(String(query.limit || '20'))
  const offset = (page - 1) * limit

  // Build query
  let dbQuery = client
    .from('lesson_plans')
    .select(`
      *,
      class_instance:class_instances!inner(
        id,
        class_definition_id,
        class_definitions!inner(
          id,
          name,
          dance_styles(id, name, color)
        )
      ),
      teacher:teachers!inner(
        id,
        first_name,
        last_name,
        profile_image_url
      ),
      template:lesson_plan_templates(
        id,
        name
      )
    `, { count: 'exact' })

  // Apply filters
  if (query.class_instance_id) {
    dbQuery = dbQuery.eq('class_instance_id', query.class_instance_id)
  }

  if (query.teacher_id) {
    dbQuery = dbQuery.eq('teacher_id', query.teacher_id)
  }

  if (query.status) {
    if (Array.isArray(query.status)) {
      dbQuery = dbQuery.in('status', query.status)
    } else {
      dbQuery = dbQuery.eq('status', query.status)
    }
  }

  if (query.is_archived !== undefined) {
    dbQuery = dbQuery.eq('is_archived', query.is_archived)
  }

  if (query.date_from) {
    dbQuery = dbQuery.gte('lesson_date', query.date_from)
  }

  if (query.date_to) {
    dbQuery = dbQuery.lte('lesson_date', query.date_to)
  }

  if (query.search) {
    dbQuery = dbQuery.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%`)
  }

  // Sorting
  const sortBy = query.sort_by || 'lesson_date'
  const sortOrder = query.sort_order || 'desc'
  dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' })

  // Apply pagination
  dbQuery = dbQuery.range(offset, offset + limit - 1)

  const { data, error, count } = await dbQuery

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch lesson plans',
      data: error
    })
  }

  // Transform data to match interface
  const lessonPlans = data?.map(plan => ({
    ...plan,
    class_instance: plan.class_instance ? {
      id: plan.class_instance.id,
      class_definition_id: plan.class_instance.class_definition_id,
      class_name: plan.class_instance.class_definitions?.name || '',
      dance_style: plan.class_instance.class_definitions?.dance_styles?.name || ''
    } : undefined
  })) || []

  return {
    lesson_plans: lessonPlans,
    pagination: {
      page,
      limit,
      total_items: count || 0,
      total_pages: Math.ceil((count || 0) / limit)
    }
  }
})
