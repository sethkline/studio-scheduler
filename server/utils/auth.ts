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
