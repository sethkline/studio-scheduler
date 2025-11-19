import { getSupabaseClient } from '../../../utils/supabase'
import { randomBytes } from 'crypto'

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
    const body = await readBody(event)
    const { student_id } = body

    if (!student_id) {
      throw createError({
        statusCode: 400,
        message: 'Student ID is required',
      })
    }

    // Verify user has permission (staff or admin only)
    const { data: profile } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'staff'].includes(profile.user_role)) {
      throw createError({
        statusCode: 403,
        message: 'Permission denied. Only admin and staff can generate QR codes.',
      })
    }

    // Verify student exists
    const { data: student, error: studentError } = await client
      .from('students')
      .select('id, first_name, last_name')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      throw createError({
        statusCode: 404,
        message: 'Student not found',
      })
    }

    // Check if QR code already exists
    const { data: existingQR } = await client
      .from('student_qr_codes')
      .select('*')
      .eq('student_id', student_id)
      .maybeSingle()

    if (existingQR) {
      // Return existing QR code if still active
      if (existingQR.is_active) {
        return {
          success: true,
          qr_code: existingQR,
          message: 'QR code already exists for this student',
        }
      } else {
        // Reactivate existing QR code
        const { data: reactivated, error: reactivateError } = await client
          .from('student_qr_codes')
          .update({
            is_active: true,
            generated_at: new Date().toISOString(),
          })
          .eq('id', existingQR.id)
          .select()
          .single()

        if (reactivateError) throw reactivateError

        return {
          success: true,
          qr_code: reactivated,
          message: 'QR code reactivated',
        }
      }
    }

    // Generate unique QR code data
    const qrCodeData = `STUDENT-${student_id}-${randomBytes(16).toString('hex')}`

    // Create QR code record
    const { data: qrCode, error: qrError } = await client
      .from('student_qr_codes')
      .insert({
        student_id,
        qr_code_data: qrCodeData,
        is_active: true,
      })
      .select()
      .single()

    if (qrError) throw qrError

    return {
      success: true,
      qr_code: qrCode,
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
      },
      message: 'QR code generated successfully',
    }
  } catch (error: any) {
    console.error('Error generating QR code:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to generate QR code',
    })
  }
})
