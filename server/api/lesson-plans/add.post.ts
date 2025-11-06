/**
 * POST /api/lesson-plans/add
 * Create a new lesson plan
 */
import { getSupabaseClient } from '~/server/utils/supabase'
import type { CreateLessonPlanInput } from '~/types/lesson-planning'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody<CreateLessonPlanInput>(event)

  // Validate required fields
  if (!body.class_instance_id || !body.teacher_id || !body.lesson_date || !body.title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: class_instance_id, teacher_id, lesson_date, title'
    })
  }

  // Create lesson plan
  const { data, error } = await client
    .from('lesson_plans')
    .insert({
      class_instance_id: body.class_instance_id,
      teacher_id: body.teacher_id,
      template_id: body.template_id,
      lesson_date: body.lesson_date,
      title: body.title,
      description: body.description,
      duration: body.duration,
      content: body.content,
      objectives: body.objectives,
      materials_needed: body.materials_needed,
      warm_up: body.warm_up,
      main_activity: body.main_activity,
      cool_down: body.cool_down,
      homework: body.homework,
      notes: body.notes,
      status: body.status || 'draft'
    })
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
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create lesson plan',
      data: error
    })
  }

  // If objectives are provided, create junction records
  if (body.objectives && body.objectives.length > 0) {
    const objectiveRecords = body.objectives.map(objId => ({
      lesson_plan_id: data.id,
      learning_objective_id: objId,
      is_primary: false
    }))

    const { error: objectivesError } = await client
      .from('lesson_plan_objectives')
      .insert(objectiveRecords)

    if (objectivesError) {
      console.error('Failed to link objectives:', objectivesError)
    }
  }

  return {
    success: true,
    lesson_plan: data
  }
})
