/**
 * PUT /api/lesson-plans/[id]
 * Update a lesson plan
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import { requireAuth, requirePermission } from '~/server/utils/auth'
import type { UpdateLessonPlanInput } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  // Authenticate user
  const user = await requireAuth(event)

  // Check permission to manage lesson plans
  requirePermission(user, 'canManageLessonPlans')

  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')
  const body = await readBody<UpdateLessonPlanInput>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Lesson plan ID is required'
    })
  }

  // First, fetch the existing lesson plan to check ownership
  const { data: existingPlan, error: fetchError } = await client
    .from('lesson_plans')
    .select('teacher_id')
    .eq('id', id)
    .single()

  if (fetchError || !existingPlan) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Lesson plan not found'
    })
  }

  // Check authorization: teachers can only update their own lessons, admin/staff can update all
  const isAdminOrStaff = user.user_role === 'admin' || user.user_role === 'staff'
  const isOwner = existingPlan.teacher_id === user.teacher_id

  if (!isAdminOrStaff && !isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - You can only update your own lesson plans'
    })
  }

  // Build update object (only include fields that are present)
  const updateData: any = {}

  if (body.class_instance_id !== undefined) updateData.class_instance_id = body.class_instance_id
  if (body.teacher_id !== undefined) updateData.teacher_id = body.teacher_id
  if (body.template_id !== undefined) updateData.template_id = body.template_id
  if (body.lesson_date !== undefined) updateData.lesson_date = body.lesson_date
  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description
  if (body.duration !== undefined) updateData.duration = body.duration
  if (body.content !== undefined) updateData.content = body.content
  if (body.materials_needed !== undefined) updateData.materials_needed = body.materials_needed
  if (body.warm_up !== undefined) updateData.warm_up = body.warm_up
  if (body.main_activity !== undefined) updateData.main_activity = body.main_activity
  if (body.cool_down !== undefined) updateData.cool_down = body.cool_down
  if (body.homework !== undefined) updateData.homework = body.homework
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.status !== undefined) updateData.status = body.status
  if (body.is_archived !== undefined) updateData.is_archived = body.is_archived
  if (body.completed_at !== undefined) updateData.completed_at = body.completed_at

  // Auto-set completed_at when status changes to completed
  if (body.status === 'completed' && !body.completed_at) {
    updateData.completed_at = new Date().toISOString()
  }

  // Update lesson plan
  const { data, error } = await client
    .from('lesson_plans')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      class_instance:class_instances(
        id,
        class_definition_id,
        class_definitions(
          id,
          name,
          dance_styles(id, name, color)
        )
      ),
      teacher:teachers(
        id,
        first_name,
        last_name,
        profile_image_url
      ),
      template:lesson_plan_templates(
        id,
        name
      )
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Lesson plan not found'
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update lesson plan',
      data: error
    })
  }

  // Update objectives if provided
  if (body.objectives !== undefined) {
    // Delete existing objectives
    await client
      .from('lesson_plan_objectives')
      .delete()
      .eq('lesson_plan_id', id)

    // Insert new objectives
    if (body.objectives.length > 0) {
      const objectiveRecords = body.objectives.map(objId => ({
        lesson_plan_id: id,
        learning_objective_id: objId,
        is_primary: false
      }))

      const { error: objectivesError } = await client
        .from('lesson_plan_objectives')
        .insert(objectiveRecords)

      if (objectivesError) {
        console.error('Failed to update objectives:', objectivesError)
      }
    }
  }

  return {
    success: true,
    lesson_plan: data
  }
})
