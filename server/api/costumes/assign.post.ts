import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'
import type { AssignCostumeForm } from '~/types/costumes'

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

  const body = await readBody<AssignCostumeForm>(event)

  // Validate required fields
  if (!body.student_id || !body.costume_id || !body.size_assigned) {
    throw createError({
      statusCode: 400,
      message: 'Student ID, costume ID, and size are required',
    })
  }

  // Verify student exists
  const { data: student } = await client
    .from('students')
    .select('id')
    .eq('id', body.student_id)
    .single()

  if (!student) {
    throw createError({
      statusCode: 404,
      message: 'Student not found',
    })
  }

  // Verify costume exists
  const { data: costume } = await client
    .from('costumes')
    .select('id, name')
    .eq('id', body.costume_id)
    .single()

  if (!costume) {
    throw createError({
      statusCode: 404,
      message: 'Costume not found',
    })
  }

  // Create assignment
  const { data: assignment, error } = await client
    .from('costume_assignments')
    .insert({
      student_id: body.student_id,
      costume_id: body.costume_id,
      recital_performance_id: body.recital_performance_id,
      size_assigned: body.size_assigned,
      due_date: body.due_date,
      notes: body.notes,
      status: 'assigned',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating costume assignment:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create costume assignment',
    })
  }

  return assignment
})
