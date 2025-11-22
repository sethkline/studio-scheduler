import { getSupabaseClient } from '~/server/utils/supabase'
import { enhancedEmailService } from '~/server/utils/emailService'

/**
 * POST /api/register/trial
 * Register for a free trial class
 * PUBLIC endpoint - no authentication required
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)

    // Validate required fields
    const requiredFields = [
      'studentFirstName',
      'studentLastName',
      'dateOfBirth',
      'parentFirstName',
      'parentLastName',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'zipCode',
      'classId',
      'preferredDate',
      'agreeTerms',
      'agreeWaiver',
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        throw createError({
          statusCode: 400,
          statusMessage: `Missing required field: ${field}`,
        })
      }
    }

    // Validate email format
    if (!body.email.includes('@')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email address',
      })
    }

    // Validate date of birth
    const dob = new Date(body.dateOfBirth)
    if (isNaN(dob.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid date of birth',
      })
    }

    // Validate preferred date (must be in the future)
    const preferredDate = new Date(body.preferredDate)
    if (isNaN(preferredDate.getTime()) || preferredDate <= new Date()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid preferred date. Must be a future date.',
      })
    }

    // Get class details
    const { data: classData, error: classError } = await client
      .from('class_definitions')
      .select('*, dance_style:dance_styles(*)')
      .eq('id', body.classId)
      .single()

    if (classError || !classData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Class not found',
      })
    }

    // Create trial registration record
    const { data: registration, error: registrationError } = await client
      .from('trial_registrations')
      .insert({
        student_first_name: body.studentFirstName,
        student_last_name: body.studentLastName,
        date_of_birth: body.dateOfBirth,
        gender: body.gender || null,
        experience_level: body.experience || 'none',
        parent_first_name: body.parentFirstName,
        parent_last_name: body.parentLastName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        zip_code: body.zipCode,
        class_id: body.classId,
        preferred_date: body.preferredDate,
        referral_source: body.referralSource || null,
        comments: body.comments || null,
        agreed_to_terms: body.agreeTerms,
        agreed_to_waiver: body.agreeWaiver,
        marketing_consent: body.agreeMarketing || false,
        status: 'pending',
      })
      .select()
      .single()

    if (registrationError) {
      console.error('Trial registration error:', registrationError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create trial registration',
      })
    }

    // Get studio profile for email branding
    const { data: studioProfile } = await client
      .from('studio_profile')
      .select('*')
      .single()

    // Send confirmation email to parent
    try {
      const emailResult = await enhancedEmailService.sendEmail({
        to: body.email,
        subject: `Trial Class Confirmation - ${classData.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Trial Class Confirmation</h2>
            <p>Dear ${body.parentFirstName} ${body.parentLastName},</p>
            <p>Thank you for registering ${body.studentFirstName} ${body.studentLastName} for a trial class at ${studioProfile?.name || 'our dance studio'}!</p>

            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin-top: 0;">Trial Class Details</h3>
              <p><strong>Class:</strong> ${classData.name}</p>
              <p><strong>Style:</strong> ${classData.dance_style?.name || 'N/A'}</p>
              <p><strong>Preferred Date:</strong> ${new Date(body.preferredDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}</p>
            </div>

            <h3>What to Expect</h3>
            <ul>
              <li>Please arrive 10 minutes early to complete any necessary paperwork</li>
              <li>Students should wear comfortable, fitted clothing that allows for easy movement</li>
              <li>Parents/guardians must remain on premises during the trial class</li>
              <li>Our instructor will reach out to confirm the exact time for your trial class</li>
            </ul>

            <h3>What to Bring</h3>
            <ul>
              <li>Water bottle</li>
              <li>Appropriate footwear (we can advise on this when confirming your time)</li>
              <li>Enthusiasm and a smile!</li>
            </ul>

            <p>We will contact you within 24-48 hours to confirm your trial class time and answer any questions you may have.</p>

            ${studioProfile?.phone ? `<p><strong>Questions?</strong> Call us at ${studioProfile.phone}</p>` : ''}
            ${studioProfile?.email ? `<p>Or email us at <a href="mailto:${studioProfile.email}">${studioProfile.email}</a></p>` : ''}

            <p style="margin-top: 30px;">We're excited to have ${body.studentFirstName} join us!</p>

            <p>Best regards,<br/>
            ${studioProfile?.name || 'The Dance Studio Team'}</p>
          </div>
        `,
        text: `
Dear ${body.parentFirstName} ${body.parentLastName},

Thank you for registering ${body.studentFirstName} ${body.studentLastName} for a trial class at ${studioProfile?.name || 'our dance studio'}!

Trial Class Details:
- Class: ${classData.name}
- Style: ${classData.dance_style?.name || 'N/A'}
- Preferred Date: ${new Date(body.preferredDate).toLocaleDateString()}

What to Expect:
- Please arrive 10 minutes early to complete any necessary paperwork
- Students should wear comfortable, fitted clothing that allows for easy movement
- Parents/guardians must remain on premises during the trial class
- Our instructor will reach out to confirm the exact time for your trial class

What to Bring:
- Water bottle
- Appropriate footwear (we can advise on this when confirming your time)
- Enthusiasm and a smile!

We will contact you within 24-48 hours to confirm your trial class time and answer any questions you may have.

${studioProfile?.phone ? `Questions? Call us at ${studioProfile.phone}` : ''}
${studioProfile?.email ? `Or email us at ${studioProfile.email}` : ''}

We're excited to have ${body.studentFirstName} join us!

Best regards,
${studioProfile?.name || 'The Dance Studio Team'}
        `,
      })

      if (!emailResult.success) {
        console.error('Failed to send confirmation email:', emailResult.error)
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Don't fail the request if email fails
    }

    // Log activity for audit trail
    try {
      await client.from('audit_logs').insert({
        action: 'trial_registration_created',
        resource_type: 'trial_registration',
        resource_id: registration.id,
        metadata: {
          student_name: `${body.studentFirstName} ${body.studentLastName}`,
          parent_email: body.email,
          class_id: body.classId,
          class_name: classData.name,
        },
      })
    } catch (auditError) {
      console.error('Audit log error:', auditError)
      // Don't fail the request if audit log fails
    }

    return {
      success: true,
      registrationId: registration.id,
      message: 'Trial class registration successful',
    }
  } catch (error: any) {
    console.error('Trial registration error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
