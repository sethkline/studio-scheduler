import { getSupabaseClient } from '~/server/utils/supabase'

/**
 * Delete Fee Type
 *
 * DELETE /api/fee-types/:id
 *
 * Deletes a fee type. Only allowed if no student fees have been assigned.
 *
 * @returns {
 *   message: string
 * }
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const feeTypeId = getRouterParam(event, 'id')

  if (!feeTypeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Fee type ID is required'
    })
  }

  try {
    // Check if any student fees use this fee type
    const { data: assignedFees, error: checkError } = await client
      .from('student_recital_fees')
      .select('id')
      .eq('fee_type_id', feeTypeId)
      .limit(1)

    if (checkError) {
      console.error('Error checking fee assignments:', checkError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check fee assignments'
      })
    }

    if (assignedFees && assignedFees.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete fee type that has been assigned to students. Remove all assignments first.'
      })
    }

    // Delete fee type
    const { error } = await client
      .from('recital_fee_types')
      .delete()
      .eq('id', feeTypeId)

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Fee type not found'
        })
      }
      console.error('Database error deleting fee type:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete fee type'
      })
    }

    return {
      message: 'Fee type deleted successfully'
    }
  } catch (error: any) {
    console.error('Error deleting fee type:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete fee type'
    })
  }
})
