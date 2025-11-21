/**
 * DELETE /api/costume-catalog/assignments/[id]
 *
 * Remove a costume assignment from a performance
 */

import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const assignmentId = getRouterParam(event, 'id')

  if (!assignmentId) {
    throw createError({
      statusCode: 400,
      message: 'Assignment ID is required'
    })
  }

  // First, delete any order details associated with this assignment
  const { error: orderDetailsError } = await client
    .from('costume_order_details')
    .delete()
    .eq('performance_costume_id', assignmentId)

  if (orderDetailsError) {
    console.error('Error deleting order details:', orderDetailsError)
    // Continue anyway - we still want to delete the assignment
  }

  // Delete the assignment
  const { error } = await client
    .from('performance_costumes')
    .delete()
    .eq('id', assignmentId)

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to delete costume assignment: ${error.message}`
    })
  }

  return { success: true }
})
