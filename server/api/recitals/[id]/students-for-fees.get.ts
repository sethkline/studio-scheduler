import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'

/**
 * Get Students for Fee Assignment
 *
 * GET /api/recitals/:id/students-for-fees
 *
 * Retrieves all students participating in a recital with assignment status.
 *
 * @query {
 *   fee_type_id?: string (to check which students already have this fee)
 * }
 *
 * @returns Student[]
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  const client = await getUserSupabaseClient(event)
  const recitalShowId = getRouterParam(event, 'id')
  const query = getQuery(event)

  try {
    // Get all students participating in performances for this recital
    const { data: performances, error: perfError } = await client
      .from('recital_performances')
      .select(`
        student_id,
        students(*)
      `)
      .eq('recital_show_id', recitalShowId)

    if (perfError) {
      console.error('Database error fetching performances:', perfError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch students'
      })
    }

    // Extract unique students
    const studentMap = new Map()
    performances?.forEach((perf: any) => {
      if (perf.students && perf.student_id) {
        studentMap.set(perf.student_id, perf.students)
      }
    })

    let students = Array.from(studentMap.values())

    // If fee_type_id is provided, check which students already have this fee
    if (query.fee_type_id) {
      const { data: existingFees } = await client
        .from('student_recital_fees')
        .select('student_id')
        .eq('recital_show_id', recitalShowId)
        .eq('fee_type_id', query.fee_type_id as string)

      const assignedStudentIds = new Set(existingFees?.map(f => f.student_id) || [])

      // Mark students as already_assigned
      students = students.map(student => ({
        ...student,
        already_assigned: assignedStudentIds.has(student.id)
      }))
    }

    // Sort by name
    students.sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase()
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase()
      return nameA.localeCompare(nameB)
    })

    return students
  } catch (error: any) {
    console.error('Error fetching students for fees:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch students'
    })
  }
})
