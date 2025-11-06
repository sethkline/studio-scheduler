/**
 * POST /api/evaluations/bulk-create
 *
 * Create evaluations for multiple students in a class at once.
 * Useful for teachers to evaluate an entire class in one session.
 *
 * Request body:
 * {
 *   class_instance_id: string
 *   schedule_id: string (optional)
 *   evaluations: Array<{
 *     student_id: string
 *     overall_rating?: number
 *     effort_rating?: number
 *     attitude_rating?: number
 *     strengths?: string
 *     areas_for_improvement?: string
 *     comments?: string
 *     recommended_next_level?: string
 *     skills?: Array<{ skill_name, rating, notes }>
 *   }>
 * }
 *
 * Access: Teachers (for their classes), Admin/Staff
 */

import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)

    if (!body.class_instance_id || !body.evaluations || body.evaluations.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Class instance ID and evaluations array are required'
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

    // Verify permissions
    if (profile?.user_role === 'teacher') {
      // Verify teacher teaches this class
      const { data: classInstance } = await client
        .from('class_instances')
        .select('teacher_id')
        .eq('id', body.class_instance_id)
        .single()

      if (classInstance?.teacher_id !== user.id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not teach this class'
        })
      }
    } else if (!['admin', 'staff'].includes(profile?.user_role || '')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied'
      })
    }

    // Get all enrolled students in this class
    const { data: enrollments } = await client
      .from('enrollments')
      .select('student_id')
      .eq('class_instance_id', body.class_instance_id)
      .eq('status', 'active')

    const enrolledStudentIds = enrollments?.map(e => e.student_id) || []

    // Validate all students are enrolled
    const invalidStudents = body.evaluations.filter(
      (eval: any) => !enrolledStudentIds.includes(eval.student_id)
    )

    if (invalidStudents.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Some students are not enrolled in this class: ${invalidStudents.map((s: any) => s.student_id).join(', ')}`
      })
    }

    // Check for existing evaluations
    if (body.schedule_id) {
      const { data: existingEvals } = await client
        .from('evaluations')
        .select('student_id')
        .eq('class_instance_id', body.class_instance_id)
        .eq('schedule_id', body.schedule_id)
        .in('student_id', body.evaluations.map((e: any) => e.student_id))

      if (existingEvals && existingEvals.length > 0) {
        throw createError({
          statusCode: 400,
          statusMessage: `Evaluations already exist for some students in this term`
        })
      }
    }

    // Prepare evaluations for insertion
    const evaluationsToInsert = body.evaluations.map((evalData: any) => ({
      student_id: evalData.student_id,
      teacher_id: user.id,
      class_instance_id: body.class_instance_id,
      schedule_id: body.schedule_id || null,
      overall_rating: evalData.overall_rating,
      effort_rating: evalData.effort_rating,
      attitude_rating: evalData.attitude_rating,
      strengths: evalData.strengths,
      areas_for_improvement: evalData.areas_for_improvement,
      comments: evalData.comments,
      recommended_next_level: evalData.recommended_next_level,
      status: evalData.status || 'draft',
      submitted_at: evalData.status === 'submitted' ? new Date().toISOString() : null
    }))

    // Insert evaluations
    const { data: createdEvaluations, error: evalError } = await client
      .from('evaluations')
      .insert(evaluationsToInsert)
      .select('id, student_id')

    if (evalError) throw evalError

    // Insert skills for each evaluation
    const allSkills = []
    for (let i = 0; i < body.evaluations.length; i++) {
      const evalData = body.evaluations[i]
      const createdEval = createdEvaluations?.find(e => e.student_id === evalData.student_id)

      if (evalData.skills && evalData.skills.length > 0 && createdEval) {
        const skillsToInsert = evalData.skills.map((skill: any) => ({
          evaluation_id: createdEval.id,
          skill_name: skill.skill_name,
          skill_category: skill.skill_category,
          rating: skill.rating,
          notes: skill.notes
        }))

        allSkills.push(...skillsToInsert)
      }
    }

    // Insert all skills at once
    if (allSkills.length > 0) {
      const { error: skillsError } = await client
        .from('evaluation_skills')
        .insert(allSkills)

      if (skillsError) {
        console.error('Error inserting skills:', skillsError)
        // Don't fail the whole operation if skills fail
      }
    }

    // Fetch complete evaluations with relationships
    const { data: completeEvaluations } = await client
      .from('evaluations')
      .select(`
        *,
        student:students!evaluations_student_id_fkey(id, first_name, last_name),
        teacher:teachers!evaluations_teacher_id_fkey(id, first_name, last_name),
        class_instance:class_instances!evaluations_class_instance_id_fkey(id, name),
        evaluation_skills(*)
      `)
      .in('id', createdEvaluations?.map(e => e.id) || [])

    return {
      message: `Successfully created ${createdEvaluations?.length || 0} evaluations`,
      count: createdEvaluations?.length || 0,
      evaluations: completeEvaluations || []
    }
  } catch (error: any) {
    console.error('Bulk create evaluations API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create evaluations'
    })
  }
})
