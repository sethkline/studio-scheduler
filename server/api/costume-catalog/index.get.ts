/**
 * GET /api/costume-catalog
 *
 * List and search costume catalog with filtering
 *
 * Query params:
 * - vendor_id: Filter by vendor
 * - category: Filter by category (ballet, jazz, etc.)
 * - season: Filter by season
 * - gender: Filter by gender
 * - search: Search in name and description
 * - min_price: Minimum price in cents
 * - max_price: Maximum price in cents
 * - min_age: Minimum age
 * - max_age: Maximum age
 * - availability: Filter by availability status
 * - is_active: Filter active/inactive
 * - page: Page number (default 1)
 * - page_size: Items per page (default 20, max 100)
 */

import { getSupabaseClient } from '~/server/utils/supabase'
import type { CostumeSearchResult } from '~/types/costume-catalog'

export default defineEventHandler(async (event): Promise<CostumeSearchResult> => {
  const client = getSupabaseClient()
  const query = getQuery(event)

  // Parse pagination params
  const page = Math.max(1, parseInt(String(query.page || '1')))
  const pageSize = Math.min(100, Math.max(1, parseInt(String(query.page_size || '20'))))
  const offset = (page - 1) * pageSize

  // Build query
  let builder = client
    .from('costumes')
    .select(`
      *,
      vendor:vendors(*),
      sizes:costume_sizes(*),
      colors:costume_colors(*),
      images:costume_images(*)
    `, { count: 'exact' })
    .order('name', { ascending: true })

  // Apply filters
  if (query.vendor_id) {
    builder = builder.eq('vendor_id', query.vendor_id)
  }

  if (query.category) {
    builder = builder.eq('category', query.category)
  }

  if (query.season) {
    builder = builder.eq('season', query.season)
  }

  if (query.gender) {
    builder = builder.eq('gender', query.gender)
  }

  if (query.search) {
    builder = builder.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%,vendor_sku.ilike.%${query.search}%`)
  }

  if (query.min_price) {
    builder = builder.gte('price_cents', parseInt(String(query.min_price)))
  }

  if (query.max_price) {
    builder = builder.lte('price_cents', parseInt(String(query.max_price)))
  }

  if (query.min_age) {
    builder = builder.gte('min_age', parseInt(String(query.min_age)))
  }

  if (query.max_age) {
    builder = builder.lte('max_age', parseInt(String(query.max_age)))
  }

  if (query.availability) {
    builder = builder.eq('availability', query.availability)
  }

  if (query.is_active !== undefined) {
    builder = builder.eq('is_active', query.is_active === 'true')
  } else {
    // Default to showing only active costumes
    builder = builder.eq('is_active', true)
  }

  // Apply pagination
  builder = builder.range(offset, offset + pageSize - 1)

  const { data, error, count } = await builder

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch costumes: ${error.message}`
    })
  }

  const total = count || 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    costumes: data || [],
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages
  }
})
