/**
 * POST /api/lesson-plan-shares/add
 * Share a lesson plan with another teacher
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import type { CreateLessonPlanShareInput } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody<CreateLessonPlanShareInput>(event)

  if (!body.lesson_plan_id || !body.shared_with_teacher_id || !body.shared_by_teacher_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
    })
  }

  const { data, error } = await client
    .from('lesson_plan_shares')
    .insert({
      lesson_plan_id: body.lesson_plan_id,
      shared_with_teacher_id: body.shared_with_teacher_id,
      shared_by_teacher_id: body.shared_by_teacher_id,
      permission_level: body.permission_level || 'view',
      message: body.message
    })
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to share lesson plan',
      data: error
    })
  }

  return { success: true, share: data }
})
