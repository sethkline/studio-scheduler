import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const recitalId = getRouterParam(event, 'id')

  try {
    // Get all performances with confirmed performers
    const { data: performances, error } = await client
      .from('recital_performances')
      .select(`
        id,
        name,
        song_title,
        performance_order,
        confirmations:recital_performer_confirmations(
          id,
          status,
          student:students(id, first_name, last_name, date_of_birth)
        )
      `)
      .eq('recital_id', recitalId)
      .order('performance_order')

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch performances' })

    const formattedPerformances = performances?.map(p => ({
      performance_id: p.id,
      performance_order: p.performance_order,
      performance_name: p.name,
      song_title: p.song_title,
      performers: (p.confirmations as any[])
        ?.filter(c => c.status === 'confirmed')
        .map(c => {
          const student = c.student as any
          const age = student?.date_of_birth
            ? Math.floor(
                (new Date().getTime() - new Date(student.date_of_birth).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000)
              )
            : null

          return {
            student_id: student?.id,
            first_name: student?.first_name,
            last_name: student?.last_name,
            age,
            confirmation_status: c.status,
          }
        })
        .sort((a, b) => a.last_name.localeCompare(b.last_name)) || [],
      confirmed_count: (p.confirmations as any[])?.filter(c => c.status === 'confirmed').length || 0,
    }))

    return { performances: formattedPerformances }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch performer roster',
    })
  }
})
