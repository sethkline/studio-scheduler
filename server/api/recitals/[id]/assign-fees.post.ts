import { getSupabaseClient } from '~/server/utils/supabase'

/**
 * Assign Fees to Students
 *
 * POST /api/recitals/:id/assign-fees
 *
 * Assigns a fee type to multiple students.
 *
 * @body {
 *   fee_type_id: string
 *   student_ids: string[]
 *   custom_amount_in_cents?: number
 *   custom_due_date?: string (ISO date)
 * }
 *
 * @returns {
 *   message: string
 *   assigned_count: number
 *   student_fees: StudentRecitalFee[]
 * }
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const recitalShowId = getRouterParam(event, 'id')
  const body = await readBody(event)

  // Validate required fields
  if (!body.fee_type_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Fee type ID is required'
    })
  }

  if (!body.student_ids || !Array.isArray(body.student_ids) || body.student_ids.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one student ID is required'
    })
  }

  try {
    // Fetch fee type details
    const { data: feeType, error: feeTypeError } = await client
      .from('recital_fee_types')
      .select('*')
      .eq('id', body.fee_type_id)
      .single()

    if (feeTypeError || !feeType) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Fee type not found'
      })
    }

    // Check which students already have this fee assigned
    const { data: existingFees } = await client
      .from('student_recital_fees')
      .select('student_id')
      .eq('recital_show_id', recitalShowId)
      .eq('fee_type_id', body.fee_type_id)
      .in('student_id', body.student_ids)

    const existingStudentIds = existingFees?.map(f => f.student_id) || []
    const newStudentIds = body.student_ids.filter(id => !existingStudentIds.includes(id))

    if (newStudentIds.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'All selected students already have this fee assigned'
      })
    }

    // Determine amount and due date
    const totalAmount = body.custom_amount_in_cents ?? feeType.default_amount_in_cents
    const dueDate = body.custom_due_date ?? feeType.due_date

    // Prepare student fee records
    const studentFees = newStudentIds.map(studentId => ({
      student_id: studentId,
      recital_show_id: recitalShowId,
      fee_type_id: body.fee_type_id,
      total_amount_in_cents: totalAmount,
      amount_paid_in_cents: 0,
      balance_in_cents: totalAmount,
      due_date: dueDate,
      status: 'pending',
    }))

    // Insert student fees
    const { data: insertedFees, error: insertError } = await client
      .from('student_recital_fees')
      .insert(studentFees)
      .select()

    if (insertError) {
      console.error('Database error assigning fees:', insertError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to assign fees'
      })
    }

    return {
      message: `Successfully assigned fees to ${newStudentIds.length} student${newStudentIds.length !== 1 ? 's' : ''}`,
      assigned_count: newStudentIds.length,
      student_fees: insertedFees
    }
  } catch (error: any) {
    console.error('Error assigning fees:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to assign fees'
    })
  }
})
