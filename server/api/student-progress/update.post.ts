/**
 * POST /api/student-progress/update
 * Update student progress on a learning objective
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import { requireAuth, requirePermission } from '~/server/utils/auth'
import type { CreateStudentObjectiveProgressInput, UpdateStudentObjectiveProgressInput } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  // Authenticate user
  const user = await requireAuth(event)

  // Check permission to track student progress
  requirePermission(user, 'canTrackStudentProgress')

  const client = getSupabaseClient()
  const body = await readBody<CreateStudentObjectiveProgressInput | UpdateStudentObjectiveProgressInput>(event)

  // Check if progress record exists
  if ('id' in body && body.id) {
    // Update existing progress
    const { data, error } = await client
      .from('student_objective_progress')
      .update({
        progress_level: body.progress_level,
        assessment_date: body.assessment_date,
        notes: body.notes
      })
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update progress',
        data: error
      })
    }

    return { success: true, progress: data }
  } else {
    // Create new progress record
    const createBody = body as CreateStudentObjectiveProgressInput

    if (!createBody.student_id || !createBody.learning_objective_id || !createBody.lesson_plan_id || !createBody.class_instance_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    // Verify the teacher has access to this lesson plan
    const { data: lessonPlan, error: fetchError } = await client
      .from('lesson_plans')
      .select('teacher_id')
      .eq('id', createBody.lesson_plan_id)
      .single()

    if (fetchError || !lessonPlan) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Lesson plan not found'
      })
    }

    const isAdminOrStaff = user.user_role === 'admin' || user.user_role === 'staff'
    const isTeacher = lessonPlan.teacher_id === user.teacher_id

    if (!isAdminOrStaff && !isTeacher) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - You can only track progress for your own classes'
      })
    }

    const { data, error } = await client
      .from('student_objective_progress')
      .insert({
        student_id: createBody.student_id,
        learning_objective_id: createBody.learning_objective_id,
        lesson_plan_id: createBody.lesson_plan_id,
        class_instance_id: createBody.class_instance_id,
        progress_level: createBody.progress_level || 'not_started',
        assessment_date: createBody.assessment_date,
        notes: createBody.notes,
        teacher_id: createBody.teacher_id || user.teacher_id
      })
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create progress',
        data: error
      })
    }

    return { success: true, progress: data }
  }
})
