// tests/stores/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../stores/auth'
import type { UserProfile } from '~/types/auth'

// Mock Supabase composables
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
}

const mockSupabaseUser = {
  value: null as any
}

vi.mock('#app', () => ({
  useSupabaseClient: () => mockSupabaseClient,
  useSupabaseUser: () => mockSupabaseUser
}))

describe('Auth Store', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())

    // Reset mocks
    vi.clearAllMocks()
    mockSupabaseUser.value = null
  })

  describe('Initial State', () => {
    it('should have null userProfile initially', () => {
      const store = useAuthStore()
      expect(store.userProfile).toBeNull()
    })

    it('should not be loading initially', () => {
      const store = useAuthStore()
      expect(store.loading).toBe(false)
    })

    it('should have no error initially', () => {
      const store = useAuthStore()
      expect(store.error).toBeNull()
    })
  })

  describe('Getters', () => {
    describe('Role checks', () => {
      it('should identify admin users', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'admin@test.com',
          user_role: 'admin',
          first_name: 'Admin',
          last_name: 'User'
        } as UserProfile

        expect(store.isAdmin).toBe(true)
        expect(store.isTeacher).toBe(false)
        expect(store.isStaff).toBe(false)
        expect(store.isParent).toBe(false)
        expect(store.isStudent).toBe(false)
      })

      it('should identify teacher users', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'teacher@test.com',
          user_role: 'teacher',
          first_name: 'Teacher',
          last_name: 'User'
        } as UserProfile

        expect(store.isTeacher).toBe(true)
        expect(store.isAdmin).toBe(false)
      })

      it('should identify staff users', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'staff@test.com',
          user_role: 'staff',
          first_name: 'Staff',
          last_name: 'User'
        } as UserProfile

        expect(store.isStaff).toBe(true)
        expect(store.isAdmin).toBe(false)
      })

      it('should identify parent users', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'parent@test.com',
          user_role: 'parent',
          first_name: 'Parent',
          last_name: 'User'
        } as UserProfile

        expect(store.isParent).toBe(true)
        expect(store.isAdmin).toBe(false)
      })

      it('should identify student users', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'student@test.com',
          user_role: 'student',
          first_name: 'Student',
          last_name: 'User'
        } as UserProfile

        expect(store.isStudent).toBe(true)
        expect(store.isAdmin).toBe(false)
      })
    })

    describe('hasRole', () => {
      it('should return true for matching roles', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'admin@test.com',
          user_role: 'admin'
        } as UserProfile

        expect(store.hasRole(['admin', 'staff'])).toBe(true)
      })

      it('should return false for non-matching roles', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'parent@test.com',
          user_role: 'parent'
        } as UserProfile

        expect(store.hasRole(['admin', 'staff'])).toBe(false)
      })

      it('should return false when no user profile exists', () => {
        const store = useAuthStore()
        expect(store.hasRole(['admin'])).toBe(false)
      })
    })

    describe('hasAdminAccess', () => {
      it('should return true for admin users', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          user_role: 'admin'
        } as UserProfile

        expect(store.hasAdminAccess).toBe(true)
      })

      it('should return true for staff users', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          user_role: 'staff'
        } as UserProfile

        expect(store.hasAdminAccess).toBe(true)
      })

      it('should return false for other roles', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          user_role: 'teacher'
        } as UserProfile

        expect(store.hasAdminAccess).toBe(false)
      })
    })

    describe('fullName', () => {
      it('should return full name when both first and last name exist', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'user@test.com',
          first_name: 'John',
          last_name: 'Doe',
          user_role: 'admin'
        } as UserProfile

        expect(store.fullName).toBe('John Doe')
      })

      it('should return first name only when last name is missing', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'user@test.com',
          first_name: 'John',
          user_role: 'admin'
        } as UserProfile

        expect(store.fullName).toBe('John')
      })

      it('should return email when no name exists', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'user@test.com',
          user_role: 'admin'
        } as UserProfile

        expect(store.fullName).toBe('user@test.com')
      })

      it('should return empty string when no profile exists', () => {
        const store = useAuthStore()
        expect(store.fullName).toBe('')
      })
    })

    describe('initials', () => {
      it('should return initials from first and last name', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'user@test.com',
          first_name: 'John',
          last_name: 'Doe',
          user_role: 'admin'
        } as UserProfile

        expect(store.initials).toBe('JD')
      })

      it('should return first letter of first name when last name is missing', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'user@test.com',
          first_name: 'John',
          user_role: 'admin'
        } as UserProfile

        expect(store.initials).toBe('J')
      })

      it('should return first letter of email when no name exists', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          email: 'user@test.com',
          user_role: 'admin'
        } as UserProfile

        expect(store.initials).toBe('U')
      })
    })

    describe('permissions', () => {
      it('should return permissions for admin role', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          user_role: 'admin'
        } as UserProfile

        const permissions = store.permissions
        expect(permissions).toBeTruthy()
        expect(permissions?.canManageStudents).toBe(true)
        expect(permissions?.canManageTeachers).toBe(true)
        expect(permissions?.canManageClasses).toBe(true)
      })

      it('should return null when no profile exists', () => {
        const store = useAuthStore()
        expect(store.permissions).toBeNull()
      })
    })

    describe('can', () => {
      it('should check specific permissions', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          user_role: 'admin'
        } as UserProfile

        expect(store.can('canManageStudents')).toBe(true)
      })

      it('should return false for missing permissions', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          user_role: 'parent'
        } as UserProfile

        expect(store.can('canManageTeachers')).toBe(false)
      })
    })
  })

  describe('Actions', () => {
    describe('fetchUserProfile', () => {
      it('should fetch user profile successfully', async () => {
        const store = useAuthStore()
        const mockProfile: UserProfile = {
          id: 'test-user-id',
          email: 'user@test.com',
          user_role: 'admin',
          first_name: 'Test',
          last_name: 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        mockSupabaseUser.value = { id: 'test-user-id' }

        const mockSelect = vi.fn().mockReturnThis()
        const mockEq = vi.fn().mockReturnThis()
        const mockSingle = vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })

        mockSupabaseClient.from.mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          single: mockSingle
        })

        const result = await store.fetchUserProfile()

        expect(result).toEqual(mockProfile)
        expect(store.userProfile).toEqual(mockProfile)
        expect(store.loading).toBe(false)
        expect(store.error).toBeNull()
      })

      it('should return null when no user is logged in', async () => {
        const store = useAuthStore()
        mockSupabaseUser.value = null

        const result = await store.fetchUserProfile()

        expect(result).toBeNull()
        expect(store.userProfile).toBeNull()
      })

      it('should handle fetch errors', async () => {
        const store = useAuthStore()
        mockSupabaseUser.value = { id: 'test-user-id' }

        const mockError = { message: 'Database error' }
        const mockSelect = vi.fn().mockReturnThis()
        const mockEq = vi.fn().mockReturnThis()
        const mockSingle = vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })

        mockSupabaseClient.from.mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          single: mockSingle
        })

        const result = await store.fetchUserProfile()

        expect(result).toBeNull()
        expect(store.userProfile).toBeNull()
        expect(store.error).toBe('Database error')
        expect(store.loading).toBe(false)
      })
    })

    describe('clearProfile', () => {
      it('should clear user profile and reset state', () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user',
          user_role: 'admin'
        } as UserProfile
        store.error = 'Some error'
        store.loading = true

        store.clearProfile()

        expect(store.userProfile).toBeNull()
        expect(store.error).toBeNull()
        expect(store.loading).toBe(false)
      })
    })

    describe('updateProfile', () => {
      it('should update user profile successfully', async () => {
        const store = useAuthStore()
        const initialProfile: UserProfile = {
          id: 'test-user-id',
          email: 'user@test.com',
          user_role: 'admin',
          first_name: 'Test',
          last_name: 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        store.userProfile = initialProfile
        mockSupabaseUser.value = { id: 'test-user-id' }

        const updatedProfile = {
          ...initialProfile,
          first_name: 'Updated',
          last_name: 'Name'
        }

        const mockUpdate = vi.fn().mockReturnThis()
        const mockEq = vi.fn().mockReturnThis()
        const mockSelect = vi.fn().mockReturnThis()
        const mockSingle = vi.fn().mockResolvedValue({
          data: updatedProfile,
          error: null
        })

        mockSupabaseClient.from.mockReturnValue({
          update: mockUpdate,
          eq: mockEq,
          select: mockSelect,
          single: mockSingle
        })

        const result = await store.updateProfile({
          first_name: 'Updated',
          last_name: 'Name'
        })

        expect(result).toBe(true)
        expect(store.userProfile).toEqual(updatedProfile)
        expect(store.loading).toBe(false)
        expect(store.error).toBeNull()
      })

      it('should return false when no user is logged in', async () => {
        const store = useAuthStore()
        mockSupabaseUser.value = null

        const result = await store.updateProfile({ first_name: 'Test' })

        expect(result).toBe(false)
      })

      it('should return false when no profile exists', async () => {
        const store = useAuthStore()
        mockSupabaseUser.value = { id: 'test-user-id' }
        store.userProfile = null

        const result = await store.updateProfile({ first_name: 'Test' })

        expect(result).toBe(false)
      })

      it('should handle update errors', async () => {
        const store = useAuthStore()
        store.userProfile = {
          id: 'test-user-id',
          user_role: 'admin'
        } as UserProfile
        mockSupabaseUser.value = { id: 'test-user-id' }

        const mockError = { message: 'Update failed' }
        const mockUpdate = vi.fn().mockReturnThis()
        const mockEq = vi.fn().mockReturnThis()
        const mockSelect = vi.fn().mockReturnThis()
        const mockSingle = vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })

        mockSupabaseClient.from.mockReturnValue({
          update: mockUpdate,
          eq: mockEq,
          select: mockSelect,
          single: mockSingle
        })

        const result = await store.updateProfile({ first_name: 'Test' })

        expect(result).toBe(false)
        expect(store.error).toBe('Update failed')
        expect(store.loading).toBe(false)
      })
    })
  })
})
