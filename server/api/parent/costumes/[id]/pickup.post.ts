import { requireAuth, requireRole } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'
import type { RecordPickupForm } from '~/types/costumes'

export default defineEventHandler(async (event) => {  await requireRole(event, ['parent', 'admin', 'staff'])

  const client = await getUserSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Get guardian record
  const { data: guardian } = await client
    .from('guardians')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .single()

  if (!guardian) {
    throw createError({
      statusCode: 404,
      message: 'Guardian profile not found',
    })
  }

  const assignmentId = getRouterParam(event, 'id')

  if (!assignmentId) {
    throw createError({
      statusCode: 400,
      message: 'Assignment ID is required',
    })
  }

  // Verify assignment belongs to guardian's student
  const { data: assignment } = await client
    .from('costume_assignments')
    .select(`
      id,
      student_id,
      status
    `)
    .eq('id', assignmentId)
    .single()

  if (!assignment) {
    throw createError({
      statusCode: 404,
      message: 'Costume assignment not found',
    })
  }

  // Check if student belongs to this guardian
  const { data: relationship } = await client
    .from('student_guardian_relationships')
    .select('id')
    .eq('guardian_id', guardian.id)
    .eq('student_id', assignment.student_id)
    .single()

  if (!relationship) {
    throw createError({
      statusCode: 403,
      message: 'Access denied',
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
      guardian_id: guardian.id,
      picked_up_by: `${guardian.first_name} ${guardian.last_name}`,
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
