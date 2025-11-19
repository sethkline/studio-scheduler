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

// ============================================
// MULTI-TENANT STUDIO CONTEXT HELPERS
// ============================================

/**
 * Get current studio ID from context, user's primary studio, or session
 * @param event - H3 event
 * @returns Studio UUID or null
 */
export async function getCurrentStudioId(event: H3Event): Promise<string | null> {
  // Check if studio_id is already in event context (set by middleware)
  const contextStudioId = event.context.studioId
  if (contextStudioId) {
    return contextStudioId
  }

  // Otherwise, get user's primary studio
  const user = await getServerUser(event)
  if (!user) return null

  const client = await serverSupabaseClient(event)
  const { data: profile } = await client
    .from('profiles')
    .select('primary_studio_id')
    .eq('id', user.id)
    .single()

  return profile?.primary_studio_id || null
}

/**
 * Require current studio ID
 * Throws 400 if no studio context can be determined
 * @param event - H3 event
 * @returns Studio UUID
 */
export async function requireStudioId(event: H3Event): Promise<string> {
  const studioId = await getCurrentStudioId(event)

  if (!studioId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Studio context required but not available'
    })
  }

  return studioId
}

/**
 * Get user's studio membership info
 * @param event - H3 event
 * @param studioId - Studio UUID
 * @returns Studio membership record or null
 */
export async function getUserStudioMembership(event: H3Event, studioId: string) {
  const user = await getServerUser(event)
  if (!user) return null

  const client = await serverSupabaseClient(event)
  const { data: membership } = await client
    .from('studio_members')
    .select('id, studio_id, user_id, role, status')
    .eq('user_id', user.id)
    .eq('studio_id', studioId)
    .eq('status', 'active')
    .single()

  return membership
}

/**
 * Get user's role within a specific studio
 * @param event - H3 event
 * @param studioId - Studio UUID
 * @returns User role (admin, staff, teacher, parent, student) or null
 */
export async function getUserStudioRole(event: H3Event, studioId: string): Promise<string | null> {
  const membership = await getUserStudioMembership(event, studioId)
  return membership?.role || null
}

/**
 * Check if user has access to a specific studio
 * @param event - H3 event
 * @param studioId - Studio UUID
 * @returns True if user has active membership in the studio
 */
export async function hasStudioAccess(event: H3Event, studioId: string): Promise<boolean> {
  const membership = await getUserStudioMembership(event, studioId)
  return !!membership && membership.status === 'active'
}

/**
 * Require studio access
 * Throws 401 if not authenticated, 403 if not a member of the studio
 * @param event - H3 event
 * @param studioId - Studio UUID
 * @returns Studio membership
 */
export async function requireStudioAccess(event: H3Event, studioId: string) {
  const user = await requireAuth(event)
  const membership = await getUserStudioMembership(event, studioId)

  if (!membership) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - You do not have access to this studio'
    })
  }

  return membership
}

/**
 * Check if user is admin or staff in a specific studio
 * @param event - H3 event
 * @param studioId - Studio UUID
 * @returns True if user is admin or staff in the studio
 */
export async function isStudioAdminOrStaff(event: H3Event, studioId: string): Promise<boolean> {
  const role = await getUserStudioRole(event, studioId)
  return role ? ['admin', 'staff'].includes(role) : false
}

/**
 * Require admin or staff role within a specific studio
 * Throws 401 if not authenticated, 403 if not admin/staff in the studio
 * @param event - H3 event
 * @param studioId - Studio UUID
 * @returns Studio membership
 */
export async function requireStudioAdmin(event: H3Event, studioId: string) {
  const membership = await requireStudioAccess(event, studioId)

  if (!['admin', 'staff'].includes(membership.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - Admin or staff access required for this studio'
    })
  }

  return membership
}

/**
 * Get all studios the user has access to
 * @param event - H3 event
 * @returns Array of studio IDs
 */
export async function getUserStudioIds(event: H3Event): Promise<string[]> {
  const user = await getServerUser(event)
  if (!user) return []

  const client = await serverSupabaseClient(event)
  const { data: memberships } = await client
    .from('studio_members')
    .select('studio_id')
    .eq('user_id', user.id)
    .eq('status', 'active')

  return memberships?.map(m => m.studio_id) || []
}

/**
 * Require studio role (within current studio context)
 * @param event - H3 event
 * @param allowedRoles - Array of allowed roles
 * @returns Studio membership
 */
export async function requireStudioRole(event: H3Event, allowedRoles: string[]) {
  const studioId = await requireStudioId(event)
  const membership = await requireStudioAccess(event, studioId)

  if (!allowedRoles.includes(membership.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: `Forbidden - Requires one of: ${allowedRoles.join(', ')}`
    })
  }

  return membership
}
