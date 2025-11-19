import { requireAuth, requireRole } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireRole(event, ['parent', 'admin', 'staff'])

  const client = await getUserSupabaseClient(event)
  const studentId = getRouterParam(event, 'id')
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    // Verify parent has access to this student
    const { data: guardianship } = await client
      .from('guardians')
      .select('id')
      .eq('student_id', studentId)
      .eq('user_id', user.id)
      .single()

    if (!guardianship) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    // Get student info
    const { data: student } = await client
      .from('students')
      .select('id, first_name, last_name')
      .eq('id', studentId)
      .single()

    // Get all confirmations for active recitals
    const { data: confirmations, error } = await client
      .from('recital_performer_confirmations')
      .select(`
        id,
        status,
        confirmation_date,
        confirmation_deadline,
        notes,
        recital_id,
        recital_performance_id,
        recital:recitals(id, name, date),
        performance:recital_performances(
          id,
          name,
          song_title,
          performance_order,
          estimated_time,
          costume_notes,
          notes,
          class_instance:class_instances(id, name)
        )
      `)
      .eq('student_id', studentId)
      .order('confirmation_deadline')

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch confirmations' })

    // Group by recital
    const byRecital = new Map<string, any>()

    confirmations?.forEach(c => {
      const recitalId = c.recital_id
      if (!byRecital.has(recitalId)) {
        byRecital.set(recitalId, {
          student,
          recital: c.recital,
          performances: [],
          pending_count: 0,
          confirmed_count: 0,
          all_confirmed: true,
        })
      }

      const recitalData = byRecital.get(recitalId)

      const daysUntilDeadline = c.confirmation_deadline
        ? Math.ceil(
            (new Date(c.confirmation_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        : null

      recitalData.performances.push({
        confirmation_id: c.id,
        performance_id: c.recital_performance_id,
        performance_name: (c.performance as any)?.name,
        class_name: (c.performance as any)?.class_instance?.name,
        song_title: (c.performance as any)?.song_title,
        performance_order: (c.performance as any)?.performance_order,
        estimated_time: (c.performance as any)?.estimated_time,
        status: c.status,
        confirmation_date: c.confirmation_date,
        confirmation_deadline: c.confirmation_deadline,
        days_until_deadline: daysUntilDeadline,
        costume_info: (c.performance as any)?.costume_notes,
        notes: (c.performance as any)?.notes,
      })

      if (c.status === 'pending') {
        recitalData.pending_count++
        recitalData.all_confirmed = false
      } else if (c.status === 'confirmed') {
        recitalData.confirmed_count++
      }
    })

    // Return first recital data (or all if needed)
    const recitalData = Array.from(byRecital.values())[0] || {
      student,
      recital: null,
      performances: [],
      pending_count: 0,
      confirmed_count: 0,
      all_confirmed: true,
    }

    return recitalData
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch confirmations',
    })
  }
})
