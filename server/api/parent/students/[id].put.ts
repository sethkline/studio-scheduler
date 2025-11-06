import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user
  const studentId = event.context.params?.id
  const body = await readBody(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!studentId) {
    throw createError({
      statusCode: 400,
      message: 'Student ID is required',
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

    // Verify this guardian has access to this student
    const { data: relationship, error: relationshipError } = await client
      .from('student_guardian_relationships')
      .select('id')
      .eq('guardian_id', guardian.id)
      .eq('student_id', studentId)
      .single()

    if (relationshipError || !relationship) {
      throw createError({
        statusCode: 403,
        message: 'Access denied: You do not have permission to edit this student',
      })
    }

    // Update student record
    const { data: student, error: studentError } = await client
      .from('students')
      .update({
        first_name: body.first_name,
        last_name: body.last_name,
        date_of_birth: body.date_of_birth,
        gender: body.gender,
        photo_url: body.photo_url,
        email: body.email,
        phone: body.phone,
        allergies: body.allergies,
        medical_conditions: body.medical_conditions,
        medications: body.medications,
        doctor_name: body.doctor_name,
        doctor_phone: body.doctor_phone,
        emergency_contact_name: body.emergency_contact_name,
        emergency_contact_phone: body.emergency_contact_phone,
        emergency_contact_relationship: body.emergency_contact_relationship,
        costume_size_top: body.costume_size_top,
        costume_size_bottom: body.costume_size_bottom,
        shoe_size: body.shoe_size,
        height_inches: body.height_inches,
        notes: body.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)
      .select()
      .single()

    if (studentError) throw studentError

    // Update relationship if provided
    if (body.relationship) {
      const { error: relUpdateError } = await client
        .from('student_guardian_relationships')
        .update({
          relationship: body.relationship,
          relationship_custom: body.relationship_custom,
          primary_contact: body.primary_contact,
          authorized_pickup: body.authorized_pickup,
          financial_responsibility: body.financial_responsibility,
          can_authorize_medical: body.can_authorize_medical,
          updated_at: new Date().toISOString(),
        })
        .eq('id', relationship.id)

      if (relUpdateError) throw relUpdateError
    }

    return {
      message: 'Student updated successfully',
      student,
    }
  } catch (error: any) {
    console.error('Error updating student:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to update student',
    })
  }
})
