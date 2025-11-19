import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Create Fee Type
 *
 * POST /api/recitals/:id/fee-types
 *
 * Creates a new fee type for a recital show.
 *
 * @body {
 *   name: string
 *   fee_type: 'participation' | 'costume' | 'makeup' | 'other'
 *   description?: string
 *   default_amount_in_cents: number
 *   due_date?: string (ISO date)
 *   early_bird_amount_in_cents?: number
 *   early_bird_deadline?: string (ISO date)
 *   late_fee_amount_in_cents?: number
 *   late_fee_start_date?: string (ISO date)
 *   is_required: boolean
 *   is_active: boolean
 * }
 *
 * @returns {
 *   message: string
 *   feeType: RecitalFeeType
 * }
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const recitalShowId = getRouterParam(event, 'id')
  const body = await readBody(event)

  // Validate required fields
  if (!body.name?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Fee type name is required'
    })
  }

  if (!body.fee_type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Fee type category is required'
    })
  }

  if (typeof body.default_amount_in_cents !== 'number' || body.default_amount_in_cents <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Default amount must be a positive number'
    })
  }

  // Validate fee type category
  const validFeeTypes = ['participation', 'costume', 'makeup', 'other']
  if (!validFeeTypes.includes(body.fee_type)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Fee type must be one of: ${validFeeTypes.join(', ')}`
    })
  }

  // Validate early bird logic
  if (body.early_bird_amount_in_cents && !body.early_bird_deadline) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Early bird deadline is required when early bird amount is set'
    })
  }

  if (body.early_bird_deadline && !body.early_bird_amount_in_cents) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Early bird amount is required when early bird deadline is set'
    })
  }

  // Validate late fee logic
  if (body.late_fee_amount_in_cents && !body.late_fee_start_date) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Late fee start date is required when late fee amount is set'
    })
  }

  if (body.late_fee_start_date && !body.late_fee_amount_in_cents) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Late fee amount is required when late fee start date is set'
    })
  }

  try {
    // Prepare fee type data
    const feeTypeData = {
      recital_show_id: recitalShowId,
      name: body.name.trim(),
      fee_type: body.fee_type,
      description: body.description?.trim() || null,
      default_amount_in_cents: body.default_amount_in_cents,
      due_date: body.due_date || null,
      early_bird_amount_in_cents: body.early_bird_amount_in_cents || null,
      early_bird_deadline: body.early_bird_deadline || null,
      late_fee_amount_in_cents: body.late_fee_amount_in_cents || null,
      late_fee_start_date: body.late_fee_start_date || null,
      is_required: body.is_required ?? false,
      is_active: body.is_active ?? true,
    }

    // Insert fee type
    const { data: feeType, error } = await client
      .from('recital_fee_types')
      .insert([feeTypeData])
      .select()
      .single()

    if (error) {
      console.error('Database error creating fee type:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create fee type'
      })
    }

    return {
      message: 'Fee type created successfully',
      feeType
    }
  } catch (error: any) {
    console.error('Error creating fee type:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create fee type'
    })
  }
})
