/**
 * POST /api/costume-catalog/assignments
 *
 * Assign a costume to a recital performance
 *
 * Body:
 * - performance_id: ID of the recital performance
 * - costume_id: ID of the catalog costume
 * - is_primary: Whether this is the primary costume
 * - notes: Optional notes
 * - quantity_needed: Optional quantity
 */

import { getSupabaseClient } from '~/server/utils/supabase'
import type { AssignCostumeToPerformanceRequest, PerformanceCostume } from '~/types/costume-catalog'

export default defineEventHandler(async (event): Promise<PerformanceCostume> => {
  const client = getSupabaseClient()
  const body = await readBody<AssignCostumeToPerformanceRequest>(event)

  // Validate required fields
  if (!body.performance_id || !body.costume_id) {
    throw createError({
      statusCode: 400,
      message: 'performance_id and costume_id are required'
    })
  }

  // Get the performance to determine studio_id
  const { data: performance, error: perfError } = await client
    .from('recital_performances')
    .select('id, recital_id, recital_shows!inner(studio_id)')
    .eq('id', body.performance_id)
    .single()

  if (perfError || !performance) {
    throw createError({
      statusCode: 404,
      message: 'Performance not found'
    })
  }

  // @ts-ignore - Nested relation access
  const studioId = performance.recital_shows?.studio_id

  if (!studioId) {
    throw createError({
      statusCode: 500,
      message: 'Could not determine studio for performance'
    })
  }

  // Create the assignment
  const { data, error } = await client
    .from('performance_costumes')
    .insert({
      studio_id: studioId,
      performance_id: body.performance_id,
      costume_id: body.costume_id,
      is_primary: body.is_primary ?? true,
      notes: body.notes,
      quantity_needed: body.quantity_needed
    })
    .select(`
      *,
      costume:costumes(
        *,
        vendor:vendors(*),
        sizes:costume_sizes(*),
        colors:costume_colors(*),
        images:costume_images(*)
      )
    `)
    .single()

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      throw createError({
        statusCode: 409,
        message: 'This costume is already assigned to this performance'
      })
    }
    throw createError({
      statusCode: 500,
      message: `Failed to assign costume: ${error.message}`
    })
  }

  return data as PerformanceCostume
})
