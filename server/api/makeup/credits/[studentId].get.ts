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
    const studentId = getRouterParam(event, 'studentId')

    if (!studentId) {
      throw createError({
        statusCode: 400,
        message: 'Student ID is required',
      })
    }

    // Verify user has permission
    const { data: profile } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw createError({
        statusCode: 404,
        message: 'User profile not found',
      })
    }

    // If parent, verify they are guardian of this student
    if (profile.user_role === 'parent') {
      const { data: guardian } = await client
        .from('guardians')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (guardian) {
        const { data: relationship } = await client
          .from('student_guardian_relationships')
          .select('id')
          .eq('guardian_id', guardian.id)
          .eq('student_id', studentId)
          .maybeSingle()

        if (!relationship) {
          throw createError({
            statusCode: 403,
            message: 'You can only view makeup credits for your own students',
          })
        }
      } else {
        throw createError({
          statusCode: 403,
          message: 'Guardian profile not found',
        })
      }
    } else if (!['admin', 'staff', 'teacher'].includes(profile.user_role)) {
      throw createError({
        statusCode: 403,
        message: 'Permission denied',
      })
    }

    // Get available makeup credits using the view
    const { data: credits, error: creditsError } = await client
      .from('v_makeup_credits_available')
      .select('*')
      .eq('student_id', studentId)
      .order('expiration_date', { ascending: true })

    if (creditsError) throw creditsError

    return {
      student_id: studentId,
      credits: credits || [],
      total_available: credits?.reduce((sum: number, c: any) => sum + c.remaining_credits, 0) || 0,
    }
  } catch (error: any) {
    console.error('Error fetching makeup credits:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch makeup credits',
    })
  }
})
