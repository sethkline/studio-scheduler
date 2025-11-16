import { getSupabaseClient } from '../../../utils/supabase'
import { generateStudentPhotoUrlsBulk } from '../../../utils/studentPhotos'

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

    // Get all students linked to this guardian with relationship details
    const { data: relationships, error: relationshipsError } = await client
      .from('student_guardian_relationships')
      .select(`
        *,
        student:students(*)
      `)
      .eq('guardian_id', guardian.id)
      .order('created_at', { ascending: true })

    if (relationshipsError) throw relationshipsError

    // Transform to include relationship data with each student
    const students = relationships?.map((rel: any) => ({
      ...rel.student,
      relationship: {
        id: rel.id,
        relationship: rel.relationship,
        relationship_custom: rel.relationship_custom,
        primary_contact: rel.primary_contact,
        authorized_pickup: rel.authorized_pickup,
        financial_responsibility: rel.financial_responsibility,
        can_authorize_medical: rel.can_authorize_medical,
      },
    })) || []

    // Generate signed URLs for student photos (file paths stored in DB)
    const studentsWithUrls = await generateStudentPhotoUrlsBulk(client, students)

    return {
      students: studentsWithUrls,
      total: studentsWithUrls.length,
    }
  } catch (error: any) {
    console.error('Error fetching students:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch students',
    })
  }
})
