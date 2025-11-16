import { getSupabaseClient } from '~/server/utils/supabase'

/**
 * Update Fee Type
 *
 * PUT /api/fee-types/:id
 *
 * Updates a fee type.
 *
 * @body {
 *   name?: string
 *   description?: string
 *   default_amount_in_cents?: number
 *   due_date?: string (ISO date)
 *   early_bird_amount_in_cents?: number
 *   early_bird_deadline?: string (ISO date)
 *   late_fee_amount_in_cents?: number
 *   late_fee_start_date?: string (ISO date)
 *   is_required?: boolean
 *   is_active?: boolean
 * }
 *
 * @returns {
 *   message: string
 *   feeType: RecitalFeeType
 * }
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const feeTypeId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!feeTypeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Fee type ID is required'
    })
  }

  // Validate fields if provided
  if (body.name !== undefined && !body.name?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Fee type name cannot be empty'
    })
  }

  if (body.default_amount_in_cents !== undefined) {
    if (typeof body.default_amount_in_cents !== 'number' || body.default_amount_in_cents <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Default amount must be a positive number'
      })
    }
  }

  try {
    // Prepare update data (only include fields that are provided)
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.default_amount_in_cents !== undefined) updateData.default_amount_in_cents = body.default_amount_in_cents
    if (body.due_date !== undefined) updateData.due_date = body.due_date || null
    if (body.early_bird_amount_in_cents !== undefined) updateData.early_bird_amount_in_cents = body.early_bird_amount_in_cents || null
    if (body.early_bird_deadline !== undefined) updateData.early_bird_deadline = body.early_bird_deadline || null
    if (body.late_fee_amount_in_cents !== undefined) updateData.late_fee_amount_in_cents = body.late_fee_amount_in_cents || null
    if (body.late_fee_start_date !== undefined) updateData.late_fee_start_date = body.late_fee_start_date || null
    if (body.is_required !== undefined) updateData.is_required = body.is_required
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    updateData.updated_at = new Date().toISOString()

    // Update fee type
    const { data: feeType, error } = await client
      .from('recital_fee_types')
      .update(updateData)
      .eq('id', feeTypeId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Fee type not found'
        })
      }
      console.error('Database error updating fee type:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update fee type'
      })
    }

    return {
      message: 'Fee type updated successfully',
      feeType
    }
  } catch (error: any) {
    console.error('Error updating fee type:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update fee type'
    })
  }
})
