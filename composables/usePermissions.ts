/**
 * Composable for checking user permissions and roles
 *
 * Usage:
 * const { can, hasRole, isAdmin, isParent } = usePermissions()
 *
 * if (can('canManageStudents')) {
 *   // Show student management UI
 * }
 */

import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import type { UserRole, Permissions } from '~/types/auth'

export function usePermissions() {
  const authStore = useAuthStore()

  /**
   * Check if user has a specific permission
   * @param permission - The permission to check
   * @returns boolean
   */
  const can = (permission: keyof Permissions): boolean => {
    return authStore.can(permission)
  }

  /**
   * Check if user has any of the specified roles
   * @param roles - Array of roles to check
   * @returns boolean
   */
  const hasRole = (roles: UserRole[]): boolean => {
    return authStore.hasRole(roles)
  }

  /**
   * Check if user has admin or staff access
   */
  const hasAdminAccess = computed(() => authStore.hasAdminAccess)

  /**
   * Check if user is an admin
   */
  const isAdmin = computed(() => authStore.isAdmin)

  /**
   * Check if user is staff
   */
  const isStaff = computed(() => authStore.isStaff)

  /**
   * Check if user is a teacher
   */
  const isTeacher = computed(() => authStore.isTeacher)

  /**
   * Check if user is a parent
   */
  const isParent = computed(() => authStore.isParent)

  /**
   * Check if user is a student
   */
  const isStudent = computed(() => authStore.isStudent)

  /**
   * Get current user's role
   */
  const userRole = computed(() => authStore.userRole)

  /**
   * Get all permissions for current user
   */
  const permissions = computed(() => authStore.permissions)

  /**
   * Get user's full name
   */
  const fullName = computed(() => authStore.fullName)

  /**
   * Get user's initials
   */
  const initials = computed(() => authStore.initials)

  /**
   * Check if user profile is loaded
   */
  const isProfileLoaded = computed(() => authStore.isProfileLoaded)

  /**
   * Ensure user profile is loaded
   * Useful in components that need profile data
   */
  const ensureProfile = async () => {
    if (!authStore.isProfileLoaded) {
      await authStore.fetchUserProfile()
    }
  }

  /**
   * Require specific permission - throws error if not authorized
   * Useful for protecting routes/actions
   */
  const requirePermission = (permission: keyof Permissions, errorMessage?: string) => {
    if (!can(permission)) {
      throw new Error(errorMessage || `Permission denied: ${permission}`)
    }
  }

  /**
   * Require specific role - throws error if not authorized
   */
  const requireRole = (roles: UserRole[], errorMessage?: string) => {
    if (!hasRole(roles)) {
      throw new Error(errorMessage || `Role required: ${roles.join(' or ')}`)
    }
  }

  return {
    // Permission checks
    can,
    requirePermission,

    // Role checks
    hasRole,
    requireRole,
    hasAdminAccess,
    isAdmin,
    isStaff,
    isTeacher,
    isParent,
    isStudent,
    userRole,

    // User info
    permissions,
    fullName,
    initials,
    isProfileLoaded,

    // Actions
    ensureProfile,
  }
}
