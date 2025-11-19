import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Get user profile to check role
  const { data: profile } = await client
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.user_role)) {
    throw createError({
      statusCode: 403,
      message: 'Permission denied',
    })
  }

  const assignmentId = getRouterParam(event, 'id')

  if (!assignmentId) {
    throw createError({
      statusCode: 400,
      message: 'Assignment ID is required',
    })
  }

  // Verify assignment exists and is picked up
  const { data: assignment } = await client
    .from('costume_assignments')
    .select('id, status')
    .eq('id', assignmentId)
    .single()

  if (!assignment) {
    throw createError({
      statusCode: 404,
      message: 'Costume assignment not found',
    })
  }

  if (assignment.status !== 'picked_up') {
    throw createError({
      statusCode: 400,
      message: 'Costume must be picked up before it can be returned',
    })
  }

  // Update pickup record with return date
  const { error: pickupError } = await client
    .from('costume_pickups')
    .update({ returned_at: new Date().toISOString() })
    .eq('assignment_id', assignmentId)

  if (pickupError) {
    console.error('Error updating pickup record:', pickupError)
    throw createError({
      statusCode: 500,
      message: 'Failed to record return',
    })
  }

  // Update assignment status
  const { error: updateError } = await client
    .from('costume_assignments')
    .update({ status: 'returned' })
    .eq('id', assignmentId)

  if (updateError) {
    console.error('Error updating assignment status:', updateError)
    throw createError({
      statusCode: 500,
      message: 'Failed to update assignment status',
    })
  }

  return { success: true }
})
