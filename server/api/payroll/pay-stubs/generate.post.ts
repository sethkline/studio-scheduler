// server/api/payroll/pay-stubs/generate.post.ts
import { getSupabaseClient } from '../../../utils/supabase'

/**
 * Generate pay stubs for a payroll period
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

    // Get payroll period details
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

    // Get all time entries for this period, grouped by teacher
    const { data: timeEntries, error: entriesError } = await client
      .from('payroll_time_entries')
      .select('*')
      .eq('payroll_period_id', body.payroll_period_id)

    if (entriesError) throw entriesError

    // Get all adjustments for this period, grouped by teacher
    const { data: adjustments, error: adjustmentsError } = await client
      .from('payroll_adjustments')
      .select('*')
      .eq('payroll_period_id', body.payroll_period_id)

    if (adjustmentsError) throw adjustmentsError

    // Group by teacher
    const teacherMap = new Map()

    // Process time entries
    timeEntries?.forEach(entry => {
      if (!teacherMap.has(entry.teacher_id)) {
        teacherMap.set(entry.teacher_id, {
          teacher_id: entry.teacher_id,
          regular_hours: 0,
          regular_pay: 0,
          overtime_hours: 0,
          overtime_pay: 0,
          total_bonuses: 0,
          total_deductions: 0,
          total_reimbursements: 0
        })
      }

      const summary = teacherMap.get(entry.teacher_id)
      summary.regular_hours += parseFloat(entry.regular_hours || 0)
      summary.regular_pay += parseFloat(entry.regular_pay || 0)
      summary.overtime_hours += parseFloat(entry.overtime_hours || 0)
      summary.overtime_pay += parseFloat(entry.overtime_pay || 0)
    })

    // Process adjustments
    adjustments?.forEach(adj => {
      if (!teacherMap.has(adj.teacher_id)) {
        teacherMap.set(adj.teacher_id, {
          teacher_id: adj.teacher_id,
          regular_hours: 0,
          regular_pay: 0,
          overtime_hours: 0,
          overtime_pay: 0,
          total_bonuses: 0,
          total_deductions: 0,
          total_reimbursements: 0
        })
      }

      const summary = teacherMap.get(adj.teacher_id)
      const amount = parseFloat(adj.amount || 0)

      if (adj.adjustment_type === 'bonus') {
        summary.total_bonuses += amount
      } else if (adj.adjustment_type === 'deduction') {
        summary.total_deductions += amount
      } else if (adj.adjustment_type === 'reimbursement') {
        summary.total_reimbursements += amount
      }
    })

    // Filter by teacher_ids if provided
    const teacherIds = body.teacher_ids || Array.from(teacherMap.keys())

    // Generate pay stubs
    const payStubs = []
    for (const teacherId of teacherIds) {
      const summary = teacherMap.get(teacherId)
      if (!summary) continue

      // Check if pay stub already exists
      const { data: existingStub } = await client
        .from('payroll_pay_stubs')
        .select('id')
        .eq('payroll_period_id', body.payroll_period_id)
        .eq('teacher_id', teacherId)
        .single()

      if (existingStub) {
        // Update existing stub
        const gross_pay = summary.regular_pay + summary.overtime_pay + summary.total_bonuses + summary.total_reimbursements
        const net_pay = gross_pay - summary.total_deductions

        const { data: updatedStub, error: updateError } = await client
          .from('payroll_pay_stubs')
          .update({
            regular_hours: summary.regular_hours,
            regular_pay: summary.regular_pay,
            overtime_hours: summary.overtime_hours,
            overtime_pay: summary.overtime_pay,
            total_bonuses: summary.total_bonuses,
            total_deductions: summary.total_deductions,
            total_reimbursements: summary.total_reimbursements,
            gross_pay: gross_pay,
            net_pay: net_pay,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStub.id)
          .select()
          .single()

        if (updateError) throw updateError
        payStubs.push(updatedStub)
      } else {
        // Create new stub
        const gross_pay = summary.regular_pay + summary.overtime_pay + summary.total_bonuses + summary.total_reimbursements
        const net_pay = gross_pay - summary.total_deductions

        const { data: newStub, error: insertError } = await client
          .from('payroll_pay_stubs')
          .insert({
            payroll_period_id: body.payroll_period_id,
            teacher_id: teacherId,
            regular_hours: summary.regular_hours,
            regular_pay: summary.regular_pay,
            overtime_hours: summary.overtime_hours,
            overtime_pay: summary.overtime_pay,
            total_bonuses: summary.total_bonuses,
            total_deductions: summary.total_deductions,
            total_reimbursements: summary.total_reimbursements,
            gross_pay: gross_pay,
            net_pay: net_pay,
            status: 'generated'
          })
          .select()
          .single()

        if (insertError) throw insertError
        payStubs.push(newStub)
      }
    }

    return {
      success: true,
      message: `Generated ${payStubs.length} pay stubs`,
      data: {
        pay_stubs_created: payStubs.length,
        pay_stubs: payStubs
      }
    }
  } catch (error: any) {
    console.error('Generate pay stubs error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to generate pay stubs'
    })
  }
})
