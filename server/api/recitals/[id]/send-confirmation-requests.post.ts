import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const recitalId = getRouterParam(event, 'id')
  const body = await readBody(event)

  const {
    send_to = 'all',
    student_ids = [],
    send_via = ['email'],
    confirmation_deadline,
  } = body

  try {
    // Get confirmations to send requests for
    let query = client
      .from('recital_performer_confirmations')
      .select(`
        *,
        student:students(id, first_name, last_name, guardians(id, email, phone_number, profiles(id, first_name, last_name, email))),
        performance:recital_performances(id, name)
      `)
      .eq('recital_id', recitalId)

    if (send_to === 'pending_only') {
      query = query.eq('status', 'pending')
    } else if (send_to === 'specific_students') {
      query = query.in('student_id', student_ids)
    }

    const { data: confirmations, error } = await query

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch confirmations' })

    // Update confirmation deadline if provided
    if (confirmation_deadline && confirmations && confirmations.length > 0) {
      const confirmationIds = confirmations.map(c => c.id)
      await client
        .from('recital_performer_confirmations')
        .update({ confirmation_deadline })
        .in('id', confirmationIds)
    }

    let emailsSent = 0
    let smsSent = 0
    let failed = 0

    // Group confirmations by guardian
    const byGuardian = new Map<string, any>()
    confirmations?.forEach(c => {
      const guardians = (c.student as any)?.guardians || []
      guardians.forEach((g: any) => {
        const guardianId = g.id
        const email = g.profiles?.email || g.email
        if (!byGuardian.has(guardianId)) {
          byGuardian.set(guardianId, {
            guardian_id: guardianId,
            email,
            phone: g.phone_number,
            name: `${g.profiles?.first_name} ${g.profiles?.last_name}`,
            confirmations: [],
          })
        }
        byGuardian.get(guardianId).confirmations.push(c)
      })
    })

    // Send emails/SMS
    for (const [guardianId, guardianData] of byGuardian) {
      const studentNames = guardianData.confirmations
        .map((c: any) => `${c.student?.first_name} ${c.student?.last_name}`)
        .filter((v: any, i: any, a: any) => a.indexOf(v) === i)
        .join(', ')

      const performanceCount = guardianData.confirmations.length

      if (send_via.includes('email') && guardianData.email) {
        try {
          // TODO: Send email via Mailgun
          // For now, just log the participation request
          await client.from('recital_participation_requests').insert(
            guardianData.confirmations.map((c: any) => ({
              recital_id: recitalId,
              student_id: c.student_id,
              guardian_id: guardianId,
              request_type: 'initial',
              sent_via: 'email',
              sent_at: new Date().toISOString(),
            }))
          )

          // Update reminder count
          await client
            .from('recital_performer_confirmations')
            .update({
              reminder_sent_count: client.raw('reminder_sent_count + 1'),
              last_reminder_sent: new Date().toISOString(),
            })
            .in(
              'id',
              guardianData.confirmations.map((c: any) => c.id)
            )

          emailsSent++
        } catch (error) {
          console.error('Failed to send email:', error)
          failed++
        }
      }

      if (send_via.includes('sms') && guardianData.phone) {
        // TODO: Send SMS via Twilio
        smsSent++
      }
    }

    return {
      emails_sent: emailsSent,
      sms_sent: smsSent,
      failed,
      total_requests: byGuardian.size,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to send confirmation requests',
    })
  }
})
