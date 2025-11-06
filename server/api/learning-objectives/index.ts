/**
 * GET /api/learning-objectives
 * List learning objectives with filtering and pagination
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import type { LearningObjectiveFilters } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const query = getQuery(event) as LearningObjectiveFilters

  // Pagination
  const page = parseInt(String(query.page || '1'))
  const limit = parseInt(String(query.limit || '50'))
  const offset = (page - 1) * limit

  // Build query
  let dbQuery = client
    .from('learning_objectives')
    .select(`
      *,
      dance_style:dance_styles(id, name, color),
      class_level:class_levels(id, name),
      class_definition:class_definitions(id, name)
    `, { count: 'exact' })

  // Apply filters
  if (query.class_definition_id) {
    dbQuery = dbQuery.eq('class_definition_id', query.class_definition_id)
  }

  if (query.dance_style_id) {
    dbQuery = dbQuery.eq('dance_style_id', query.dance_style_id)
  }

  if (query.class_level_id) {
    dbQuery = dbQuery.eq('class_level_id', query.class_level_id)
  }

  if (query.category) {
    dbQuery = dbQuery.eq('category', query.category)
  }

  if (query.skill_level) {
    dbQuery = dbQuery.eq('skill_level', query.skill_level)
  }

  if (query.is_active !== undefined) {
    dbQuery = dbQuery.eq('is_active', query.is_active)
  }

  if (query.search) {
    dbQuery = dbQuery.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%`)
  }

  // Sorting
  dbQuery = dbQuery.order('sequence_order', { ascending: true })
  dbQuery = dbQuery.order('title', { ascending: true })

  // Apply pagination
  dbQuery = dbQuery.range(offset, offset + limit - 1)

  const { data, error, count } = await dbQuery

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch learning objectives',
      data: error
    })
  }

  return {
    objectives: data || [],
    pagination: {
      page,
      limit,
      total_items: count || 0,
      total_pages: Math.ceil((count || 0) / limit)
    }
  }
})
