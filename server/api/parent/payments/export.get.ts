import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
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
        student:students(id, first_name, last_name)
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
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch payments for export',
      })
    }

    // Generate CSV content
    const csvHeaders = [
      'Date',
      'Receipt #',
      'Student',
      'Description',
      'Type',
      'Amount',
      'Status',
      'Payment Method',
      'Due Date',
      'Paid Date',
    ]

    const csvRows = payments?.map((payment: any) => {
      const studentName = payment.student
        ? `${payment.student.first_name} ${payment.student.last_name}`
        : 'N/A'

      const amount = (payment.amount_cents / 100).toFixed(2)

      return [
        new Date(payment.created_at).toLocaleDateString(),
        payment.receipt_number || '',
        studentName,
        payment.description || '',
        payment.payment_type || '',
        `$${amount}`,
        payment.status || '',
        payment.payment_method || '',
        payment.due_date ? new Date(payment.due_date).toLocaleDateString() : '',
        payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : '',
      ]
    }) || []

    // Combine headers and rows
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row =>
        row.map(cell =>
          // Escape commas and quotes
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
            ? `"${cell.replace(/"/g, '""')}"`
            : cell,
        ).join(','),
      ),
    ].join('\n')

    // Set headers for file download
    setResponseHeaders(event, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="payment-history-${new Date().toISOString().split('T')[0]}.csv"`,
    })

    return csvContent
  } catch (error: any) {
    console.error('Error exporting payments:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to export payments',
    })
  }
})
