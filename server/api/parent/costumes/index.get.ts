import { requireAuth, requireRole } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'
import type { CostumeAssignmentWithDetails } from '~/types/costumes'

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
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!guardian) {
    throw createError({
      statusCode: 404,
      message: 'Guardian profile not found',
    })
  }

  // Get all students for this guardian
  const { data: relationships } = await client
    .from('student_guardian_relationships')
    .select('student_id')
    .eq('guardian_id', guardian.id)

  const studentIds = relationships?.map((r) => r.student_id) || []

  if (studentIds.length === 0) {
    return []
  }

  // Fetch costume assignments for all guardian's students
  const { data: assignments, error } = await client
    .from('costume_assignments')
    .select(`
      *,
      costume:costumes (
        id,
        name,
        costume_type,
        description
      ),
      student:students (
        id,
        first_name,
        last_name
      ),
      recital_performance:recital_performances (
        id,
        title
      )
    `)
    .in('student_id', studentIds)
    .order('assigned_date', { ascending: false })

  if (error) {
    console.error('Error fetching parent costume assignments:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch costume assignments',
    })
  }

  // Fetch pickup information
  const assignmentIds = assignments?.map((a) => a.id) || []

  let pickups: any[] = []
  if (assignmentIds.length > 0) {
    const { data: pickupData } = await client
      .from('costume_pickups')
      .select('*')
      .in('assignment_id', assignmentIds)

    pickups = pickupData || []
  }

  // Merge pickup data with assignments
  const assignmentsWithPickups = assignments?.map((assignment) => {
    const pickup = pickups.find((p) => p.assignment_id === assignment.id)
    return {
      ...assignment,
      pickup: pickup || null,
    }
  })

  return assignmentsWithPickups as CostumeAssignmentWithDetails[]
})
