import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
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

  // Verify assignment exists
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

  // Check if already picked up
  const { data: existingPickup } = await client
    .from('costume_pickups')
    .select('id')
    .eq('assignment_id', assignmentId)
    .single()

  if (existingPickup) {
    throw createError({
      statusCode: 400,
      message: 'Costume already marked as picked up',
    })
  }

  // Create pickup record
  const { data: pickup, error: pickupError } = await client
    .from('costume_pickups')
    .insert({
      assignment_id: assignmentId,
      picked_up_by: `${profile.user_role} user`,
      picked_up_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (pickupError) {
    console.error('Error creating pickup record:', pickupError)
    throw createError({
      statusCode: 500,
      message: 'Failed to record pickup',
    })
  }

  // Update assignment status
  const { error: updateError } = await client
    .from('costume_assignments')
    .update({ status: 'picked_up' })
    .eq('id', assignmentId)

  if (updateError) {
    console.error('Error updating assignment status:', updateError)
    throw createError({
      statusCode: 500,
      message: 'Failed to update assignment status',
    })
  }

  return pickup
})
