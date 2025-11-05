import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    // Get guardian record for this user
    const { data: guardian, error: guardianError } = await client
      .from('guardians')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (guardianError || !guardian) {
      throw createError({
        statusCode: 404,
        message: 'Guardian profile not found',
      })
    }

    // Get all payments for this guardian
    // Note: This assumes a payments table exists. Adjust based on your actual schema
    const { data: payments, error: paymentsError } = await client
      .from('payments')
      .select(`
        *,
        student:students(id, first_name, last_name)
      `)
      .eq('guardian_id', guardian.id)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      // If payments table doesn't exist yet, return empty array
      console.warn('Payments table may not exist:', paymentsError)
      return {
        payments: [],
        summary: {
          total_paid: 0,
          total_pending: 0,
          total_overdue: 0,
        },
      }
    }

    // Calculate summary
    const summary = {
      total_paid: payments
        ?.filter((p: any) => p.status === 'paid')
        .reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0) || 0,
      total_pending: payments
        ?.filter((p: any) => p.status === 'pending')
        .reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0) || 0,
      total_overdue: payments
        ?.filter((p: any) => p.status === 'overdue')
        .reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0) || 0,
    }

    return {
      payments: payments || [],
      summary,
    }
  } catch (error: any) {
    console.error('Error fetching payments:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch payments',
    })
  }
})
