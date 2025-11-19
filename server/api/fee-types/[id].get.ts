import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'

/**
 * Get Fee Type
 *
 * GET /api/fee-types/:id
 *
 * Retrieves a single fee type by ID.
 *
 * @returns RecitalFeeType
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const feeTypeId = getRouterParam(event, 'id')

  if (!feeTypeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Fee type ID is required'
    })
  }

  try {
    const { data: feeType, error } = await client
      .from('recital_fee_types')
      .select('*')
      .eq('id', feeTypeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Fee type not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch fee type'
      })
    }

    return feeType
  } catch (error: any) {
    console.error('Error fetching fee type:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch fee type'
    })
  }
})
