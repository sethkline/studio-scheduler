import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const recitalShowId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!body.title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Shift title is required' })
  }

  try {
    const { data: shift, error } = await client
      .from('volunteer_shifts')
      .insert([{
        recital_show_id: recitalShowId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        role: body.role,
        location: body.location || null,
        date: body.date,
        start_time: body.start_time,
        end_time: body.end_time,
        slots_total: body.slots_total,
        slots_filled: 0,
        status: 'open',
        requirements: body.requirements || null,
      }])
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to create shift' })

    return { message: 'Shift created successfully', shift }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to create shift' })
  }
})
