// server/utils/auth.ts
// Authentication and authorization utilities for API endpoints

import { H3Event } from 'h3'
import { getSupabaseClient } from './supabase'
import type { UserRole, UserProfile } from '~/types/auth'

/**
 * Get authenticated user from event context
 * @param event - H3 Event
 * @returns User object or null if not authenticated
 */
export function getAuthenticatedUser(event: H3Event) {
  return event.context.user || null
}

/**
 * Require authentication - throws 401 if not authenticated
 * @param event - H3 Event
 * @returns Authenticated user
 */
export function requireAuth(event: H3Event) {
  const user = getAuthenticatedUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required. Please log in to access this resource.'
    })
  }

  return user
}

/**
 * Get user profile with role information
 * @param event - H3 Event
 * @returns User profile with role
 */
export async function getUserProfile(event: H3Event): Promise<UserProfile | null> {
  const user = getAuthenticatedUser(event)

  if (!user) {
    return null
  }

  const client = getSupabaseClient()

  const { data: profile, error } = await client
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !profile) {
    return null
  }

  return profile as UserProfile
}

/**
 * Require user profile - throws 401 if not authenticated or profile not found
 * @param event - H3 Event
 * @returns User profile
 */
export async function requireUserProfile(event: H3Event): Promise<UserProfile> {
  requireAuth(event)

  const profile = await getUserProfile(event)

  if (!profile) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User profile not found. Please contact support.'
    })
  }

  return profile
}

/**
 * Check if user has a specific role
 * @param profile - User profile
 * @param allowedRoles - Array of allowed roles
 * @returns True if user has one of the allowed roles
 */
export function hasRole(profile: UserProfile, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(profile.user_role)
}

/**
 * Require specific role(s) - throws 403 if user doesn't have required role
 * @param event - H3 Event
 * @param allowedRoles - Array of allowed roles
 * @returns User profile if authorized
 */
export async function requireRole(event: H3Event, allowedRoles: UserRole[]): Promise<UserProfile> {
  const profile = await requireUserProfile(event)

  if (!hasRole(profile, allowedRoles)) {
    throw createError({
      statusCode: 403,
      statusMessage: `Access denied. This resource requires one of the following roles: ${allowedRoles.join(', ')}`
    })
  }

  return profile
}

/**
 * Require admin role only
 * @param event - H3 Event
 * @returns User profile if admin
 */
export async function requireAdmin(event: H3Event): Promise<UserProfile> {
  return await requireRole(event, ['admin'])
}

/**
 * Require admin or staff role
 * @param event - H3 Event
 * @returns User profile if admin or staff
 */
export async function requireAdminOrStaff(event: H3Event): Promise<UserProfile> {
  return await requireRole(event, ['admin', 'staff'])
}

/**
 * Require teacher, staff, or admin role
 * @param event - H3 Event
 * @returns User profile if teacher, staff, or admin
 */
export async function requireTeacherOrAbove(event: H3Event): Promise<UserProfile> {
  return await requireRole(event, ['admin', 'staff', 'teacher'])
}

/**
 * Check if user can view analytics/reports
 * Analytics access is limited to admin and staff (staff can see operational reports)
 * @param profile - User profile
 * @returns True if user can view analytics
 */
export function canViewAnalytics(profile: UserProfile): boolean {
  // Admin has full access to all analytics
  // Staff can view operational analytics (enrollment, classes, teachers)
  // but may not see sensitive financial data (that's admin-only)
  return profile.user_role === 'admin' || profile.user_role === 'staff'
}

/**
 * Check if user can view financial analytics (revenue, payments)
 * Financial analytics are admin-only
 * @param profile - User profile
 * @returns True if user can view financial analytics
 */
export function canViewFinancialAnalytics(profile: UserProfile): boolean {
  return profile.user_role === 'admin'
}

/**
 * Require analytics access (admin or staff)
 * @param event - H3 Event
 * @returns User profile if authorized
 */
export async function requireAnalyticsAccess(event: H3Event): Promise<UserProfile> {
  const profile = await requireUserProfile(event)

  if (!canViewAnalytics(profile)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Analytics access requires admin or staff role.'
    })
  }

  return profile
}

/**
 * Require financial analytics access (admin only)
 * @param event - H3 Event
 * @returns User profile if authorized
 */
export async function requireFinancialAnalyticsAccess(event: H3Event): Promise<UserProfile> {
  const profile = await requireUserProfile(event)

  if (!canViewFinancialAnalytics(profile)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Financial analytics access requires admin role.'
    })
  }

  return profile
}

/**
 * Log access attempt for auditing
 * @param event - H3 Event
 * @param resource - Resource being accessed
 * @param action - Action being performed
 * @param allowed - Whether access was allowed
 */
export function logAccess(
  event: H3Event,
  resource: string,
  action: string,
  allowed: boolean
): void {
  const user = getAuthenticatedUser(event)
  const timestamp = new Date().toISOString()
  const ip = event.node.req.socket.remoteAddress

  console.log(JSON.stringify({
    timestamp,
    resource,
    action,
    allowed,
    user_id: user?.id || 'anonymous',
    ip,
    method: event.node.req.method,
    path: event.node.req.url
  }))
}
