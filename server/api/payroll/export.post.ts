// server/api/payroll/export.post.ts
import { getSupabaseClient } from '../../utils/supabase'

/**
 * Export payroll data to CSV format
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)

    if (!body.payroll_period_id) {
      throw createError({
        statusCode: 400,
        message: 'Payroll period ID is required'
      })
    }

    const exportType = body.export_type || 'csv'

    // Get payroll period
    const { data: period, error: periodError } = await client
      .from('payroll_periods')
      .select('*')
      .eq('id', body.payroll_period_id)
      .single()

    if (periodError || !period) {
      throw createError({
        statusCode: 404,
        message: 'Payroll period not found'
      })
    }

    // Get all pay stubs for this period with teacher details
    const { data: payStubs, error: stubsError } = await client
      .from('payroll_pay_stubs')
      .select(`
        *,
        teacher:teachers(id, first_name, last_name, email, phone)
      `)
      .eq('payroll_period_id', body.payroll_period_id)

    if (stubsError) throw stubsError

    if (!payStubs || payStubs.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'No pay stubs found for this period. Please generate pay stubs first.'
      })
    }

    let exportData = ''
    let fileName = ''
    let mimeType = ''

    if (exportType === 'csv') {
      // Generate CSV
      const headers = [
        'Teacher ID',
        'First Name',
        'Last Name',
        'Email',
        'Regular Hours',
        'Regular Pay',
        'Overtime Hours',
        'Overtime Pay',
        'Bonuses',
        'Deductions',
        'Reimbursements',
        'Gross Pay',
        'Net Pay',
        'Pay Stub Number'
      ]

      const rows = payStubs.map(stub => [
        stub.teacher_id,
        stub.teacher?.first_name || '',
        stub.teacher?.last_name || '',
        stub.teacher?.email || '',
        stub.regular_hours,
        stub.regular_pay,
        stub.overtime_hours,
        stub.overtime_pay,
        stub.total_bonuses,
        stub.total_deductions,
        stub.total_reimbursements,
        stub.gross_pay,
        stub.net_pay,
        stub.stub_number
      ])

      exportData = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      fileName = `payroll_${period.period_name.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`
      mimeType = 'text/csv'
    } else if (exportType === 'quickbooks') {
      // QuickBooks IIF format
      const headers = ['!TIMERHDR', 'DATE', 'JOB', 'EMP', 'ITEM', 'PITEM', 'DURATION', 'RATE', 'AMOUNT', 'NOTE']
      const rows = payStubs.map(stub => [
        'TIMEACT',
        period.end_date,
        'Regular Hours',
        `${stub.teacher?.first_name} ${stub.teacher?.last_name}`,
        'Regular Pay',
        '',
        stub.regular_hours,
        stub.regular_hours > 0 ? (stub.regular_pay / stub.regular_hours).toFixed(2) : 0,
        stub.regular_pay,
        period.period_name
      ])

      exportData = [
        headers.join('\t'),
        ...rows.map(row => row.join('\t'))
      ].join('\n')

      fileName = `payroll_quickbooks_${period.period_name.replace(/\s+/g, '_')}_${new Date().getTime()}.iif`
      mimeType = 'text/plain'
    } else {
      throw createError({
        statusCode: 400,
        message: 'Unsupported export type'
      })
    }

    // Log the export
    await client.from('payroll_export_log').insert({
      payroll_period_id: body.payroll_period_id,
      export_type: exportType,
      file_name: fileName,
      record_count: payStubs.length,
      total_amount: payStubs.reduce((sum, stub) => sum + parseFloat(stub.gross_pay || 0), 0),
      status: 'success'
    })

    // Return the export data
    return {
      success: true,
      data: {
        file_name: fileName,
        mime_type: mimeType,
        content: exportData,
        record_count: payStubs.length
      }
    }
  } catch (error: any) {
    console.error('Export payroll error:', error)

    // Log failed export
    if (body.payroll_period_id) {
      const client = getSupabaseClient()
      await client.from('payroll_export_log').insert({
        payroll_period_id: body.payroll_period_id,
        export_type: body.export_type || 'csv',
        file_name: 'export_failed',
        status: 'failed',
        error_message: error.message
      })
    }

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to export payroll'
    })
  }
})
