// server/utils/analyticsHelpers.ts
// Helper utilities for analytics API endpoints

import { analyticsCache, CACHE_TTL } from './analyticsCache'
import type { H3Event } from 'h3'

/**
 * Wrap analytics query execution with caching and error handling
 * @param event - H3 Event
 * @param cachePrefix - Cache key prefix (e.g., 'revenue', 'enrollment')
 * @param params - Query parameters for cache key
 * @param queryFn - Function to execute analytics query
 * @param cacheTTL - Cache TTL (default: 5 minutes)
 * @returns Query result (cached or fresh)
 */
export async function withAnalyticsCache<T>(
  event: H3Event,
  cachePrefix: string,
  params: Record<string, any>,
  queryFn: () => Promise<T>,
  cacheTTL: number = CACHE_TTL.MEDIUM
): Promise<T> {
  try {
    // Generate cache key
    const cacheKey = analyticsCache.constructor.generateKey(cachePrefix, params)

    // Try to get from cache first
    const cached = analyticsCache.get<T>(cacheKey, cacheTTL)
    if (cached !== null) {
      // Add cache hit header for debugging
      setHeader(event, 'X-Cache', 'HIT')
      return cached
    }

    // Cache miss - execute query
    setHeader(event, 'X-Cache', 'MISS')
    const result = await queryFn()

    // Cache the result
    analyticsCache.set(cacheKey, result)

    return result
  } catch (error: any) {
    // Handle query timeout
    if (error?.code === 'PGRST301' || error?.message?.includes('timeout')) {
      throw createError({
        statusCode: 504,
        statusMessage: 'Analytics query took too long. Try a shorter date range or contact support.'
      })
    }

    // Handle other errors
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to fetch ${cachePrefix} analytics`
    })
  }
}

/**
 * Create AbortController with timeout for Supabase queries
 * @param timeoutMs - Timeout in milliseconds (default: 10 seconds)
 * @returns AbortSignal
 */
export function createQueryTimeout(timeoutMs: number = 10000): AbortSignal {
  return AbortSignal.timeout(timeoutMs)
}

/**
 * Validate date range parameters
 * @param startDate - Start date string
 * @param endDate - End date string
 * @throws Error if dates are invalid or range is too large
 */
export function validateDateRange(startDate: string, endDate: string): void {
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid date format. Use YYYY-MM-DD format.'
    })
  }

  // Check if start is before end
  if (start > end) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Start date must be before end date.'
    })
  }

  // Check if range is too large (max 5 years)
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  if (daysDiff > 365 * 5) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Date range too large. Maximum 5 years allowed.'
    })
  }
}

/**
 * Parse and validate analytics query parameters
 * @param event - H3 Event
 * @returns Validated parameters
 */
export function parseAnalyticsParams(event: H3Event) {
  const query = getQuery(event)
  const { format, subMonths } = await import('date-fns')

  // Parse date range
  const startDate = (query.startDate as string) || format(subMonths(new Date(), 12), 'yyyy-MM-dd')
  const endDate = (query.endDate as string) || format(new Date(), 'yyyy-MM-dd')

  // Validate date range
  validateDateRange(startDate, endDate)

  return {
    startDate,
    endDate,
    period: (query.period as string) || 'month',
    compareYearAgo: query.compareYearAgo === 'true'
  }
}

/**
 * Safe array reduce for potentially null/undefined arrays
 * @param arr - Array to reduce (may be null/undefined)
 * @param fn - Reduce function
 * @param initial - Initial value
 * @returns Reduced value
 */
export function safeReduce<T, U>(
  arr: T[] | null | undefined,
  fn: (acc: U, item: T) => U,
  initial: U
): U {
  if (!arr || arr.length === 0) {
    return initial
  }
  return arr.reduce(fn, initial)
}

/**
 * Calculate percentage safely (avoiding division by zero)
 * @param value - Numerator
 * @param total - Denominator
 * @param decimals - Number of decimal places (default: 2)
 * @returns Percentage value
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 2
): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100 * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Format cents to dollars
 * @param cents - Amount in cents
 * @returns Amount in dollars
 */
export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100
}

/**
 * Group array by key
 * @param arr - Array to group
 * @param keyFn - Function to extract key from item
 * @returns Map of grouped items
 */
export function groupBy<T, K extends string | number>(
  arr: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  for (const item of arr) {
    const key = keyFn(item)
    const group = groups.get(key) || []
    group.push(item)
    groups.set(key, group)
  }
  return groups
}

/**
 * Invalidate analytics cache when data changes
 * Use this in create/update/delete endpoints for enrollments, payments, etc.
 * @param type - Type of analytics to invalidate
 */
export function invalidateCache(type: 'enrollment' | 'revenue' | 'retention' | 'class' | 'teacher' | 'all'): void {
  if (type === 'all') {
    analyticsCache.clear()
  } else {
    analyticsCache.invalidatePattern(type)
  }
}

/**
 * Log slow query for monitoring
 * @param queryName - Name of the query
 * @param durationMs - Duration in milliseconds
 * @param threshold - Slow query threshold (default: 1000ms)
 */
export function logSlowQuery(queryName: string, durationMs: number, threshold: number = 1000): void {
  if (durationMs > threshold) {
    console.warn(`[SLOW QUERY] ${queryName} took ${durationMs}ms (threshold: ${threshold}ms)`)
  }
}

/**
 * Measure query execution time
 * @param queryName - Name of the query
 * @param fn - Query function to execute
 * @returns Query result and duration
 */
export async function measureQuery<T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const startTime = Date.now()
  try {
    const result = await fn()
    const durationMs = Date.now() - startTime
    logSlowQuery(queryName, durationMs)
    return { result, durationMs }
  } catch (error) {
    const durationMs = Date.now() - startTime
    console.error(`[QUERY ERROR] ${queryName} failed after ${durationMs}ms:`, error)
    throw error
  }
}
