// server/utils/auth.ts
// Server-side authentication and authorization utilities

import type { H3Event } from 'h3'
import type { UserRole, UserProfile } from '~/types/auth'
import { getSupabaseClient } from './supabase'
import { hasAnyRole } from '~/types/auth'

/**
 * Get authenticated user from request
 * Throws error if not authenticated
 */
export async function requireAuth(event: H3Event) {
  const client = getSupabaseClient()
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - No authentication token provided'
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await client.auth.getUser(token)

  if (error || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Invalid or expired token'
    })
  }

  return user
}

/**
 * Get user profile with role information
 * Throws error if profile not found
 */
export async function getUserProfile(event: H3Event): Promise<UserProfile> {
  const user = await requireAuth(event)
  const client = getSupabaseClient()

  const { data: profile, error } = await client
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !profile) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User profile not found'
    })
  }

  return profile as UserProfile
}

/**
 * Require user to have one of the specified roles
 * Throws error if user doesn't have required role
 */
export async function requireRole(event: H3Event, allowedRoles: UserRole[]) {
  const profile = await getUserProfile(event)

  if (!hasAnyRole(profile.user_role, allowedRoles)) {
    throw createError({
      statusCode: 403,
      statusMessage: `Forbidden - Requires one of the following roles: ${allowedRoles.join(', ')}`
    })
  }

  return profile
}

/**
 * Get teacher ID for the authenticated user
 * Returns null if user is not linked to a teacher profile
 */
export async function getTeacherIdForUser(event: H3Event): Promise<string | null> {
  const user = await requireAuth(event)
  const client = getSupabaseClient()

  const { data: teacher, error } = await client
    .from('teachers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching teacher for user:', error)
    return null
  }

  return teacher?.id || null
}

/**
 * Verify that the user has access to manage a specific teacher's resources
 * - Teachers can only manage their own resources
 * - Staff and admin can manage any teacher's resources
 */
export async function requireTeacherAccess(event: H3Event, teacherId: string) {
  const profile = await getUserProfile(event)

  // Admin and staff can access any teacher's resources
  if (profile.user_role === 'admin' || profile.user_role === 'staff') {
    return profile
  }

  // Teachers can only access their own resources
  if (profile.user_role === 'teacher') {
    const userTeacherId = await getTeacherIdForUser(event)

    if (!userTeacherId || userTeacherId !== teacherId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - You can only manage your own resources'
      })
    }

    return profile
  }

  // Other roles have no access
  throw createError({
    statusCode: 403,
    statusMessage: 'Forbidden - Insufficient permissions'
  })
}

/**
 * Verify that a class instance exists and get its details
 */
export async function verifyClassInstance(classInstanceId: string) {
  const client = getSupabaseClient()

  const { data: classInstance, error } = await client
    .from('class_instances')
    .select('id, teacher_id, class_definition_id')
    .eq('id', classInstanceId)
    .maybeSingle()

  if (error) {
    console.error('Error verifying class instance:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to verify class instance'
    })
  }

  if (!classInstance) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Class instance not found'
    })
  }

  return classInstance
}

/**
 * Verify user has access to a choreography note
 * - Teachers can only access their own notes
 * - Staff and admin can access any note
 */
export async function requireChoreographyNoteAccess(event: H3Event, choreographyNoteId: string) {
  const profile = await getUserProfile(event)
  const client = getSupabaseClient()

  // Fetch choreography note to check ownership
  const { data: choreographyNote, error } = await client
    .from('choreography_notes')
    .select('teacher_id')
    .eq('id', choreographyNoteId)
    .maybeSingle()

  if (error || !choreographyNote) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Choreography note not found'
    })
  }

  // Admin and staff can access any choreography note
  if (profile.user_role === 'admin' || profile.user_role === 'staff') {
    return choreographyNote
  }

  // Teachers can only access their own choreography notes
  if (profile.user_role === 'teacher') {
    const userTeacherId = await getTeacherIdForUser(event)

    if (!userTeacherId || userTeacherId !== choreographyNote.teacher_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - You can only manage your own choreography notes'
      })
    }

    return choreographyNote
  }

  // Other roles have no access
  throw createError({
    statusCode: 403,
    statusMessage: 'Forbidden - Insufficient permissions'
  })
}
