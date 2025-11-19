import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

/**
 * Get Student Fee
 *
 * GET /api/student-fees/:id
 *
 * Retrieves a single student fee by ID with related data.
 *
 * @returns StudentRecitalFee
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const studentFeeId = getRouterParam(event, 'id')

  if (!studentFeeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Student fee ID is required'
    })
  }

  try {
    const { data: studentFee, error } = await client
      .from('student_recital_fees')
      .select(`
        *,
        student:students(*),
        fee_type:recital_fee_types(*),
        payment_plan:recital_payment_plans(*)
      `)
      .eq('id', studentFeeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Student fee not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch student fee'
      })
    }

    return studentFee
  } catch (error: any) {
    console.error('Error fetching student fee:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch student fee'
    })
  }
})
