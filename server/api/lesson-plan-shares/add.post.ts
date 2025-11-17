/**
 * POST /api/lesson-plan-shares/add
 * Share a lesson plan with another teacher
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import { requireAuth, requirePermission } from '~/server/utils/auth'
import type { CreateLessonPlanShareInput } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  // Authenticate user
  const user = await requireAuth(event)

  // Check permission to share lesson plans
  requirePermission(user, 'canShareLessonPlans')

  const client = getSupabaseClient()
  const body = await readBody<CreateLessonPlanShareInput>(event)

  if (!body.lesson_plan_id || !body.shared_with_teacher_id || !body.shared_by_teacher_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
    })
  }

  // Verify the sharing user owns the lesson plan or is admin/staff
  const { data: lessonPlan, error: fetchError } = await client
    .from('lesson_plans')
    .select('teacher_id')
    .eq('id', body.lesson_plan_id)
    .single()

  if (fetchError || !lessonPlan) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Lesson plan not found'
    })
  }

  const isAdminOrStaff = user.user_role === 'admin' || user.user_role === 'staff'
  const isOwner = lessonPlan.teacher_id === user.teacher_id

  if (!isAdminOrStaff && !isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - You can only share your own lesson plans'
    })
  }

  // Verify the shared_by_teacher_id matches the authenticated user
  if (!isAdminOrStaff && body.shared_by_teacher_id !== user.teacher_id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - Cannot share on behalf of other teachers'
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
