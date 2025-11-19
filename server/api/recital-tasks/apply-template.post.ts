// API Endpoint: Apply task template to a recital
// Story 2.1.2: Enhanced Recital Checklist System
// Creates tasks from a template with calculated due dates

import { getSupabaseClient } from '~/server/utils/supabase'

interface ApplyTemplateRequest {
  recitalId: string
  templateId: string
  showDate: string // The reference date for calculating due dates
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ApplyTemplateRequest>(event)

  if (!body.recitalId || !body.templateId || !body.showDate) {
    throw createError({
      statusCode: 400,
      message: 'Recital ID, template ID, and show date are required'
    })
  }

  const client = getSupabaseClient()

  try {
    // Get the template
    const { data: template, error: templateError } = await client
      .from('recital_task_templates')
      .select('*')
      .eq('id', body.templateId)
      .single()

    if (templateError) throw templateError
    if (!template) {
      throw createError({
        statusCode: 404,
        message: 'Template not found'
      })
    }

    // Calculate base due date from show date and offset
    const showDate = new Date(body.showDate)
    const offsetDays = template.timeline_offset_days || 0
    const baseDueDate = new Date(showDate)
    baseDueDate.setDate(baseDueDate.getDate() + offsetDays)

    // Create tasks from template
    const tasks = template.tasks as Array<{
      title: string
      description?: string
      category?: string
    }>

    const tasksToInsert = tasks.map((task) => ({
      recital_id: body.recitalId,
      title: task.title,
      description: task.description || '',
      category: task.category || template.category,
      priority: 'medium',
      status: 'pending',
      due_date: baseDueDate.toISOString()
    }))

    const { data: createdTasks, error: createError } = await client
      .from('recital_tasks')
      .insert(tasksToInsert)
      .select()

    if (createError) throw createError

    return {
      success: true,
      tasksCreated: createdTasks?.length || 0,
      tasks: createdTasks
    }
  } catch (error: any) {
    console.error('Error applying template:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to apply template'
    })
  }
})
