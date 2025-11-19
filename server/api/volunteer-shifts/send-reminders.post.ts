// API Endpoint: Send reminder emails to volunteers
// Story 2.1.5: Volunteer Coordination Center
// Sends reminder emails for upcoming shifts (within 24 hours)

import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const config = useRuntimeConfig()
  const client = await getUserSupabaseClient(event)

  try {
    // Calculate the time window (next 24-48 hours)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter = new Date(now)
    dayAfter.setDate(dayAfter.getDate() + 2)

    // Get shifts happening tomorrow that haven't had reminders sent
    const { data: upcomingShifts, error: shiftsError } = await client
      .from('volunteer_shifts')
      .select(`
        *,
        volunteer_signups!inner (
          id,
          reminder_sent_at,
          profiles:parent_id (
            id,
            full_name,
            email
          )
        )
      `)
      .gte('shift_date', tomorrow.toISOString().split('T')[0])
      .lt('shift_date', dayAfter.toISOString().split('T')[0])

    if (shiftsError) throw shiftsError

    if (!upcomingShifts || upcomingShifts.length === 0) {
      return {
        success: true,
        remindersSent: 0,
        message: 'No upcoming shifts requiring reminders'
      }
    }

    // Get email template
    const { data: template } = await client
      .from('volunteer_email_templates')
      .select('*')
      .eq('template_type', 'reminder')
      .single()

    const mailgun = {
      apiKey: config.mailgunApiKey,
      domain: config.mailgunDomain
    }

    let remindersSent = 0

    // Send reminders
    for (const shift of upcomingShifts) {
      for (const signup of shift.volunteer_signups) {
        // Skip if reminder already sent
        if (signup.reminder_sent_at) continue

        const volunteer = signup.profiles
        if (!volunteer || !volunteer.email) continue

        // Replace template variables
        const emailBody = template?.body_html
          ?.replace(/{{volunteer_name}}/g, volunteer.full_name || 'Volunteer')
          ?.replace(/{{recital_name}}/g, 'Upcoming Recital')
          ?.replace(/{{shift_role}}/g, shift.role)
          ?.replace(/{{shift_date}}/g, new Date(shift.shift_date).toLocaleDateString())
          ?.replace(/{{start_time}}/g, shift.start_time || '')
          ?.replace(/{{end_time}}/g, shift.end_time || '')
          ?.replace(/{{location}}/g, shift.location || 'Venue')
          ?.replace(/{{instructions}}/g, shift.instructions || '')

        // Send email using Mailgun (simplified - would need actual Mailgun integration)
        try {
          // TODO: Integrate with Mailgun API
          console.log(`Would send reminder to ${volunteer.email} for shift ${shift.role}`)

          // Mark reminder as sent
          await client
            .from('volunteer_signups')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', signup.id)

          remindersSent++
        } catch (emailError) {
          console.error(`Failed to send reminder to ${volunteer.email}:`, emailError)
        }
      }
    }

    return {
      success: true,
      remindersSent,
      shiftsProcessed: upcomingShifts.length
    }
  } catch (error: any) {
    console.error('Error sending reminders:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to send reminders'
    })
  }
})
