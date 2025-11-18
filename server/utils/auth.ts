// server/utils/auth.ts
import type { H3Event } from 'h3'

/**
 * Get the authenticated user from the server-side Supabase client
 * @param event - H3 event
 * @returns User object or null
 */
export async function getServerUser(event: H3Event) {
  const client = await serverSupabaseClient(event)
  const { data: { user } } = await client.auth.getUser()
  return user
}

/**
 * Get the user's profile including their role
 * @param event - H3 event
 * @returns User profile with role or null
 */
export async function getUserProfile(event: H3Event) {
  const user = await getServerUser(event)
  if (!user) return null

  const client = await serverSupabaseClient(event)
  const { data: profile } = await client
    .from('profiles')
    .select('id, user_role, email')
    .eq('id', user.id)
    .single()

  return profile
}

/**
 * Require an authenticated user
 * Throws 401 error if user is not authenticated
 * @param event - H3 event
 * @returns User object
 */
export async function requireAuth(event: H3Event) {
  const user = await getServerUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Authentication required'
    })
  }
  return user
}

/**
 * Require admin role
 * Throws 401 if not authenticated, 403 if not admin
 * @param event - H3 event
 * @returns User profile
 */
export async function requireAdmin(event: H3Event) {
  const profile = await getUserProfile(event)

  if (!profile) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Authentication required'
    })
  }

  if (profile.user_role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - Admin access required'
    })
  }

  return profile
}

/**
 * Require admin or staff role
 * Throws 401 if not authenticated, 403 if not admin or staff
 * @param event - H3 event
 * @returns User profile
 */
export async function requireAdminOrStaff(event: H3Event) {
  const profile = await getUserProfile(event)

  if (!profile) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Authentication required'
    })
  }

  if (!['admin', 'staff'].includes(profile.user_role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - Admin or staff access required'
    })
  }

  return profile
}

/**
 * Check if user has a specific role
 * @param event - H3 event
 * @param roles - Array of allowed roles
 * @returns User profile if authorized
 */
export async function requireRole(event: H3Event, roles: string[]) {
  const profile = await getUserProfile(event)

  if (!profile) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Authentication required'
    })
  }

  if (!roles.includes(profile.user_role)) {
    throw createError({
      statusCode: 403,
      statusMessage: `Forbidden - Requires one of: ${roles.join(', ')}`
    })
  }

  return profile
}

/**
 * Check if user owns a ticket (via order email)
 * @param event - H3 event
 * @param ticketId - Ticket UUID
 * @returns True if user owns the ticket
 */
export async function checkTicketOwnership(
  event: H3Event,
  ticketId: string
): Promise<boolean> {
  const user = await getServerUser(event)
  if (!user) return false

  const client = await serverSupabaseClient(event)

  // Get ticket with order email
  const { data: ticket, error } = await client
    .from('tickets')
    .select('ticket_order:ticket_orders!inner(customer_email)')
    .eq('id', ticketId)
    .single()

  if (error || !ticket) return false

  return (ticket.ticket_order as any).customer_email.toLowerCase() === user.email?.toLowerCase()
}

/**
 * Require ticket ownership or staff access
 * Throws 401 if not authenticated, 403 if not owner/staff
 * @param event - H3 event
 * @param ticketId - Ticket UUID
 * @returns User profile and access info
 */
export async function requireTicketAccess(event: H3Event, ticketId: string) {
  const user = await requireAuth(event)
  const profile = await getUserProfile(event)

  if (!profile) {
    throw createError({
      statusCode: 403,
      statusMessage: 'User profile not found'
    })
  }

  // Admin/staff can access any ticket
  if (['admin', 'staff'].includes(profile.user_role)) {
    return { user, profile, isStaff: true }
  }

  // Otherwise, must own the ticket
  const isOwner = await checkTicketOwnership(event, ticketId)

  if (!isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - You do not have access to this ticket'
    })
  }

  return { user, profile, isStaff: false }
}

/**
 * Require permission check based on role
 * Throws 401 if not authenticated, 403 if permission denied
 * @param event - H3 event
 * @param permission - Permission name from Permissions type
 * @returns User profile
 */
export async function requirePermission(
  event: H3Event,
  permission: string
) {
  const profile = await getUserProfile(event)

  if (!profile) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Authentication required'
    })
  }

  const { getPermissionsForRole } = await import('~/types/auth')
  const permissions = getPermissionsForRole(profile.user_role)

  if (!(permissions as any)[permission]) {
    throw createError({
      statusCode: 403,
      statusMessage: `Forbidden - Permission '${permission}' required`
    })
  }

  return profile
}

/**
 * Verify parent has access to a specific student
 * Uses correct two-step schema: profiles -> guardians -> student_guardian_relationships
 * @param event - H3 event
 * @param studentId - Student UUID
 * @returns Guardian info if authorized
 */
export async function requireParentStudentAccess(
  event: H3Event,
  studentId: string
) {
  const user = await requireAuth(event)
  const profile = await getUserProfile(event)

  if (!profile) {
    throw createError({
      statusCode: 403,
      statusMessage: 'User profile not found'
    })
  }

  // Admin/staff can access any student
  if (['admin', 'staff'].includes(profile.user_role)) {
    return { user, profile, isStaff: true, guardianId: null }
  }

  // For parents, verify through proper schema
  const client = await serverSupabaseClient(event)

  // Step 1: Get guardian record by user_id
  const { data: guardian, error: guardianError } = await client
    .from('guardians')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (guardianError || !guardian) {
    throw createError({
      statusCode: 403,
      statusMessage: 'User is not registered as a guardian'
    })
  }

  // Step 2: Verify guardian-student relationship
  const { data: relationship, error: relationshipError } = await client
    .from('student_guardian_relationships')
    .select('id')
    .eq('guardian_id', guardian.id)
    .eq('student_id', studentId)
    .single()

  if (relationshipError || !relationship) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have access to this student'
    })
  }

  return { user, profile, isStaff: false, guardianId: guardian.id }
}

/**
 * Get list of student IDs accessible to the current user (parent)
 * @param event - H3 event
 * @returns Array of student IDs
 */
export async function getParentStudentIds(event: H3Event): Promise<string[]> {
  const user = await requireAuth(event)
  const profile = await getUserProfile(event)

  if (!profile) return []

  // Admin/staff can see all students
  if (['admin', 'staff'].includes(profile.user_role)) {
    const client = await serverSupabaseClient(event)
    const { data: students } = await client.from('students').select('id')
    return students?.map((s) => s.id) || []
  }

  // For parents, get their students through proper schema
  const client = await serverSupabaseClient(event)

  // Step 1: Get guardian record
  const { data: guardian } = await client
    .from('guardians')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!guardian) return []

  // Step 2: Get all student relationships
  const { data: relationships } = await client
    .from('student_guardian_relationships')
    .select('student_id')
    .eq('guardian_id', guardian.id)

  return relationships?.map((r) => r.student_id) || []
}

/**
 * Verify teacher owns/teaches a specific class
 * @param event - H3 event
 * @param classId - Class instance UUID
 * @returns Teacher info if authorized
 */
export async function requireTeacherClassAccess(
  event: H3Event,
  classId: string
) {
  const user = await requireAuth(event)
  const profile = await getUserProfile(event)

  if (!profile) {
    throw createError({
      statusCode: 403,
      statusMessage: 'User profile not found'
    })
  }

  // Admin/staff can access any class
  if (['admin', 'staff'].includes(profile.user_role)) {
    return { user, profile, isStaff: true, teacherId: null }
  }

  // For teachers, verify class ownership
  if (profile.user_role !== 'teacher') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only teachers can access class-specific data'
    })
  }

  const client = await serverSupabaseClient(event)

  // Get teacher record
  const { data: teacher, error: teacherError } = await client
    .from('teachers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (teacherError || !teacher) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Teacher profile not found'
    })
  }

  // Verify teacher teaches this class
  const { data: classInstance, error: classError } = await client
    .from('class_instances')
    .select('id')
    .eq('id', classId)
    .eq('teacher_id', teacher.id)
    .single()

  if (classError || !classInstance) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not teach this class'
    })
  }

  return { user, profile, isStaff: false, teacherId: teacher.id }
}
