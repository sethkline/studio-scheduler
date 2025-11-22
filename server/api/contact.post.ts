import { getSupabaseClient } from '~/server/utils/supabase'
import { enhancedEmailService } from '~/server/utils/emailService'

/**
 * POST /api/contact
 * Submit a contact form inquiry
 * PUBLIC endpoint - no authentication required
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody(event)

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'inquiryType', 'message']

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

    // Validate inquiry type
    const validInquiryTypes = [
      'enrollment',
      'trial',
      'schedule',
      'pricing',
      'recitals',
      'general',
      'feedback',
    ]

    if (!validInquiryTypes.includes(body.inquiryType)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid inquiry type',
      })
    }

    // Create contact inquiry record
    const { data: inquiry, error: inquiryError } = await client
      .from('contact_inquiries')
      .insert({
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone || null,
        inquiry_type: body.inquiryType,
        message: body.message,
        status: 'new',
      })
      .select()
      .single()

    if (inquiryError) {
      console.error('Contact inquiry error:', inquiryError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to submit contact inquiry',
      })
    }

    // Get studio profile for email branding
    const { data: studioProfile } = await client
      .from('studio_profile')
      .select('*')
      .single()

    // Map inquiry type to human-readable labels
    const inquiryTypeLabels: Record<string, string> = {
      enrollment: 'Class Enrollment',
      trial: 'Trial Class',
      schedule: 'Schedule Information',
      pricing: 'Pricing & Tuition',
      recitals: 'Recitals & Events',
      general: 'General Question',
      feedback: 'Feedback',
    }

    // Send confirmation email to sender
    try {
      const emailResult = await enhancedEmailService.sendEmail({
        to: body.email,
        subject: 'We received your message',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Thank You for Contacting Us</h2>
            <p>Dear ${body.firstName} ${body.lastName},</p>
            <p>Thank you for reaching out to ${studioProfile?.name || 'our dance studio'}. We've received your message and will respond as soon as possible.</p>

            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin-top: 0;">Your Message</h3>
              <p><strong>Inquiry Type:</strong> ${inquiryTypeLabels[body.inquiryType]}</p>
              <p><strong>Message:</strong></p>
              <p style="white-space: pre-wrap;">${body.message}</p>
            </div>

            <p>We typically respond within 24-48 hours during business days. If your inquiry is urgent, please feel free to call us.</p>

            ${studioProfile?.phone ? `<p><strong>Phone:</strong> ${studioProfile.phone}</p>` : ''}
            ${studioProfile?.email ? `<p><strong>Email:</strong> ${studioProfile.email}</p>` : ''}

            <p style="margin-top: 30px;">Thank you for your interest in our dance programs!</p>

            <p>Best regards,<br/>
            ${studioProfile?.name || 'The Dance Studio Team'}</p>
          </div>
        `,
        text: `
Dear ${body.firstName} ${body.lastName},

Thank you for reaching out to ${studioProfile?.name || 'our dance studio'}. We've received your message and will respond as soon as possible.

Your Message:
Inquiry Type: ${inquiryTypeLabels[body.inquiryType]}
Message: ${body.message}

We typically respond within 24-48 hours during business days. If your inquiry is urgent, please feel free to call us.

${studioProfile?.phone ? `Phone: ${studioProfile.phone}` : ''}
${studioProfile?.email ? `Email: ${studioProfile.email}` : ''}

Thank you for your interest in our dance programs!

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

    // Send notification email to studio staff
    try {
      if (studioProfile?.email) {
        const staffEmailResult = await enhancedEmailService.sendEmail({
          to: studioProfile.email,
          subject: `New Contact Inquiry: ${inquiryTypeLabels[body.inquiryType]}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">New Contact Inquiry Received</h2>

              <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0;">Contact Details</h3>
                <p><strong>Name:</strong> ${body.firstName} ${body.lastName}</p>
                <p><strong>Email:</strong> <a href="mailto:${body.email}">${body.email}</a></p>
                ${body.phone ? `<p><strong>Phone:</strong> <a href="tel:${body.phone}">${body.phone}</a></p>` : ''}
                <p><strong>Inquiry Type:</strong> ${inquiryTypeLabels[body.inquiryType]}</p>
              </div>

              <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0;">Message</h3>
                <p style="white-space: pre-wrap;">${body.message}</p>
              </div>

              <p style="color: #666; font-size: 12px;">
                Inquiry ID: ${inquiry.id}<br/>
                Submitted: ${new Date().toLocaleString()}
              </p>
            </div>
          `,
          text: `
New Contact Inquiry Received

Contact Details:
Name: ${body.firstName} ${body.lastName}
Email: ${body.email}
${body.phone ? `Phone: ${body.phone}` : ''}
Inquiry Type: ${inquiryTypeLabels[body.inquiryType]}

Message:
${body.message}

Inquiry ID: ${inquiry.id}
Submitted: ${new Date().toLocaleString()}
          `,
        })

        if (!staffEmailResult.success) {
          console.error('Failed to send staff notification email:', staffEmailResult.error)
        }
      }
    } catch (staffEmailError) {
      console.error('Staff email notification error:', staffEmailError)
      // Don't fail the request if staff notification fails
    }

    // Log activity for audit trail
    try {
      await client.from('audit_logs').insert({
        action: 'contact_inquiry_created',
        resource_type: 'contact_inquiry',
        resource_id: inquiry.id,
        metadata: {
          name: `${body.firstName} ${body.lastName}`,
          email: body.email,
          inquiry_type: body.inquiryType,
        },
      })
    } catch (auditError) {
      console.error('Audit log error:', auditError)
      // Don't fail the request if audit log fails
    }

    return {
      success: true,
      inquiryId: inquiry.id,
      message: 'Contact inquiry submitted successfully',
    }
  } catch (error: any) {
    console.error('Contact inquiry error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
