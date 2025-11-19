import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'
import type { CostumeAssignmentWithDetails } from '~/types/costumes'

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

  // Fetch all assignments with related data
  const { data: assignments, error } = await client
    .from('costume_assignments')
    .select(`
      *,
      costume:costumes (
        id,
        name,
        costume_type
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
    .order('assigned_date', { ascending: false })

  if (error) {
    console.error('Error fetching costume assignments:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch costume assignments',
    })
  }

  // Fetch pickup information for all assignments
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
