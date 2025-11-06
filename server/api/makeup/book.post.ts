import { getSupabaseClient } from '../../utils/supabase'
import type { BookMakeupRequest } from '~/types/attendance'

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
    const body = await readBody<BookMakeupRequest>(event)
    const { makeup_credit_id, makeup_class_instance_id, makeup_date, notes } = body

    if (!makeup_credit_id || !makeup_class_instance_id || !makeup_date) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields',
      })
    }

    // Get makeup credit
    const { data: credit, error: creditError } = await client
      .from('makeup_credits')
      .select('*')
      .eq('id', makeup_credit_id)
      .single()

    if (creditError || !credit) {
      throw createError({
        statusCode: 404,
        message: 'Makeup credit not found',
      })
    }

    // Verify credit is active and has credits available
    if (credit.status !== 'active') {
      throw createError({
        statusCode: 400,
        message: 'Makeup credit is not active',
      })
    }

    if (credit.credits_used >= credit.credits_available) {
      throw createError({
        statusCode: 400,
        message: 'No makeup credits available',
      })
    }

    // Check if credit is expired
    if (new Date(credit.expiration_date) < new Date()) {
      throw createError({
        statusCode: 400,
        message: 'Makeup credit has expired',
      })
    }

    // Verify user has permission (parent of student, staff, or admin)
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
          .eq('student_id', credit.student_id)
          .maybeSingle()

        if (!relationship) {
          throw createError({
            statusCode: 403,
            message: 'You can only book makeup classes for your own students',
          })
        }
      } else {
        throw createError({
          statusCode: 403,
          message: 'Guardian profile not found',
        })
      }
    } else if (!['admin', 'staff'].includes(profile.user_role)) {
      throw createError({
        statusCode: 403,
        message: 'Permission denied',
      })
    }

    // Check if class exists and get capacity
    const { data: makeupClass, error: classError } = await client
      .from('class_instances')
      .select(`
        id,
        name,
        class_definition:class_definitions(
          max_students
        )
      `)
      .eq('id', makeup_class_instance_id)
      .single()

    if (classError || !makeupClass) {
      throw createError({
        statusCode: 404,
        message: 'Makeup class not found',
      })
    }

    // Check current enrollment count for makeup class
    const { count: enrollmentCount } = await client
      .from('enrollments')
      .select('id', { count: 'exact' })
      .eq('class_instance_id', makeup_class_instance_id)
      .eq('status', 'active')

    // Check current makeup bookings for this date
    const { count: makeupCount } = await client
      .from('makeup_bookings')
      .select('id', { count: 'exact' })
      .eq('makeup_class_instance_id', makeup_class_instance_id)
      .eq('makeup_date', makeup_date)
      .in('status', ['booked', 'attended'])

    const totalStudents = (enrollmentCount || 0) + (makeupCount || 0)
    const maxStudents = makeupClass.class_definition?.max_students

    if (maxStudents && totalStudents >= maxStudents) {
      throw createError({
        statusCode: 400,
        message: 'Makeup class is full',
      })
    }

    // Check if student already has a makeup booking for this class on this date
    const { data: existingBooking } = await client
      .from('makeup_bookings')
      .select('id')
      .eq('student_id', credit.student_id)
      .eq('makeup_class_instance_id', makeup_class_instance_id)
      .eq('makeup_date', makeup_date)
      .in('status', ['booked', 'attended'])
      .maybeSingle()

    if (existingBooking) {
      throw createError({
        statusCode: 409,
        message: 'Student already has a makeup booking for this class on this date',
      })
    }

    // Create makeup booking
    const { data: booking, error: bookingError } = await client
      .from('makeup_bookings')
      .insert({
        makeup_credit_id,
        student_id: credit.student_id,
        original_class_instance_id: credit.class_instance_id,
        makeup_class_instance_id,
        makeup_date,
        status: 'booked',
        booked_by: user.id,
        notes,
      })
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name
        ),
        original_class:class_instances!makeup_bookings_original_class_instance_id_fkey(
          id,
          name
        ),
        makeup_class:class_instances!makeup_bookings_makeup_class_instance_id_fkey(
          id,
          name,
          dance_style:dance_styles(name, color),
          schedule_classes(
            day_of_week,
            start_time,
            end_time
          )
        )
      `)
      .single()

    if (bookingError) throw bookingError

    return {
      success: true,
      booking,
      message: 'Makeup class booked successfully',
    }
  } catch (error: any) {
    console.error('Error booking makeup class:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to book makeup class',
    })
  }
})
