// server/api/orders/index.post.ts

/**
 * ⚠️ DEPRECATED - DO NOT USE ⚠️
 *
 * This endpoint has been deprecated due to:
 * 1. SECURITY: Uses service key (getSupabaseClient) bypassing RLS
 * 2. SCHEMA: Uses outdated schema (seat_reservations, recital_show_id)
 * 3. REPLACEMENT: New endpoint available at /api/public/orders
 *
 * This endpoint has been disabled to prevent security vulnerabilities.
 * Please migrate to the new ticketing system API.
 *
 * Date Deprecated: 2025-11-17
 * Reason: Critical security fix - PII exposure via service key bypass
 */

export default defineEventHandler(async (event) => {
  throw createError({
    statusCode: 410, // 410 Gone - indicates resource is permanently unavailable
    statusMessage: 'This endpoint has been deprecated',
    message: 'This API endpoint is no longer available. Please use /api/public/orders instead. Contact support if you need assistance migrating.'
  })
})

/*
 * ORIGINAL IMPLEMENTATION (DISABLED FOR SECURITY)
 *
 * Security Issues:
 * - Used getSupabaseClient() (service key) instead of serverSupabaseClient()
 * - Bypassed Row-Level Security (RLS) policies
 * - No authentication/authorization checks
 * - Could expose PII to unauthorized users
 * - No rate limiting
 *
 * The original code has been removed to prevent accidental re-enablement.
 * Git history contains the full implementation if needed for reference.
 *
 * See: /server/api/public/orders/index.post.ts for the secure replacement
 */
