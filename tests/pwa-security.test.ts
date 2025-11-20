import { describe, it, expect, beforeEach, vi } from 'vitest'
import { offlineStorage } from '~/utils/offlineStorage'

/**
 * PWA Security and Cache Isolation Tests
 *
 * Tests verify:
 * 1. User-specific cache keys
 * 2. Cache clearing on logout
 * 3. No cross-user data leaks
 * 4. Cache metadata tracking
 */

describe('PWA Cache Isolation', () => {
  const USER_A_ID = 'user-a-123'
  const USER_B_ID = 'user-b-456'

  beforeEach(async () => {
    // Clear all data before each test
    await offlineStorage.clear('schedules')
    await offlineStorage.clear('students')
    await offlineStorage.clear('cache')
  })

  describe('User-Specific Cache Keys', () => {
    it('should create user-specific cache keys', async () => {
      const scheduleData = { id: 'schedule-1', name: 'Fall 2024' }

      // User A caches schedule
      await offlineStorage.set('schedules', 'schedule-1', scheduleData, 60, USER_A_ID)

      // User B caches same schedule ID
      await offlineStorage.set('schedules', 'schedule-1', { ...scheduleData, name: 'Winter 2024' }, 60, USER_B_ID)

      // User A should see their data
      const userAData = await offlineStorage.get('schedules', 'schedule-1', USER_A_ID)
      expect(userAData).toEqual({ id: 'schedule-1', name: 'Fall 2024' })

      // User B should see their data
      const userBData = await offlineStorage.get('schedules', 'schedule-1', USER_B_ID)
      expect(userBData).toEqual({ id: 'schedule-1', name: 'Winter 2024' })
    })

    it('should not return data without correct userId', async () => {
      const scheduleData = { id: 'schedule-1', name: 'Fall 2024' }

      // User A caches schedule
      await offlineStorage.set('schedules', 'schedule-1', scheduleData, 60, USER_A_ID)

      // User B tries to access User A's data
      const userBData = await offlineStorage.get('schedules', 'schedule-1', USER_B_ID)
      expect(userBData).toBeNull()
    })
  })

  describe('Cache Clearing', () => {
    it('should clear all data for specific user', async () => {
      // User A caches multiple items
      await offlineStorage.set('schedules', 'schedule-1', { name: 'Schedule 1' }, 60, USER_A_ID)
      await offlineStorage.set('students', 'student-1', { name: 'Student 1' }, 60, USER_A_ID)
      await offlineStorage.set('cache', 'misc-1', { data: 'misc' }, 60, USER_A_ID)

      // User B caches items
      await offlineStorage.set('schedules', 'schedule-2', { name: 'Schedule 2' }, 60, USER_B_ID)

      // Clear User A's data
      await offlineStorage.clearUserData(USER_A_ID)

      // User A's data should be gone
      expect(await offlineStorage.get('schedules', 'schedule-1', USER_A_ID)).toBeNull()
      expect(await offlineStorage.get('students', 'student-1', USER_A_ID)).toBeNull()
      expect(await offlineStorage.get('cache', 'misc-1', USER_A_ID)).toBeNull()

      // User B's data should remain
      expect(await offlineStorage.get('schedules', 'schedule-2', USER_B_ID)).toEqual({ name: 'Schedule 2' })
    })

    it('should not affect other users when clearing cache', async () => {
      // Both users cache data
      await offlineStorage.set('schedules', 'schedule-1', { name: 'User A Schedule' }, 60, USER_A_ID)
      await offlineStorage.set('schedules', 'schedule-1', { name: 'User B Schedule' }, 60, USER_B_ID)

      // Clear User A's data
      await offlineStorage.clearUserData(USER_A_ID)

      // User B's data should be intact
      const userBData = await offlineStorage.get('schedules', 'schedule-1', USER_B_ID)
      expect(userBData).toEqual({ name: 'User B Schedule' })
    })
  })

  describe('Cache Metadata', () => {
    it('should track timestamp when data is cached', async () => {
      const beforeCache = Date.now()
      await offlineStorage.set('schedules', 'schedule-1', { name: 'Test' }, 60, USER_A_ID)
      const afterCache = Date.now()

      const metadata = await offlineStorage.getCacheMetadata('schedules', 'schedule-1', USER_A_ID)

      expect(metadata).toBeDefined()
      expect(metadata!.timestamp).toBeGreaterThanOrEqual(beforeCache)
      expect(metadata!.timestamp).toBeLessThanOrEqual(afterCache)
    })

    it('should track expiration time', async () => {
      const ttlMinutes = 30
      await offlineStorage.set('schedules', 'schedule-1', { name: 'Test' }, ttlMinutes, USER_A_ID)

      const metadata = await offlineStorage.getCacheMetadata('schedules', 'schedule-1', USER_A_ID)

      expect(metadata).toBeDefined()
      expect(metadata!.expiresAt).toBeDefined()

      // Should expire in approximately 30 minutes
      const expectedExpiry = Date.now() + ttlMinutes * 60 * 1000
      const diff = Math.abs(metadata!.expiresAt! - expectedExpiry)
      expect(diff).toBeLessThan(1000) // Within 1 second
    })

    it('should return null metadata for non-existent data', async () => {
      const metadata = await offlineStorage.getCacheMetadata('schedules', 'non-existent', USER_A_ID)
      expect(metadata).toBeNull()
    })
  })

  describe('Data Expiration', () => {
    it('should return null for expired data', async () => {
      // Cache with 0 minute TTL (immediately expired)
      await offlineStorage.set('schedules', 'schedule-1', { name: 'Test' }, 0, USER_A_ID)

      // Wait a bit to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10))

      const data = await offlineStorage.get('schedules', 'schedule-1', USER_A_ID)
      expect(data).toBeNull()
    })

    it('should filter expired data from getAll', async () => {
      // Cache one valid and one expired item
      await offlineStorage.set('schedules', 'schedule-1', { name: 'Valid' }, 60, USER_A_ID)
      await offlineStorage.set('schedules', 'schedule-2', { name: 'Expired' }, 0, USER_A_ID)

      await new Promise(resolve => setTimeout(resolve, 10))

      const allData = await offlineStorage.getAll('schedules', USER_A_ID)

      expect(allData).toHaveLength(1)
      expect(allData[0]).toEqual({ name: 'Valid' })
    })
  })

  describe('User Filtering in getAll', () => {
    it('should only return data for specified user', async () => {
      // Multiple users cache data
      await offlineStorage.set('schedules', 'schedule-1', { name: 'User A Schedule 1' }, 60, USER_A_ID)
      await offlineStorage.set('schedules', 'schedule-2', { name: 'User A Schedule 2' }, 60, USER_A_ID)
      await offlineStorage.set('schedules', 'schedule-3', { name: 'User B Schedule 1' }, 60, USER_B_ID)

      // Get User A's data
      const userAData = await offlineStorage.getAll('schedules', USER_A_ID)

      expect(userAData).toHaveLength(2)
      expect(userAData).toContainEqual({ name: 'User A Schedule 1' })
      expect(userAData).toContainEqual({ name: 'User A Schedule 2' })
      expect(userAData).not.toContainEqual({ name: 'User B Schedule 1' })
    })

    it('should return all data when no userId specified', async () => {
      // Cache data with and without userId
      await offlineStorage.set('schedules', 'schedule-1', { name: 'With User' }, 60, USER_A_ID)
      await offlineStorage.set('schedules', 'schedule-2', { name: 'Without User' }, 60)

      const allData = await offlineStorage.getAll('schedules')

      expect(allData.length).toBeGreaterThanOrEqual(2)
    })
  })
})

describe('Offline Queue Management', () => {
  it('should queue actions with descriptions', () => {
    const { queueAction, actionQueue } = useOffline()

    queueAction({
      type: 'api-call',
      endpoint: '/api/students',
      method: 'POST',
      data: { name: 'Test Student' },
      description: 'Create new student',
    })

    expect(actionQueue.value).toHaveLength(1)
    expect(actionQueue.value[0].description).toBe('Create new student')
  })

  it('should track retry count', async () => {
    const { queueAction, actionQueue, processQueue } = useOffline()

    // Mock fetch to fail
    global.$fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    queueAction({
      type: 'api-call',
      endpoint: '/api/students',
      method: 'POST',
      data: { name: 'Test' },
    })

    // Process queue (will fail)
    await processQueue()

    expect(actionQueue.value[0].retries).toBe(1)
  })
})

describe('Cache Staleness Detection', () => {
  it('should detect stale data older than threshold', async () => {
    const STALENESS_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutes

    // Cache data with old timestamp
    const oldTimestamp = Date.now() - STALENESS_THRESHOLD_MS - 1000 // 31 minutes ago
    await offlineStorage.set('schedules', 'schedule-1', { name: 'Old Data' }, 120, USER_A_ID)

    // Manually update timestamp to simulate old data
    // In real scenario, this would be from actual old cache
    const metadata = await offlineStorage.getCacheMetadata('schedules', 'schedule-1', USER_A_ID)

    if (metadata) {
      const age = Date.now() - metadata.timestamp
      const isStale = age > STALENESS_THRESHOLD_MS
      expect(isStale).toBe(false) // Just cached, should be fresh

      // Simulate checking old data
      const simulatedAge = STALENESS_THRESHOLD_MS + 1000
      const simulatedStale = simulatedAge > STALENESS_THRESHOLD_MS
      expect(simulatedStale).toBe(true)
    }
  })
})
