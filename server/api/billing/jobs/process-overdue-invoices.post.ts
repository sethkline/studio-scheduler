/**
 * POST /api/billing/jobs/process-overdue-invoices
 * Mark overdue invoices and send payment reminders
 * Should be run daily
 */

import { sendPaymentReminderEmail } from '~/server/utils/emailTemplates'
import { calculateLateFee } from '~/server/utils/invoiceUtils'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  const results = {
    success: true,
    invoices_marked_overdue: 0,
    late_fees_applied: 0,
    reminders_sent: 0,
    reminders_failed: 0,
    errors: [] as any[],
  }

  try {
    // Mark invoices as overdue
    const { data: overdueInvoices, error: overdueError } = await client
      .from('invoices')
      .select('*')
      .lt('due_date', today)
      .in('status', ['sent', 'viewed', 'partial_paid'])
      .gt('amount_due', 0)

    if (overdueError) {
      throw new Error(`Failed to fetch overdue invoices: ${overdueError.message}`)
    }

    if (overdueInvoices && overdueInvoices.length > 0) {
      const overdueIds = overdueInvoices.map(inv => inv.id)

      const { error: updateError } = await client
        .from('invoices')
        .update({ status: 'overdue' })
        .in('id', overdueIds)

      if (updateError) {
        console.error('Failed to mark invoices overdue:', updateError)
      } else {
        results.invoices_marked_overdue = overdueIds.length
      }
    }

    // Get all overdue invoices for reminder processing
    const { data: allOverdueInvoices, error: allOverdueError } = await client
      .from('invoices')
      .select(`
        *,
        parent:profiles!invoices_parent_user_id_fkey(user_id, full_name, email)
      `)
      .eq('status', 'overdue')
      .gt('amount_due', 0)

    if (allOverdueError) {
      throw new Error(`Failed to fetch all overdue invoices: ${allOverdueError.message}`)
    }

    if (!allOverdueInvoices || allOverdueInvoices.length === 0) {
      return {
        ...results,
        message: 'No overdue invoices to process',
      }
    }

    // Process each overdue invoice
    for (const invoice of allOverdueInvoices) {
      try {
        const dueDate = new Date(invoice.due_date)
        const currentDate = new Date(today)
        const daysOverdue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

        // Apply late fee if not already applied and grace period has passed
        const gracePeriodDays = 3
        if (daysOverdue > gracePeriodDays && !invoice.late_fee_applied_at) {
          const lateFeePercentage = 5 // 5% late fee
          const lateFlatFee = 10 // $10 flat late fee
          const lateFee = calculateLateFee(invoice.amount_due, daysOverdue, lateFeePercentage, lateFlatFee)

          // Record late fee penalty
          await client
            .from('late_payment_penalties')
            .insert({
              invoice_id: invoice.id,
              penalty_amount: lateFee,
              days_overdue: daysOverdue,
              penalty_percentage: lateFeePercentage,
              penalty_flat_fee: lateFlatFee,
            })

          // Update invoice with late fee
          await client
            .from('invoices')
            .update({
              late_fee_applied: lateFee,
              late_fee_applied_at: new Date().toISOString(),
              total_amount: invoice.total_amount + lateFee,
              amount_due: invoice.amount_due + lateFee,
            })
            .eq('id', invoice.id)

          results.late_fees_applied++
        }

        // Determine reminder type based on days overdue
        let reminderType = ''
        let shouldSendReminder = false

        if (daysOverdue === 0) {
          // Due today
          reminderType = 'due'
          shouldSendReminder = true
        } else if (daysOverdue === 3) {
          reminderType = 'overdue_3'
          shouldSendReminder = true
        } else if (daysOverdue === 7) {
          reminderType = 'overdue_7'
          shouldSendReminder = true
        } else if (daysOverdue === 14) {
          reminderType = 'overdue_14'
          shouldSendReminder = true
        } else if (daysOverdue === 30) {
          reminderType = 'final_notice'
          shouldSendReminder = true
        }

        // Check if reminder already sent for this type
        if (shouldSendReminder) {
          const { data: existingReminder } = await client
            .from('payment_reminders')
            .select('id')
            .eq('invoice_id', invoice.id)
            .eq('reminder_type', reminderType)
            .eq('reminder_status', 'sent')
            .single()

          if (existingReminder) {
            // Already sent this type of reminder
            continue
          }

          // Create reminder record
          const { data: reminder, error: reminderError } = await client
            .from('payment_reminders')
            .insert({
              invoice_id: invoice.id,
              parent_user_id: invoice.parent_user_id,
              reminder_type: reminderType,
              days_overdue: daysOverdue,
              reminder_status: 'scheduled',
              scheduled_for: new Date().toISOString(),
              email_subject: `Payment Reminder - Invoice ${invoice.invoice_number}`,
            })
            .select()
            .single()

          if (reminderError) {
            console.error('Failed to create reminder:', reminderError)
            results.errors.push({
              invoice_id: invoice.id,
              error: `Failed to create reminder: ${reminderError.message}`,
            })
            results.reminders_failed++
            continue
          }

          // Send reminder email
          try {
            await sendPaymentReminderEmail({
              invoice,
              parentEmail: invoice.parent.email,
              parentName: invoice.parent.full_name,
              reminderType,
              daysOverdue,
            })

            // Mark reminder as sent
            await client
              .from('payment_reminders')
              .update({
                reminder_status: 'sent',
                sent_at: new Date().toISOString(),
              })
              .eq('id', reminder.id)

            results.reminders_sent++

          } catch (emailError: any) {
            console.error('Failed to send reminder email:', emailError)

            // Mark reminder as failed
            await client
              .from('payment_reminders')
              .update({
                reminder_status: 'failed',
              })
              .eq('id', reminder.id)

            results.errors.push({
              invoice_id: invoice.id,
              error: `Failed to send email: ${emailError.message}`,
            })
            results.reminders_failed++
          }
        }

      } catch (error: any) {
        results.errors.push({
          invoice_id: invoice.id,
          error: error.message,
        })
        results.reminders_failed++
      }
    }

    return {
      ...results,
      message: `Processed ${allOverdueInvoices.length} overdue invoices. Sent ${results.reminders_sent} reminders, applied ${results.late_fees_applied} late fees.`,
    }

  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to process overdue invoices: ${error.message}`,
    })
  }
})
