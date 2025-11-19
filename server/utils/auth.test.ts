// server/utils/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'
import {
  getServerUser,
  getCurrentUser,
  getUserProfile,
  requireAuth,
  requireAdmin,
  requireAdminOrStaff,
  requireRole
} from './auth'

// Mock serverSupabaseClient
vi.mock('#imports', () => ({
  serverSupabaseClient: vi.fn(),
  createError: vi.fn((opts) => new Error(opts.statusMessage))
}))

describe('Auth Utilities', () => {
  let mockEvent: Partial<H3Event>
  let mockClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockEvent = {}
    mockClient = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }
  })

  describe('getServerUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      const user = await getServerUser(mockEvent as H3Event)
      expect(user).toEqual(mockUser)
    })

    it('should return null when not authenticated', async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null }
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      const user = await getServerUser(mockEvent as H3Event)
      expect(user).toBeNull()
    })
  })

  describe('getCurrentUser', () => {
    it('should be an alias for getServerUser', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      const user = await getCurrentUser(mockEvent as H3Event)
      expect(user).toEqual(mockUser)
    })
  })

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      const user = await requireAuth(mockEvent as H3Event)
      expect(user).toEqual(mockUser)
    })

    it('should throw 401 when not authenticated', async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null }
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      await expect(requireAuth(mockEvent as H3Event)).rejects.toThrow('Unauthorized')
    })
  })

  describe('requireAdmin', () => {
    it('should return profile when user is admin', async () => {
      const mockUser = { id: '123', email: 'admin@example.com' }
      const mockProfile = { id: '123', user_role: 'admin', email: 'admin@example.com' }

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      const profile = await requireAdmin(mockEvent as H3Event)
      expect(profile).toEqual(mockProfile)
    })

    it('should throw 403 when user is not admin', async () => {
      const mockUser = { id: '123', email: 'user@example.com' }
      const mockProfile = { id: '123', user_role: 'parent', email: 'user@example.com' }

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      await expect(requireAdmin(mockEvent as H3Event)).rejects.toThrow('Forbidden')
    })

    it('should throw 401 when not authenticated', async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null }
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      await expect(requireAdmin(mockEvent as H3Event)).rejects.toThrow('Unauthorized')
    })
  })

  describe('requireAdminOrStaff', () => {
    it('should return profile when user is admin', async () => {
      const mockUser = { id: '123', email: 'admin@example.com' }
      const mockProfile = { id: '123', user_role: 'admin', email: 'admin@example.com' }

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      const profile = await requireAdminOrStaff(mockEvent as H3Event)
      expect(profile).toEqual(mockProfile)
    })

    it('should return profile when user is staff', async () => {
      const mockUser = { id: '123', email: 'staff@example.com' }
      const mockProfile = { id: '123', user_role: 'staff', email: 'staff@example.com' }

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      const profile = await requireAdminOrStaff(mockEvent as H3Event)
      expect(profile).toEqual(mockProfile)
    })

    it('should throw 403 when user is parent', async () => {
      const mockUser = { id: '123', email: 'parent@example.com' }
      const mockProfile = { id: '123', user_role: 'parent', email: 'parent@example.com' }

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      await expect(requireAdminOrStaff(mockEvent as H3Event)).rejects.toThrow('Forbidden')
    })
  })

  describe('requireRole', () => {
    it('should return profile when user has required role', async () => {
      const mockUser = { id: '123', email: 'parent@example.com' }
      const mockProfile = { id: '123', user_role: 'parent', email: 'parent@example.com' }

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      const profile = await requireRole(mockEvent as H3Event, ['parent', 'admin'])
      expect(profile).toEqual(mockProfile)
    })

    it('should throw 403 when user does not have required role', async () => {
      const mockUser = { id: '123', email: 'student@example.com' }
      const mockProfile = { id: '123', user_role: 'student', email: 'student@example.com' }

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })

      const { serverSupabaseClient } = await import('#imports')
      vi.mocked(serverSupabaseClient).mockResolvedValue(mockClient)

      await expect(requireRole(mockEvent as H3Event, ['admin', 'staff'])).rejects.toThrow('Forbidden')
    })
  })
})
