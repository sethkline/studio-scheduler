/**
 * POST /api/student-progress/update
 * Update student progress on a learning objective
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import type { CreateStudentObjectiveProgressInput, UpdateStudentObjectiveProgressInput } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
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
        teacher_id: createBody.teacher_id
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
