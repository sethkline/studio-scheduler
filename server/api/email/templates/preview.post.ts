// server/api/email/templates/preview.post.ts
import { getSupabaseClient } from '../../../utils/supabase'
import { enhancedEmailService } from '../../../utils/emailService'
import type { EmailTemplateData } from '~/types/email'

/**
 * POST /api/email/templates/preview
 * Preview an email template with sample data
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody<{
      template_id: string
      template_data?: EmailTemplateData
    }>(event)

    if (!body.template_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Template ID is required',
      })
    }

    // Fetch template
    const { data: template, error } = await client
      .from('email_templates')
      .select('*')
      .eq('id', body.template_id)
      .single()

    if (error || !template) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Email template not found',
      })
    }

    // Get studio profile for branding
    const { data: studioProfile } = await client
      .from('studio_profile')
      .select('*')
      .single()

    // Prepare template data with defaults and studio info
    const templateData: EmailTemplateData = {
      studio_name: studioProfile?.name || 'Dance Studio',
      studio_logo_url: studioProfile?.logo_url,
      studio_email: studioProfile?.email,
      studio_phone: studioProfile?.phone,
      studio_website: studioProfile?.website,
      parent_name: 'John Doe',
      student_name: 'Jane Doe',
      unsubscribe_url: '#',
      ...body.template_data,
    }

    // Generate preview
    const preview = enhancedEmailService.previewTemplate(template, templateData)

    // Add studio branding if enabled
    let html = preview.html
    if (template.use_studio_branding && studioProfile) {
      html = await enhancedEmailService.addStudioBranding(html, {
        name: studioProfile.name,
        logo_url: studioProfile.logo_url,
        email: studioProfile.email,
        phone: studioProfile.phone,
        website: studioProfile.website,
      })
    }

    return {
      subject: preview.subject,
      html,
      text: preview.text,
      template_variables: template.template_variables,
    }
  } catch (error: any) {
    console.error('Email template preview error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
