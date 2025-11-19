// API Endpoint: Get task templates
// Story 2.1.2: Enhanced Recital Checklist System
// Returns all available task templates

import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)

  try {
    const { data: templates, error } = await client
      .from('recital_task_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error

    return templates || []
  } catch (error: any) {
    console.error('Error fetching task templates:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch task templates'
    })
  }
})
