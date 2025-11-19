import { defineStore } from 'pinia'
import type { UserProfile, UserRole, Permissions } from '~/types/auth'
import { getPermissionsForRole, hasAnyRole } from '~/types/auth'

interface AuthState {
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    userProfile: null,
    loading: false,
    error: null
  }),

  getters: {
    /**
     * Check if user is an admin
     */
    isAdmin: (state): boolean => state.userProfile?.user_role === 'admin',

    /**
     * Check if user is a teacher
     */
    isTeacher: (state): boolean => state.userProfile?.user_role === 'teacher',

    /**
     * Check if user is staff
     */
    isStaff: (state): boolean => state.userProfile?.user_role === 'staff',

    /**
     * Check if user is a parent
     */
    isParent: (state): boolean => state.userProfile?.user_role === 'parent',

    /**
     * Check if user is a student
     */
    isStudent: (state): boolean => state.userProfile?.user_role === 'student',

    /**
     * Get the current user's role
     */
    userRole: (state): UserRole | null => state.userProfile?.user_role || null,

    /**
     * Check if user has any of the specified roles
     */
    hasRole: (state) => (roles: UserRole[]): boolean => {
      if (!state.userProfile) return false
      return hasAnyRole(state.userProfile.user_role, roles)
    },

    /**
     * Check if user has admin or staff access
     */
    hasAdminAccess: (state): boolean => {
      if (!state.userProfile) return false
      return hasAnyRole(state.userProfile.user_role, ['admin', 'staff'])
    },

    /**
     * Get all permissions for current user
     */
    permissions: (state): Permissions | null => {
      if (!state.userProfile) return null
      return getPermissionsForRole(state.userProfile.user_role)
    },

    /**
     * Check if user has a specific permission
     */
    can: (state) => (permission: keyof Permissions): boolean => {
      if (!state.userProfile) return false
      const permissions = getPermissionsForRole(state.userProfile.user_role)
      return permissions[permission]
    },

    /**
     * Get user's full name
     */
    fullName: (state): string => {
      if (!state.userProfile) return ''
      const { first_name, last_name } = state.userProfile
      if (first_name && last_name) return `${first_name} ${last_name}`
      if (first_name) return first_name
      if (last_name) return last_name
      return state.userProfile.email || ''
    },

    /**
     * Get user's initials
     */
    initials: (state): string => {
      if (!state.userProfile) return ''
      const { first_name, last_name, email } = state.userProfile
      if (first_name && last_name) {
        return `${first_name[0]}${last_name[0]}`.toUpperCase()
      }
      if (first_name) return first_name[0].toUpperCase()
      if (email) return email[0].toUpperCase()
      return ''
    },

    /**
     * Check if user profile is loaded
     */
    isProfileLoaded: (state): boolean => state.userProfile !== null,
  },

  actions: {
    /**
     * Fetch the current user's profile from database
     */
    async fetchUserProfile(): Promise<UserProfile | null> {
      const client = useSupabaseClient()
      const user = useSupabaseUser()

      if (!user.value) {
        this.userProfile = null
        return null
      }

      this.loading = true
      this.error = null

      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', user.value.id)
          .single()

        if (error) throw error

        this.userProfile = data as UserProfile
        return data as UserProfile
      } catch (error: any) {
        this.error = error.message
        console.error('Error fetching user profile:', error)
        this.userProfile = null
        return null
      } finally {
        this.loading = false
      }
    },

    /**
     * Clear user profile (on logout)
     * Also clears all cached data for this user to prevent cross-user leaks
     */
    async clearProfile() {
      // Clear user-specific cache from IndexedDB
      if (this.userProfile?.id) {
        try {
          const { offlineStorage } = await import('~/utils/offlineStorage')
          await offlineStorage.clearUserData(this.userProfile.id)
        } catch (error) {
          console.error('Error clearing user cache:', error)
        }
      }

      // Clear service worker caches for this user
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames
              .filter(name => name.includes('api-cache') || name.includes('supabase'))
              .map(name => caches.delete(name))
          )
        } catch (error) {
          console.error('Error clearing service worker caches:', error)
        }
      }

      this.userProfile = null
      this.error = null
      this.loading = false
    },

    /**
     * Update user profile in store and database
     */
    async updateProfile(updates: Partial<UserProfile>): Promise<boolean> {
      const client = useSupabaseClient()
      const user = useSupabaseUser()

      if (!user.value || !this.userProfile) return false

      this.loading = true
      this.error = null

      try {
        const { data, error } = await client
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.value.id)
          .select()
          .single()

        if (error) throw error

        this.userProfile = data as UserProfile
        return true
      } catch (error: any) {
        this.error = error.message
        console.error('Error updating user profile:', error)
        return false
      } finally {
        this.loading = false
      }
    }
  }
})