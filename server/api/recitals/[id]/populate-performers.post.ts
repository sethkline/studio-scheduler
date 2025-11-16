import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const recitalId = getRouterParam(event, 'id')
  const body = await readBody(event)

  const {
    include_all_enrollments = true,
    class_instance_ids = [],
    apply_eligibility_rules = true,
  } = body

  try {
    // Get all recital performances for this recital
    const { data: performances, error: perfError } = await client
      .from('recital_performances')
      .select('id, class_instance_id')
      .eq('recital_id', recitalId)

    if (perfError) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch performances' })

    // Get enrollments for the classes in this recital
    let enrollmentsQuery = client
      .from('class_enrollments')
      .select(`
        student_id,
        class_instance_id,
        students(id, first_name, last_name, date_of_birth)
      `)
      .eq('status', 'active')

    if (class_instance_ids.length > 0) {
      enrollmentsQuery = enrollmentsQuery.in('class_instance_id', class_instance_ids)
    } else if (performances && performances.length > 0) {
      const classIds = performances.map(p => p.class_instance_id).filter(Boolean)
      enrollmentsQuery = enrollmentsQuery.in('class_instance_id', classIds)
    }

    const { data: enrollments, error: enrollError } = await enrollmentsQuery

    if (enrollError) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch enrollments' })

    let eligibleCount = 0
    let ineligibleCount = 0
    const ineligibleDetails: any[] = []
    const confirmationsToCreate: any[] = []

    // For each enrollment, create confirmation records for matching performances
    for (const enrollment of enrollments || []) {
      const matchingPerformances = performances?.filter(
        p => p.class_instance_id === enrollment.class_instance_id
      ) || []

      for (const performance of matchingPerformances) {
        // Check if confirmation already exists
        const { data: existing } = await client
          .from('recital_performer_confirmations')
          .select('id')
          .eq('recital_id', recitalId)
          .eq('student_id', enrollment.student_id)
          .eq('recital_performance_id', performance.id)
          .single()

        if (!existing) {
          // TODO: Apply eligibility rules if apply_eligibility_rules is true
          const isEligible = true // Placeholder
          const eligibilityNotes = null

          confirmationsToCreate.push({
            recital_id: recitalId,
            student_id: enrollment.student_id,
            recital_performance_id: performance.id,
            status: 'pending',
            is_eligible: isEligible,
            eligibility_notes: eligibilityNotes,
            reminder_sent_count: 0,
          })

          if (isEligible) {
            eligibleCount++
          } else {
            ineligibleCount++
            ineligibleDetails.push({
              student_id: enrollment.student_id,
              student_name: `${(enrollment.students as any)?.first_name} ${(enrollment.students as any)?.last_name}`,
              class_name: 'Class', // TODO: Join class name
              reason: eligibilityNotes || 'Unknown',
            })
          }
        }
      }
    }

    // Bulk insert confirmations
    if (confirmationsToCreate.length > 0) {
      const { error: insertError } = await client
        .from('recital_performer_confirmations')
        .insert(confirmationsToCreate)

      if (insertError) throw createError({ statusCode: 500, statusMessage: 'Failed to create confirmations' })
    }

    return {
      created_confirmations: confirmationsToCreate.length,
      eligible_performers: eligibleCount,
      ineligible_performers: ineligibleCount,
      ineligible_details: ineligibleDetails,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to populate performers',
    })
  }
})
