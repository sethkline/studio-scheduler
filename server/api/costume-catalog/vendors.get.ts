/**
 * GET /api/costume-catalog/vendors
 *
 * List all active costume vendors
 */

import { getSupabaseClient } from '~/server/utils/supabase'
import type { Vendor } from '~/types/costume-catalog'

export default defineEventHandler(async (event): Promise<Vendor[]> => {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('vendors')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch vendors: ${error.message}`
    })
  }

  return data as Vendor[]
})
