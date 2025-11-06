// API Endpoint: Get dashboard metrics for a recital
// Story 2.1.1: Recital Hub Dashboard
// Returns aggregated metrics for the dashboard view

import { getSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const recitalId = getRouterParam(event, 'id')

  if (!recitalId) {
    throw createError({
      statusCode: 400,
      message: 'Recital ID is required'
    })
  }

  const client = getSupabaseClient()

  try {
    // Get recital basic info
    const { data: recital, error: recitalError } = await client
      .from('recitals')
      .select('id, name, date, venue_name')
      .eq('id', recitalId)
      .single()

    if (recitalError) throw recitalError
    if (!recital) {
      throw createError({
        statusCode: 404,
        message: 'Recital not found'
      })
    }

    // Get ticket sales metrics
    const { data: salesData, error: salesError } = await client
      .from('recital_sales_summary')
      .select('*')
      .eq('recital_id', recitalId)
      .single()

    // Get task completion metrics
    const { data: tasks, error: tasksError } = await client
      .from('recital_tasks')
      .select('id, status, due_date')
      .eq('recital_id', recitalId)

    const totalTasks = tasks?.length || 0
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0
    const overdueTasks = tasks?.filter(t =>
      t.status !== 'completed' &&
      t.due_date &&
      new Date(t.due_date) < new Date()
    ).length || 0

    // Get volunteer metrics
    const { data: volunteerShifts, error: volunteerError } = await client
      .from('volunteer_shifts_with_availability')
      .select('*')
      .eq('recital_id', recitalId)

    const totalShifts = volunteerShifts?.length || 0
    const filledShifts = volunteerShifts?.filter(s => !s.is_full).length || 0
    const totalVolunteerSpots = volunteerShifts?.reduce((sum, shift) =>
      sum + (shift.capacity || 1), 0) || 0
    const filledSpots = volunteerShifts?.reduce((sum, shift) =>
      sum + (shift.current_signups || 0), 0) || 0

    // Get costume status (if tracked)
    // This would require a costumes table - for now we'll use a placeholder
    const costumeMetrics = {
      total: 0,
      ready: 0,
      pending: 0
    }

    // Calculate countdown
    const showDate = new Date(recital.date)
    const now = new Date()
    const daysUntilShow = Math.ceil((showDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const hoursUntilShow = Math.ceil((showDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    const minutesUntilShow = Math.ceil((showDate.getTime() - now.getTime()) / (1000 * 60))

    // Calculate overall completion percentage
    // Based on: tasks (40%), volunteers (30%), ticket sales (30%)
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0
    const volunteerCompletionRate = totalVolunteerSpots > 0 ? (filledSpots / totalVolunteerSpots) : 0
    const ticketSalesRate = 0.5 // Placeholder - would need to compare to goal

    const overallCompletion = Math.round(
      (taskCompletionRate * 40 + volunteerCompletionRate * 30 + ticketSalesRate * 30)
    )

    // Get at-risk items
    const atRiskItems = []

    if (overdueTasks > 0) {
      atRiskItems.push({
        type: 'tasks',
        severity: 'high',
        message: `${overdueTasks} overdue task${overdueTasks === 1 ? '' : 's'}`,
        count: overdueTasks
      })
    }

    const unfilledShifts = volunteerShifts?.filter(s => s.is_full === false).length || 0
    if (unfilledShifts > 0 && daysUntilShow <= 7) {
      atRiskItems.push({
        type: 'volunteers',
        severity: daysUntilShow <= 3 ? 'high' : 'medium',
        message: `${unfilledShifts} unfilled volunteer shift${unfilledShifts === 1 ? '' : 's'}`,
        count: unfilledShifts
      })
    }

    // Get recent activity
    const { data: recentActivity, error: activityError } = await client
      .from('recital_tasks')
      .select(`
        id,
        title,
        completed_at,
        completed_by,
        profiles!recital_tasks_completed_by_fkey (
          full_name,
          email
        )
      `)
      .eq('recital_id', recitalId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(5)

    // Get staff assigned to recital (from tasks)
    const { data: assignedStaff, error: staffError } = await client
      .from('recital_tasks')
      .select(`
        profiles!recital_tasks_assigned_to_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('recital_id', recitalId)
      .not('assigned_to', 'is', null)

    const uniqueStaff = assignedStaff
      ? Array.from(
          new Map(
            assignedStaff
              .map(item => item.profiles)
              .filter(Boolean)
              .map(profile => [profile.id, profile])
          ).values()
        )
      : []

    return {
      recital: {
        id: recital.id,
        name: recital.name,
        date: recital.date,
        venue: recital.venue_name
      },
      countdown: {
        days: Math.max(0, daysUntilShow),
        hours: Math.max(0, hoursUntilShow),
        minutes: Math.max(0, minutesUntilShow),
        isPast: daysUntilShow < 0
      },
      metrics: {
        overallCompletion,
        ticketsSold: salesData?.total_tickets_sold || 0,
        revenue: salesData?.total_revenue || 0,
        tasksCompleted: completedTasks,
        totalTasks,
        volunteersFilledSpots: filledSpots,
        volunteerTotalSpots: totalVolunteerSpots,
        costumesReady: costumeMetrics.ready,
        costumesTotal: costumeMetrics.total
      },
      progress: {
        tasks: {
          completed: completedTasks,
          total: totalTasks,
          percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          overdue: overdueTasks
        },
        volunteers: {
          filled: filledSpots,
          total: totalVolunteerSpots,
          percentage: totalVolunteerSpots > 0 ? Math.round((filledSpots / totalVolunteerSpots) * 100) : 0,
          unfilled: totalVolunteerSpots - filledSpots
        },
        tickets: {
          sold: salesData?.total_tickets_sold || 0,
          revenue: salesData?.total_revenue || 0,
          averageOrderValue: salesData?.avg_order_value || 0,
          uniqueCustomers: salesData?.unique_customers || 0
        }
      },
      atRiskItems,
      recentActivity: recentActivity?.map(activity => ({
        id: activity.id,
        title: activity.title,
        completedAt: activity.completed_at,
        completedBy: activity.profiles?.full_name || 'Unknown'
      })) || [],
      assignedStaff: uniqueStaff
    }
  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch dashboard metrics'
    })
  }
})
