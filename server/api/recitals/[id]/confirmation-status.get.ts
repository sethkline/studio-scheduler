import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const recitalId = getRouterParam(event, 'id')

  try {
    // Get all confirmations with related data
    const { data: confirmations, error } = await client
      .from('recital_performer_confirmations')
      .select(`
        *,
        student:students(id, first_name, last_name),
        performance:recital_performances(id, name, class_instance_id, class_instances(name)),
        guardian:profiles!recital_performer_confirmations_guardian_id_fkey(id, first_name, last_name, email)
      `)
      .eq('recital_id', recitalId)

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch confirmations' })

    // Get recital with deadline
    const { data: recital } = await client
      .from('recitals')
      .select('confirmation_deadline')
      .eq('id', recitalId)
      .single()

    const totalPerformers = confirmations?.length || 0
    const confirmed = confirmations?.filter(c => c.status === 'confirmed').length || 0
    const declined = confirmations?.filter(c => c.status === 'declined').length || 0
    const pending = confirmations?.filter(c => c.status === 'pending').length || 0

    const deadline = recital?.confirmation_deadline
    const daysUntilDeadline = deadline
      ? Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : undefined

    const summary = {
      total_performers: totalPerformers,
      confirmed,
      declined,
      pending,
      confirmation_rate: totalPerformers > 0 ? (confirmed / totalPerformers) * 100 : 0,
      deadline,
      days_until_deadline: daysUntilDeadline,
    }

    // Group by class
    const byClassMap = new Map<string, any>()
    confirmations?.forEach(c => {
      const className = (c.performance as any)?.class_instances?.name || 'Unknown Class'
      if (!byClassMap.has(className)) {
        byClassMap.set(className, {
          class_name: className,
          total: 0,
          confirmed: 0,
          pending: 0,
          declined: 0,
        })
      }
      const classData = byClassMap.get(className)
      classData.total++
      if (c.status === 'confirmed') classData.confirmed++
      if (c.status === 'pending') classData.pending++
      if (c.status === 'declined') classData.declined++
    })

    // Group by performance
    const byPerformanceMap = new Map<string, any>()
    confirmations?.forEach(c => {
      const perfId = c.recital_performance_id
      const perfName = (c.performance as any)?.name || 'Unknown Performance'
      if (!byPerformanceMap.has(perfId)) {
        byPerformanceMap.set(perfId, {
          performance_id: perfId,
          performance_name: perfName,
          confirmed_count: 0,
          pending_count: 0,
        })
      }
      const perfData = byPerformanceMap.get(perfId)
      if (c.status === 'confirmed') perfData.confirmed_count++
      if (c.status === 'pending') perfData.pending_count++
    })

    // Get pending confirmations grouped by student
    const pendingByStudent = new Map<string, any>()
    confirmations
      ?.filter(c => c.status === 'pending')
      .forEach(c => {
        const studentId = c.student_id
        if (!pendingByStudent.has(studentId)) {
          pendingByStudent.set(studentId, {
            student_id: studentId,
            student_name: `${(c.student as any)?.first_name} ${(c.student as any)?.last_name}`,
            guardian_name: c.guardian ? `${(c.guardian as any)?.first_name} ${(c.guardian as any)?.last_name}` : undefined,
            guardian_email: (c.guardian as any)?.email,
            performances: [],
            reminders_sent: c.reminder_sent_count,
            last_reminder: c.last_reminder_sent,
          })
        }
        const studentData = pendingByStudent.get(studentId)
        studentData.performances.push((c.performance as any)?.name || 'Unknown')
      })

    return {
      summary,
      by_class: Array.from(byClassMap.values()),
      by_performance: Array.from(byPerformanceMap.values()),
      pending_confirmations: Array.from(pendingByStudent.values()),
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch confirmation status',
    })
  }
})
