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

  const id = getRouterParam(event, 'id')
  const body = await readBody<Partial<CreateCostumeForm> & { status?: string }>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Costume ID is required',
    })
  }

  // Build update object (only include provided fields)
  const updateData: any = {
    updated_at: new Date().toISOString(),
  }

  if (body.name !== undefined) updateData.name = body.name
  if (body.description !== undefined) updateData.description = body.description
  if (body.costume_type !== undefined) updateData.costume_type = body.costume_type
  if (body.sizes_available !== undefined) updateData.sizes_available = body.sizes_available
  if (body.quantity_in_stock !== undefined) updateData.quantity_in_stock = body.quantity_in_stock
  if (body.rental_price_cents !== undefined) updateData.rental_price_cents = body.rental_price_cents
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.status !== undefined) updateData.status = body.status

  // Update costume
  const { data: costume, error } = await client
    .from('costumes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating costume:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update costume',
    })
  }

  if (!costume) {
    throw createError({
      statusCode: 404,
      message: 'Costume not found',
    })
  }

  return costume
})
