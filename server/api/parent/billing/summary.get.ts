/**
 * GET /api/parent/billing/summary
 * Get billing summary for the authenticated parent
 */

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    // Get invoices summary
    const { data: invoices, error: invoicesError } = await client
      .from('invoices')
      .select('total_amount, amount_paid, amount_due, status')
      .eq('parent_user_id', user.id)

    if (invoicesError) {
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`)
    }

    // Get payments summary
    const { data: payments, error: paymentsError } = await client
      .from('payments')
      .select('amount, payment_date')
      .eq('parent_user_id', user.id)
      .eq('payment_status', 'succeeded')
      .gte('payment_date', new Date(new Date().getFullYear(), 0, 1).toISOString()) // This year

    if (paymentsError) {
      throw new Error(`Failed to fetch payments: ${paymentsError.message}`)
    }

    // Calculate totals
    const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
    const totalPending = invoices
      ?.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'refunded')
      .reduce((sum, i) => sum + i.amount_due, 0) || 0
    const totalOverdue = invoices
      ?.filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + i.amount_due, 0) || 0

    // Get upcoming invoice (next due)
    const { data: upcomingInvoice } = await client
      .from('invoices')
      .select('id, invoice_number, due_date, total_amount, amount_due')
      .eq('parent_user_id', user.id)
      .in('status', ['sent', 'viewed'])
      .order('due_date', { ascending: true })
      .limit(1)
      .single()

    // Get auto-pay status
    const { data: billingSchedule } = await client
      .from('billing_schedules')
      .select('is_active, next_billing_date, autopay_discount_percentage')
      .eq('parent_user_id', user.id)
      .eq('is_active', true)
      .single()

    // Get studio credit balance
    const { data: studioCredit } = await client
      .from('studio_credits')
      .select('available_credit')
      .eq('parent_user_id', user.id)
      .single()

    return {
      success: true,
      data: {
        total_paid: totalPaid,
        total_pending: totalPending,
        total_overdue: totalOverdue,
        upcoming_invoice: upcomingInvoice || null,
        autopay_enabled: !!billingSchedule,
        autopay_discount: billingSchedule?.autopay_discount_percentage || 0,
        next_billing_date: billingSchedule?.next_billing_date || null,
        studio_credit: studioCredit?.available_credit || 0,
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch billing summary: ${error.message}`,
    })
  }
})
