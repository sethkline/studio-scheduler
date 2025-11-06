// server/utils/analyticsCache.ts
// In-memory cache for analytics queries
// Reduces database load by caching expensive analytics calculations

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class AnalyticsCache {
  private cache: Map<string, CacheEntry<any>>
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

  constructor() {
    this.cache = new Map()

    // Clean up expired entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000)
  }

  /**
   * Get cached data if available and not expired
   * @param key - Cache key
   * @param ttl - Time to live in milliseconds (default: 5 minutes)
   * @returns Cached data or null if not found/expired
   */
  get<T>(key: string, ttl: number = this.DEFAULT_TTL): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if entry has expired
    const age = Date.now() - entry.timestamp
    if (age > ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set cached data
   * @param key - Cache key
   * @param data - Data to cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Get cached data or execute function and cache result
   * @param key - Cache key
   * @param fn - Function to execute if cache miss
   * @param ttl - Time to live in milliseconds
   * @returns Cached or fresh data
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key, ttl)
    if (cached !== null) {
      return cached
    }

    // Cache miss - execute function
    const data = await fn()
    this.set(key, data)
    return data
  }

  /**
   * Invalidate a specific cache key
   * @param key - Cache key to invalidate
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Invalidate all cache keys matching a pattern
   * @param pattern - String pattern to match (simple substring match)
   */
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      // Use longest TTL for cleanup (1 hour)
      if (now - entry.timestamp > 60 * 60 * 1000) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   * @returns Cache size and hit rate info
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  /**
   * Generate cache key from parameters
   * @param prefix - Key prefix (e.g., 'revenue', 'enrollment')
   * @param params - Query parameters
   * @returns Standardized cache key
   */
  static generateKey(prefix: string, params: Record<string, any> = {}): string {
    // Sort params for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')

    return sortedParams ? `${prefix}:${sortedParams}` : prefix
  }
}

// Export singleton instance
export const analyticsCache = new AnalyticsCache()

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  SHORT: 2 * 60 * 1000,      // 2 minutes - for frequently changing data
  MEDIUM: 5 * 60 * 1000,     // 5 minutes - default for most analytics
  LONG: 15 * 60 * 1000,      // 15 minutes - for slower-changing data
  VERY_LONG: 60 * 60 * 1000  // 1 hour - for historical data that rarely changes
} as const

/**
 * Helper function to wrap analytics queries with caching
 * @param key - Cache key
 * @param queryFn - Query function to execute
 * @param ttl - Cache TTL (default: 5 minutes)
 * @returns Query result (cached or fresh)
 */
export async function withCache<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> {
  return analyticsCache.getOrSet(key, queryFn, ttl)
}

/**
 * Invalidate analytics cache when data changes
 * Call this after creating/updating enrollments, payments, etc.
 * @param type - Type of data that changed ('enrollment', 'revenue', 'all')
 */
export function invalidateAnalyticsCache(type: 'enrollment' | 'revenue' | 'retention' | 'class' | 'teacher' | 'all'): void {
  if (type === 'all') {
    analyticsCache.clear()
  } else {
    analyticsCache.invalidatePattern(type)
  }
}
