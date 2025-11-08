import { getSupabaseClient } from '../../../utils/supabase'
import type { PaymentMethodOnFile } from '~/types/payments'

export default defineEventHandler(async (event): Promise<PaymentMethodOnFile[]> => {
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

    // Get all payment methods for this guardian
    const { data: paymentMethods, error: paymentMethodsError } = await client
      .from('payment_methods')
      .select('*')
      .eq('guardian_id', guardian.id)
      .eq('status', 'active')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (paymentMethodsError) {
      console.warn('Payment methods table may not exist:', paymentMethodsError)
      return []
    }

    return paymentMethods || []
  } catch (error: any) {
    console.error('Error fetching payment methods:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch payment methods',
    })
  }
})
