import { getSupabaseClient } from '../../../utils/supabase'
import type { AddStudentForm } from '~/types/parents'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user
  const body = await readBody<AddStudentForm>(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Validate required fields
  if (!body.first_name || !body.last_name || !body.date_of_birth) {
    throw createError({
      statusCode: 400,
      message: 'First name, last name, and date of birth are required',
    })
  }

  if (!body.emergency_contact_name || !body.emergency_contact_phone) {
    throw createError({
      statusCode: 400,
      message: 'Emergency contact information is required',
    })
  }

  if (!body.relationship) {
    throw createError({
      statusCode: 400,
      message: 'Relationship to student is required',
    })
  }

  try {
    // Get guardian record for this user
    const { data: guardian, error: guardianError } = await client
      .from('guardians')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (guardianError || !guardian) {
      throw createError({
        statusCode: 404,
        message: 'Guardian profile not found',
      })
    }

    // Create student record
    const { data: student, error: studentError } = await client
      .from('students')
      .insert({
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
        status: 'active',
      })
      .select()
      .single()

    if (studentError) throw studentError

    // Create guardian-student relationship
    const { data: relationship, error: relationshipError } = await client
      .from('student_guardian_relationships')
      .insert({
        student_id: student.id,
        guardian_id: guardian.id,
        relationship: body.relationship,
        relationship_custom: body.relationship_custom,
        primary_contact: body.primary_contact !== undefined ? body.primary_contact : true,
        authorized_pickup: body.authorized_pickup !== undefined ? body.authorized_pickup : true,
        financial_responsibility: body.financial_responsibility !== undefined ? body.financial_responsibility : true,
        can_authorize_medical: body.can_authorize_medical !== undefined ? body.can_authorize_medical : true,
      })
      .select()
      .single()

    if (relationshipError) throw relationshipError

    return {
      message: 'Student added successfully',
      student: {
        ...student,
        relationship: {
          id: relationship.id,
          relationship: relationship.relationship,
          relationship_custom: relationship.relationship_custom,
          primary_contact: relationship.primary_contact,
          authorized_pickup: relationship.authorized_pickup,
          financial_responsibility: relationship.financial_responsibility,
          can_authorize_medical: relationship.can_authorize_medical,
        },
      },
    }
  } catch (error: any) {
    console.error('Error creating student:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create student',
    })
  }
})
