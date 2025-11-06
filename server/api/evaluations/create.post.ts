/**
 * POST /api/evaluations/create
 *
 * Create a new evaluation with skills.
 * Access: Teachers (for their classes), Admin/Staff
 */

import { getSupabaseClient } from '../../utils/supabase'
import type { CreateEvaluationRequest } from '~/types/assessment'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody<CreateEvaluationRequest>(event)

    if (!body.evaluation) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Evaluation data is required'
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

    // Validate permissions
    if (profile?.user_role === 'teacher') {
      // Teachers can only create evaluations for their own classes
      if (body.evaluation.teacher_id !== user.id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Teachers can only create evaluations for their own classes'
        })
      }

      // Verify teacher teaches this class
      const { data: classInstance } = await client
        .from('class_instances')
        .select('teacher_id')
        .eq('id', body.evaluation.class_instance_id)
        .single()

      if (classInstance?.teacher_id !== user.id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not teach this class'
        })
      }

      // Verify student is enrolled in this class
      const { data: enrollment } = await client
        .from('enrollments')
        .select('id')
        .eq('student_id', body.evaluation.student_id)
        .eq('class_instance_id', body.evaluation.class_instance_id)
        .eq('status', 'active')
        .single()

      if (!enrollment) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Student is not enrolled in this class'
        })
      }
    } else if (!['admin', 'staff'].includes(profile?.user_role || '')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied'
      })
    }

    // Validate required fields
    if (!body.evaluation.student_id || !body.evaluation.teacher_id || !body.evaluation.class_instance_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Student, teacher, and class instance are required'
      })
    }

    // Validate ratings if provided
    if (body.evaluation.overall_rating && (body.evaluation.overall_rating < 1 || body.evaluation.overall_rating > 5)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Overall rating must be between 1 and 5'
      })
    }
    if (body.evaluation.effort_rating && (body.evaluation.effort_rating < 1 || body.evaluation.effort_rating > 5)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Effort rating must be between 1 and 5'
      })
    }
    if (body.evaluation.attitude_rating && (body.evaluation.attitude_rating < 1 || body.evaluation.attitude_rating > 5)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Attitude rating must be between 1 and 5'
      })
    }

    // Check for existing evaluation for this student/class/schedule
    if (body.evaluation.schedule_id) {
      const { data: existing } = await client
        .from('evaluations')
        .select('id')
        .eq('student_id', body.evaluation.student_id)
        .eq('class_instance_id', body.evaluation.class_instance_id)
        .eq('schedule_id', body.evaluation.schedule_id)
        .single()

      if (existing) {
        throw createError({
          statusCode: 400,
          statusMessage: 'An evaluation already exists for this student in this class for this term'
        })
      }
    }

    // Create evaluation
    const { data: evaluation, error: evalError } = await client
      .from('evaluations')
      .insert([body.evaluation])
      .select(`
        *,
        student:students!evaluations_student_id_fkey(id, first_name, last_name),
        teacher:teachers!evaluations_teacher_id_fkey(id, first_name, last_name),
        class_instance:class_instances!evaluations_class_instance_id_fkey(id, name)
      `)
      .single()

    if (evalError) throw evalError

    // Create evaluation skills if provided
    if (body.skills && body.skills.length > 0) {
      const skillsToInsert = body.skills.map(skill => ({
        ...skill,
        evaluation_id: evaluation.id
      }))

      const { data: skills, error: skillsError } = await client
        .from('evaluation_skills')
        .insert(skillsToInsert)
        .select()

      if (skillsError) {
        // Rollback evaluation if skills insertion fails
        await client.from('evaluations').delete().eq('id', evaluation.id)
        throw skillsError
      }

      evaluation.evaluation_skills = skills
    }

    return {
      message: 'Evaluation created successfully',
      evaluation
    }
  } catch (error: any) {
    console.error('Create evaluation API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create evaluation'
    })
  }
})
