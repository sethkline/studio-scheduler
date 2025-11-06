/**
 * PUT /api/evaluations/[id]
 *
 * Update an existing evaluation.
 * Access: Teachers (own evaluations, draft only), Admin/Staff
 */

import { getSupabaseClient } from '../../utils/supabase'
import type { UpdateEvaluationRequest } from '~/types/assessment'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const body = await readBody<UpdateEvaluationRequest>(event)

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Evaluation ID is required'
      })
    }

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

    // Fetch existing evaluation
    const { data: existing, error: fetchError } = await client
      .from('evaluations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Evaluation not found'
      })
    }

    // Check permissions
    if (profile?.user_role === 'teacher') {
      // Teachers can only update their own evaluations
      if (existing.teacher_id !== user.id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Permission denied'
        })
      }

      // Teachers can only edit draft evaluations
      if (existing.status === 'submitted') {
        throw createError({
          statusCode: 403,
          statusMessage: 'Cannot edit submitted evaluations'
        })
      }
    } else if (!['admin', 'staff'].includes(profile?.user_role || '')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied'
      })
    }

    // Validate ratings if provided
    if (body.evaluation.overall_rating !== undefined) {
      if (body.evaluation.overall_rating < 1 || body.evaluation.overall_rating > 5) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Overall rating must be between 1 and 5'
        })
      }
    }
    if (body.evaluation.effort_rating !== undefined) {
      if (body.evaluation.effort_rating < 1 || body.evaluation.effort_rating > 5) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Effort rating must be between 1 and 5'
        })
      }
    }
    if (body.evaluation.attitude_rating !== undefined) {
      if (body.evaluation.attitude_rating < 1 || body.evaluation.attitude_rating > 5) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Attitude rating must be between 1 and 5'
        })
      }
    }

    // If changing status to submitted, set submitted_at timestamp
    if (body.evaluation.status === 'submitted' && existing.status !== 'submitted') {
      body.evaluation.submitted_at = new Date().toISOString()
    }

    // Update evaluation
    const { data: evaluation, error: updateError } = await client
      .from('evaluations')
      .update(body.evaluation)
      .eq('id', id)
      .select(`
        *,
        student:students!evaluations_student_id_fkey(id, first_name, last_name),
        teacher:teachers!evaluations_teacher_id_fkey(id, first_name, last_name),
        class_instance:class_instances!evaluations_class_instance_id_fkey(id, name),
        schedule:schedules!evaluations_schedule_id_fkey(id, name, start_date, end_date)
      `)
      .single()

    if (updateError) throw updateError

    // Update evaluation skills if provided
    if (body.skills) {
      // Delete existing skills
      await client
        .from('evaluation_skills')
        .delete()
        .eq('evaluation_id', id)

      // Insert new skills
      if (body.skills.length > 0) {
        const skillsToInsert = body.skills.map(skill => ({
          ...skill,
          evaluation_id: id
        }))

        const { data: skills, error: skillsError } = await client
          .from('evaluation_skills')
          .insert(skillsToInsert)
          .select()

        if (skillsError) throw skillsError

        evaluation.evaluation_skills = skills
      }
    } else {
      // Fetch existing skills
      const { data: skills } = await client
        .from('evaluation_skills')
        .select('*')
        .eq('evaluation_id', id)

      evaluation.evaluation_skills = skills || []
    }

    return {
      message: 'Evaluation updated successfully',
      evaluation
    }
  } catch (error: any) {
    console.error('Update evaluation API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update evaluation'
    })
  }
})
