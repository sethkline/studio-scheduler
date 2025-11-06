import { getSupabaseClient } from '~/server/utils/supabase'
import type { CreateCostumeForm } from '~/types/costumes'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Get user profile to check role
  const { data: profile } = await client
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.user_role)) {
    throw createError({
      statusCode: 403,
      message: 'Permission denied',
    })
  }

  const body = await readBody<CreateCostumeForm>(event)

  // Validate required fields
  if (!body.name) {
    throw createError({
      statusCode: 400,
      message: 'Costume name is required',
    })
  }

  if (typeof body.quantity_in_stock !== 'number' || body.quantity_in_stock < 0) {
    throw createError({
      statusCode: 400,
      message: 'Valid quantity is required',
    })
  }

  // Create costume
  const { data: costume, error } = await client
    .from('costumes')
    .insert({
      name: body.name,
      description: body.description,
      costume_type: body.costume_type,
      sizes_available: body.sizes_available,
      quantity_in_stock: body.quantity_in_stock,
      rental_price_cents: body.rental_price_cents,
      notes: body.notes,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating costume:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create costume',
    })
  }

  return costume
})
