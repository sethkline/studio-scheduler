import { getSupabaseClient } from '~/server/utils/supabase'
import type { DistributionStatusSummary, DistributionReportItem } from '~/types/costumes'

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

  // Fetch all assignments with full details
  const { data: assignments, error } = await client
    .from('costume_assignments')
    .select(`
      id,
      size_assigned,
      status,
      assigned_date,
      due_date,
      student:students (
        first_name,
        last_name
      ),
      costume:costumes (
        name
      )
    `)
    .order('assigned_date', { ascending: false })

  if (error) {
    console.error('Error fetching assignments:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch distribution status',
    })
  }

  // Fetch all pickup records
  const assignmentIds = assignments?.map((a) => a.id) || []
  let pickups: any[] = []

  if (assignmentIds.length > 0) {
    const { data: pickupData } = await client
      .from('costume_pickups')
      .select(`
        assignment_id,
        picked_up_by,
        picked_up_at,
        returned_at,
        guardian:guardians (
          first_name,
          last_name
        )
      `)
      .in('assignment_id', assignmentIds)

    pickups = pickupData || []
  }

  // Calculate summary statistics
  const total = assignments?.length || 0
  const statusCounts = {
    assigned: 0,
    picked_up: 0,
    returned: 0,
    missing: 0,
  }

  assignments?.forEach((a) => {
    if (a.status in statusCounts) {
      statusCounts[a.status as keyof typeof statusCounts]++
    }
  })

  const pending_pickup = statusCounts.assigned

  const summary: DistributionStatusSummary = {
    total_assignments: total,
    assigned: statusCounts.assigned,
    picked_up: statusCounts.picked_up,
    returned: statusCounts.returned,
    missing: statusCounts.missing,
    pending_pickup,
  }

  // Build detailed report items
  const reportItems: DistributionReportItem[] = (assignments || []).map((assignment) => {
    const pickup = pickups.find((p) => p.assignment_id === assignment.id)
    const guardianName = pickup?.guardian
      ? `${pickup.guardian.first_name} ${pickup.guardian.last_name}`
      : undefined

    return {
      assignment_id: assignment.id,
      student_name: `${assignment.student.first_name} ${assignment.student.last_name}`,
      costume_name: assignment.costume.name,
      size: assignment.size_assigned,
      status: assignment.status,
      assigned_date: assignment.assigned_date,
      due_date: assignment.due_date,
      picked_up_at: pickup?.picked_up_at,
      returned_at: pickup?.returned_at,
      guardian_name: guardianName,
    }
  })

  return {
    summary,
    items: reportItems,
  }
})
