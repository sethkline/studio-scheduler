import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Get Student Fees
 *
 * GET /api/recitals/:id/student-fees
 *
 * Retrieves all student fees for a recital with filtering and summary statistics.
 *
 * @query {
 *   status?: 'pending' | 'partial' | 'paid' | 'waived' | 'overdue'
 *   fee_type?: 'participation' | 'costume' | 'makeup' | 'other'
 *   search?: string (student name search)
 * }
 *
 * @returns {
 *   fees: StudentRecitalFee[]
 *   summary: {
 *     total_expected: number
 *     total_collected: number
 *     total_outstanding: number
 *     collection_rate: number
 *     students_with_balance: number
 *   }
 * }
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const recitalShowId = getRouterParam(event, 'id')
  const query = getQuery(event)

  try {
    // Build query
    let feesQuery = client
      .from('student_recital_fees')
      .select(`
        *,
        student:students(*),
        fee_type:recital_fee_types(*)
      `)
      .eq('recital_show_id', recitalShowId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (query.status) {
      feesQuery = feesQuery.eq('status', query.status)
    }

    if (query.fee_type) {
      // Need to join through fee_type table
      feesQuery = feesQuery.eq('fee_type.fee_type', query.fee_type)
    }

    const { data: fees, error } = await feesQuery

    if (error) {
      console.error('Database error fetching student fees:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch student fees'
      })
    }

    let filteredFees = fees || []

    // Apply search filter (student name)
    if (query.search) {
      const searchLower = (query.search as string).toLowerCase()
      filteredFees = filteredFees.filter(fee => {
        const studentName = `${fee.student?.first_name} ${fee.student?.last_name}`.toLowerCase()
        return studentName.includes(searchLower)
      })
    }

    // Calculate summary statistics
    const summary = {
      total_expected: filteredFees.reduce((sum, f) => sum + (f.total_amount_in_cents || 0), 0),
      total_collected: filteredFees.reduce((sum, f) => sum + (f.amount_paid_in_cents || 0), 0),
      total_outstanding: filteredFees.reduce((sum, f) => sum + (f.balance_in_cents || 0), 0),
      collection_rate: 0,
      students_with_balance: filteredFees.filter(f => (f.balance_in_cents || 0) > 0).length,
    }

    // Calculate collection rate
    if (summary.total_expected > 0) {
      summary.collection_rate = Math.round((summary.total_collected / summary.total_expected) * 100)
    }

    return {
      fees: filteredFees,
      summary
    }
  } catch (error: any) {
    console.error('Error fetching student fees:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch student fees'
    })
  }
})
