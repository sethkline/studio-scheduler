import { getSupabaseClient } from '../../../utils/supabase'
import type { PaymentHistoryResponse, PaymentSummary, PaymentWithRelations } from '~/types/payments'

export default defineEventHandler(async (event): Promise<PaymentHistoryResponse> => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    // Get query parameters for filtering
    const query = getQuery(event)
    const studentId = query.student_id as string | undefined
    const paymentType = query.payment_type as string | undefined
    const status = query.status as string | undefined
    const startDate = query.start_date as string | undefined
    const endDate = query.end_date as string | undefined

    // Get guardian record for this user
    const { data: guardian, error: guardianError } = await client
      .from('guardians')
      .select('id, first_name, last_name')
      .eq('user_id', user.id)
      .single()

    if (guardianError || !guardian) {
      throw createError({
        statusCode: 404,
        message: 'Guardian profile not found',
      })
    }

    // Build query with filters
    let paymentsQuery = client
      .from('payments')
      .select(`
        *,
        student:students(id, first_name, last_name),
        guardian:guardians(id, first_name, last_name)
      `)
      .eq('guardian_id', guardian.id)

    // Apply filters
    if (studentId) {
      paymentsQuery = paymentsQuery.eq('student_id', studentId)
    }
    if (paymentType) {
      paymentsQuery = paymentsQuery.eq('payment_type', paymentType)
    }
    if (status) {
      paymentsQuery = paymentsQuery.eq('status', status)
    }
    if (startDate) {
      paymentsQuery = paymentsQuery.gte('created_at', startDate)
    }
    if (endDate) {
      paymentsQuery = paymentsQuery.lte('created_at', endDate)
    }

    // Order by most recent first
    paymentsQuery = paymentsQuery.order('created_at', { ascending: false })

    const { data: payments, error: paymentsError } = await paymentsQuery

    if (paymentsError) {
      // If payments table doesn't exist yet, return empty array
      console.warn('Payments table may not exist:', paymentsError)
      return {
        payments: [],
        summary: {
          total_paid: 0,
          total_pending: 0,
          total_overdue: 0,
          total_due: 0,
          payment_count: 0,
        },
      }
    }

    const paymentsWithRelations: PaymentWithRelations[] = payments || []

    // Calculate summary
    const totalPaid = paymentsWithRelations
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount_cents || 0), 0)

    const totalPending = paymentsWithRelations
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount_cents || 0), 0)

    const totalOverdue = paymentsWithRelations
      .filter((p) => p.status === 'overdue')
      .reduce((sum, p) => sum + (p.amount_cents || 0), 0)

    // Find next due date and last payment date
    const paidPayments = paymentsWithRelations.filter((p) => p.status === 'paid' && p.paid_at)
    const lastPaymentDate = paidPayments.length > 0
      ? paidPayments.reduce((latest, p) =>
          (p.paid_at && (!latest || p.paid_at > latest)) ? p.paid_at : latest,
        '', )
      : undefined

    const upcomingPayments = paymentsWithRelations
      .filter((p) => (p.status === 'pending' || p.status === 'overdue') && p.due_date)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))

    const nextDueDate = upcomingPayments.length > 0 ? upcomingPayments[0].due_date : undefined

    const summary: PaymentSummary = {
      total_paid: totalPaid,
      total_pending: totalPending,
      total_overdue: totalOverdue,
      total_due: totalPending + totalOverdue,
      payment_count: paymentsWithRelations.length,
      last_payment_date: lastPaymentDate,
      next_due_date: nextDueDate,
    }

    return {
      payments: paymentsWithRelations,
      summary,
    }
  } catch (error: any) {
    console.error('Error fetching payments:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch payments',
    })
  }
})
