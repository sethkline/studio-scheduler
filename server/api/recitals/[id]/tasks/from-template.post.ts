import { getSupabaseClient } from '~/server/utils/supabase'

/**
 * Create Tasks from Template
 *
 * POST /api/recitals/:id/tasks/from-template
 *
 * Creates multiple tasks from a template.
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const recitalShowId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!body.template_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Template ID is required'
    })
  }

  if (!body.show_date) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Show date is required'
    })
  }

  try {
    // Fetch template with items
    const { data: template, error: templateError } = await client
      .from('task_templates')
      .select(`
        *,
        items:task_template_items(*)
      `)
      .eq('id', body.template_id)
      .single()

    if (templateError || !template) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Template not found'
      })
    }

    // Create tasks from template items
    const showDate = new Date(body.show_date)
    const tasks = (template.items || []).map((item: any) => {
      // Calculate due date based on template's days_before_show
      let dueDate = null
      if (item.default_days_before_show) {
        const calculatedDate = new Date(showDate)
        calculatedDate.setDate(showDate.getDate() - item.default_days_before_show)
        dueDate = calculatedDate.toISOString().split('T')[0]
      }

      return {
        recital_show_id: recitalShowId,
        title: item.title,
        description: item.description,
        category: item.category,
        priority: item.priority,
        status: 'not-started',
        due_date: dueDate,
        estimated_hours: item.estimated_hours,
        assigned_to_role: item.default_assigned_to_role,
        is_template: false,
      }
    })

    // Insert all tasks
    const { data: createdTasks, error: insertError } = await client
      .from('recital_tasks')
      .insert(tasks)
      .select()

    if (insertError) {
      console.error('Database error creating tasks from template:', insertError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create tasks from template'
      })
    }

    return {
      message: `Successfully created ${createdTasks?.length || 0} tasks from template`,
      tasks: createdTasks
    }
  } catch (error: any) {
    console.error('Error creating tasks from template:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create tasks from template'
    })
  }
})
