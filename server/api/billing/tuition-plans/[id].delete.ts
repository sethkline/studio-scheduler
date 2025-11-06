/**
 * DELETE /api/billing/tuition-plans/[id]
 * Archive a tuition plan (soft delete)
 */

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Tuition plan ID is required',
    })
  }

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Soft delete by setting is_active to false and setting effective_to to today
  const { data, error } = await client
    .from('tuition_plans')
    .update({
      is_active: false,
      effective_to: new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 500,
      message: error.code === 'PGRST116' ? 'Tuition plan not found' : `Failed to archive tuition plan: ${error.message}`,
    })
  }

  return {
    success: true,
    message: 'Tuition plan archived successfully',
  }
})
