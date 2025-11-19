import { requireAuth, requireRole } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {  await requireRole(event, ['parent', 'admin', 'staff'])

  const client = await getUserSupabaseClient(event)
  const confirmationId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!body.decline_reason?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Decline reason is required' })
  }

  try {
    // Get confirmation with student info
    const { data: confirmation } = await client
      .from('recital_performer_confirmations')
      .select('*, student:students(id, guardians(user_id))')
      .eq('id', confirmationId)
      .single()

    if (!confirmation) {
      throw createError({ statusCode: 404, statusMessage: 'Confirmation not found' })
    }

    // Verify parent has access
    const guardians = (confirmation.student as any)?.guardians || []
    const hasAccess = guardians.some((g: any) => g.user_id === user.id)

    if (!hasAccess) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    // Get guardian ID
    const { data: guardian } = await client
      .from('guardians')
      .select('id')
      .eq('student_id', confirmation.student_id)
      .eq('user_id', user.id)
      .single()

    // Update confirmation
    const { data: updated, error } = await client
      .from('recital_performer_confirmations')
      .update({
        status: 'declined',
        confirmation_date: new Date().toISOString(),
        guardian_id: guardian?.id,
        decline_reason: body.decline_reason.trim(),
        opt_out_category: body.opt_out_category || 'other',
      })
      .eq('id', confirmationId)
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to decline performance' })

    // Log the response
    await client.from('recital_participation_requests').insert({
      recital_id: confirmation.recital_id,
      student_id: confirmation.student_id,
      guardian_id: guardian?.id,
      request_type: 'initial',
      sent_via: 'portal',
      sent_at: new Date().toISOString(),
      responded_at: new Date().toISOString(),
    })

    return {
      confirmation_id: updated.id,
      status: updated.status,
      message: "We've recorded your response. Please contact the studio if you have questions.",
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to decline performance',
    })
  }
})
