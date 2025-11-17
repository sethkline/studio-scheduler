import { getSupabaseClient } from '~/server/utils/supabase'

/**
 * Get Fee Types
 *
 * GET /api/recitals/:id/fee-types
 *
 * Retrieves all fee types for a recital show with summary statistics.
 *
 * @query {
 *   fee_type?: 'participation' | 'costume' | 'makeup' | 'other'
 *   is_active?: 'true' | 'false'
 * }
 *
 * @returns {
 *   feeTypes: RecitalFeeType[]
 *   summary: {
 *     total_fee_types: number
 *     active_fee_types: number
 *     total_assigned: number
 *     total_collected: number
 *   }
 * }
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const recitalShowId = getRouterParam(event, 'id')
  const query = getQuery(event)

  try {
    // Build query
    let feeTypesQuery = client
      .from('recital_fee_types')
      .select(`
        *,
        assigned_count:student_recital_fees(count),
        collected_amount:student_recital_fees(amount_paid_in_cents)
      `)
      .eq('recital_show_id', recitalShowId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (query.fee_type) {
      feeTypesQuery = feeTypesQuery.eq('fee_type', query.fee_type)
    }

    if (query.is_active !== undefined) {
      feeTypesQuery = feeTypesQuery.eq('is_active', query.is_active === 'true')
    }

    const { data: feeTypes, error } = await feeTypesQuery

    if (error) {
      console.error('Database error fetching fee types:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch fee types'
      })
    }

    // Calculate aggregated statistics for each fee type
    const feeTypesWithStats = await Promise.all(
      (feeTypes || []).map(async (feeType) => {
        // Get assignment and payment statistics
        const { data: stats } = await client
          .from('student_recital_fees')
          .select('amount_paid_in_cents')
          .eq('fee_type_id', feeType.id)

        const assigned_count = stats?.length || 0
        const collected_amount = stats?.reduce((sum, s) => sum + (s.amount_paid_in_cents || 0), 0) || 0

        return {
          ...feeType,
          assigned_count,
          collected_amount,
        }
      })
    )

    // Calculate summary statistics
    const summary = {
      total_fee_types: feeTypesWithStats.length,
      active_fee_types: feeTypesWithStats.filter(f => f.is_active).length,
      total_assigned: feeTypesWithStats.reduce((sum, f) => sum + (f.assigned_count || 0), 0),
      total_collected: feeTypesWithStats.reduce((sum, f) => sum + (f.collected_amount || 0), 0),
    }

    return {
      feeTypes: feeTypesWithStats,
      summary
    }
  } catch (error: any) {
    console.error('Error fetching fee types:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch fee types'
    })
  }
})
