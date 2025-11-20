// server/middleware/studio-context.ts
import type { H3Event } from 'h3'

/**
 * Studio Context Middleware
 * Sets studio_id in event.context based on:
 * 1. Subdomain (tenant.example.com)
 * 2. User's primary studio
 * 3. Query parameter (?studio_id=xxx) - for development/testing
 */
export default defineEventHandler(async (event: H3Event) => {
  // Skip if studio context is already set
  if (event.context.studioId) {
    return
  }

  try {
    // Initialize studioId as null
    let studioId: string | null = null

    // Strategy 1: Check for studio_id in query parameters (dev/testing only)
    // This allows explicit studio switching in development
    const query = getQuery(event)
    if (query.studio_id && typeof query.studio_id === 'string') {
      studioId = query.studio_id
    }

    // Strategy 2: Extract from subdomain (e.g., tenant.example.com)
    // Only if not already set by query param
    if (!studioId) {
      const host = getRequestHeader(event, 'host') || ''
      const subdomain = extractSubdomain(host)

      if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
        // Look up studio by slug
        const client = await serverSupabaseClient(event)
        const { data: studio } = await client
          .from('studios')
          .select('id')
          .eq('slug', subdomain)
          .eq('subscription_status', 'active')
          .is('deleted_at', null)
          .single()

        if (studio) {
          studioId = studio.id
        }
      }
    }

    // Strategy 3: Get user's primary studio (fallback)
    // Only if not already set and user is authenticated
    if (!studioId) {
      const user = await serverSupabaseUser(event)

      if (user) {
        const client = await serverSupabaseClient(event)
        const { data: profile } = await client
          .from('profiles')
          .select('primary_studio_id')
          .eq('id', user.id)
          .single()

        if (profile?.primary_studio_id) {
          studioId = profile.primary_studio_id
        }
      }
    }

    // Set studio context if we found one
    if (studioId) {
      event.context.studioId = studioId
    }
  } catch (error) {
    // Log error but don't fail the request
    console.error('Error setting studio context:', error)
  }
})

/**
 * Extract subdomain from host header
 * Examples:
 *   bella.mystudio.com -> bella
 *   mystudio.com -> null
 *   www.mystudio.com -> www
 *   localhost:3000 -> null
 */
function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0]

  // Split by dots
  const parts = hostWithoutPort.split('.')

  // Need at least 3 parts for a subdomain (subdomain.domain.tld)
  // e.g., bella.mystudio.com
  if (parts.length >= 3) {
    return parts[0]
  }

  // No subdomain found
  return null
}
