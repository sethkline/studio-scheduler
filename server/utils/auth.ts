/**
 * Server utility for authentication and authorization checks
 */
import { getSupabaseClient } from './supabase'
import { getPermissionsForRole } from '~/types/auth'
import type { UserRole } from '~/types/auth'
import type { H3Event } from 'h3'

export interface AuthenticatedUser {
  id: string
  email?: string
  user_role: UserRole
  profile_id?: string
  teacher_id?: string
}

/**
 * Get authenticated user from event context
 * Throws 401 if not authenticated
 */
export async function requireAuth(event: H3Event): Promise<AuthenticatedUser> {
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Authentication required'
    })
  }

  const client = getSupabaseClient()

  // Get user profile with role
  const { data: profile, error } = await client
    .from('profiles')
    .select('id, user_id, user_role, email')
    .eq('user_id', user.id)
    .single()

  if (error || !profile) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User profile not found'
    })
  }

  // If user is a teacher, get their teacher record
  let teacherId: string | undefined

  if (profile.user_role === 'teacher' || profile.user_role === 'admin' || profile.user_role === 'staff') {
    const { data: teacher } = await client
      .from('teachers')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (teacher) {
      teacherId = teacher.id
    }
  }

  return {
    id: user.id,
    email: profile.email,
    user_role: profile.user_role as UserRole,
    profile_id: profile.id,
    teacher_id: teacherId
  }
}

/**
 * Check if user has a specific permission
 */
export function requirePermission(user: AuthenticatedUser, permission: string): void {
  const permissions = getPermissionsForRole(user.user_role)

  if (!(permissions as any)[permission]) {
    throw createError({
      statusCode: 403,
      statusMessage: `Forbidden - Missing permission: ${permission}`
    })
  }
}

/**
 * Check if user has any of the specified roles
 */
export function requireRole(user: AuthenticatedUser, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(user.user_role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - Insufficient permissions'
    })
  }
}

/**
 * Check if user is admin or staff
 */
export function requireAdminOrStaff(user: AuthenticatedUser): void {
  requireRole(user, ['admin', 'staff'])
}

/**
 * Check if user is the owner of a resource or is admin/staff
 * @param user - The authenticated user
 * @param ownerId - The ID of the resource owner (e.g., teacher_id)
 * @param ownerField - Optional field name for better error messages
 */
export function requireOwnerOrAdmin(
  user: AuthenticatedUser,
  ownerId: string,
  ownerField: string = 'resource'
): void {
  const isAdmin = user.user_role === 'admin' || user.user_role === 'staff'
  const isOwner = user.teacher_id === ownerId || user.profile_id === ownerId

  if (!isAdmin && !isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: `Forbidden - You can only modify your own ${ownerField}`
    })
  }
}
