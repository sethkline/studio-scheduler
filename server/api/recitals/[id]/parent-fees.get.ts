import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Get Parent Fees
 *
 * GET /api/recitals/:id/parent-fees
 *
 * Retrieves all fees for the current user's children for a specific recital.
 * Used by the parent payment portal.
 *
 * @returns {
 *   recital: RecitalShow
 *   children: Array<{
 *     student_id: string
 *     student_name: string
 *     fees: StudentRecitalFee[]
 *   }>
 * }
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const recitalShowId = getRouterParam(event, 'id')

  try {
    // Get current user
    const user = event.context.user
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Get recital show details
    const { data: recitalShow, error: recitalError } = await client
      .from('recital_shows')
      .select('*')
      .eq('id', recitalShowId)
      .single()

    if (recitalError || !recitalShow) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Recital not found'
      })
    }

    // Get user's children (students linked to this parent)
    // Assuming there's a parent_students linking table or students have a parent_id
    const { data: students, error: studentsError } = await client
      .from('students')
      .select('*')
      .eq('parent_id', user.id)

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch students'
      })
    }

    if (!students || students.length === 0) {
      // No children found
      return {
        recital: recitalShow,
        children: []
      }
    }

    const studentIds = students.map(s => s.id)

    // Get all fees for these students for this recital
    const { data: fees, error: feesError } = await client
      .from('student_recital_fees')
      .select(`
        *,
        fee_type:recital_fee_types(*),
        payment_plan:recital_payment_plans(*),
        payments:recital_payment_transactions(
          id,
          amount_in_cents,
          payment_method,
          payment_date,
          payment_status
        )
      `)
      .eq('recital_show_id', recitalShowId)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })

    if (feesError) {
      console.error('Error fetching fees:', feesError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch fees'
      })
    }

    // Group fees by student
    const childrenWithFees = students.map(student => {
      const studentFees = fees?.filter(f => f.student_id === student.id) || []

      return {
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        student: student,
        fees: studentFees
      }
    }).filter(child => child.fees.length > 0) // Only include children with fees

    return {
      recital: recitalShow,
      children: childrenWithFees
    }
  } catch (error: any) {
    console.error('Error fetching parent fees:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch parent fees'
    })
  }
})
