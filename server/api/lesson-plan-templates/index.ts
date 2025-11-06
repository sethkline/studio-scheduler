/**
 * GET /api/lesson-plan-templates
 * List lesson plan templates with filtering and pagination
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import type { LessonPlanTemplateFilters } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event) as LessonPlanTemplateFilters

  // Pagination
  const page = parseInt(String(query.page || '1'))
  const limit = parseInt(String(query.limit || '20'))
  const offset = (page - 1) * limit

  // Build query
  let dbQuery = client
    .from('lesson_plan_templates')
    .select(`
      *,
      teacher:teachers(id, first_name, last_name),
      dance_style:dance_styles(id, name, color),
      class_level:class_levels(id, name)
    `, { count: 'exact' })

  // Apply filters
  if (query.teacher_id) {
    dbQuery = dbQuery.eq('teacher_id', query.teacher_id)
  }

  if (query.dance_style_id) {
    dbQuery = dbQuery.eq('dance_style_id', query.dance_style_id)
  }

  if (query.class_level_id) {
    dbQuery = dbQuery.eq('class_level_id', query.class_level_id)
  }

  if (query.is_public !== undefined) {
    dbQuery = dbQuery.eq('is_public', query.is_public)
  }

  if (query.search) {
    dbQuery = dbQuery.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`)
  }

  // Sorting
  const sortBy = query.sort_by || 'name'
  const sortOrder = query.sort_order || 'asc'
  dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' })

  // Apply pagination
  dbQuery = dbQuery.range(offset, offset + limit - 1)

  const { data, error, count } = await dbQuery

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch lesson plan templates',
      data: error
    })
  }

  return {
    templates: data || [],
    pagination: {
      page,
      limit,
      total_items: count || 0,
      total_pages: Math.ceil((count || 0) / limit)
    }
  }
})
