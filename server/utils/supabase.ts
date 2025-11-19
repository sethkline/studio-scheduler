// server/utils/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { useRuntimeConfig } from '#imports'
import type { H3Event } from 'h3'

/**
 * Get a user-scoped Supabase client (RECOMMENDED DEFAULT)
 *
 * This client is authenticated as the current user and respects Row Level Security (RLS) policies.
 * This is the SAFE default for all API endpoints that should respect user permissions.
 *
 * @param event - H3 event containing user session
 * @returns Supabase client authenticated as the current user
 */
export async function getUserSupabaseClient(event: H3Event) {
  return await serverSupabaseClient(event)
}

/**
 * Get a service role Supabase client (USE WITH EXTREME CAUTION)
 *
 * ⚠️ WARNING: This client bypasses Row Level Security (RLS) and has FULL database access.
 *
 * Only use this when:
 * - You need to perform admin operations that must bypass RLS
 * - You have already verified user authorization with requireAuth/requireRole
 * - The operation cannot be performed with user-scoped permissions
 *
 * ALWAYS add a comment justifying why service role is needed.
 *
 * @returns Supabase client with service role privileges (bypasses RLS)
 */
export function getServiceSupabaseClient() {
  const config = useRuntimeConfig()

  const supabaseUrl = config.supabaseUrl
  const supabaseKey = config.supabaseServiceKey

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * @deprecated Use getUserSupabaseClient(event) instead for user-scoped access,
 * or getServiceSupabaseClient() for admin operations (with proper auth checks).
 * This function will be removed in a future version.
 */
export function getSupabaseClient() {
  console.warn('DEPRECATION WARNING: getSupabaseClient() is deprecated. Use getUserSupabaseClient(event) or getServiceSupabaseClient() instead.')
  return getServiceSupabaseClient()
}