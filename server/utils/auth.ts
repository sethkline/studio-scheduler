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
