// server/api/email/templates/index.post.ts
import { getSupabaseClient } from '../../../utils/supabase'
import { enhancedEmailService } from '../../../utils/emailService'
import type { EmailTemplateForm } from '~/types/email'

/**
 * POST /api/email/templates
 * Create a new email template
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const body = await readBody<EmailTemplateForm>(event)

    // Get current user (for created_by tracking)
    const authHeader = event.headers.get('authorization')
    let userId: string | null = null

    if (authHeader) {
      // Extract user ID from token if available
      // This is a simplified version - you may need to decode the JWT
      const { data: { user } } = await client.auth.getUser(authHeader.replace('Bearer ', ''))
      userId = user?.id || null
    }

    // Validate required fields
    if (!body.name || !body.slug || !body.category || !body.subject) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: name, slug, category, or subject',
      })
    }

    // If MJML content provided, compile it to HTML
    let htmlContent = body.html_content
    if (body.mjml_content) {
      const { html, errors } = enhancedEmailService.compileMjml(body.mjml_content)
      if (errors && errors.length > 0) {
        console.warn('MJML compilation warnings:', errors)
      }
      htmlContent = html
    }

    // If no text content, generate from HTML
    let textContent = body.text_content
    if (!textContent && htmlContent) {
      textContent = enhancedEmailService.htmlToText(htmlContent)
    }

    // Create template
    const { data, error } = await client
      .from('email_templates')
      .insert({
        name: body.name,
        slug: body.slug,
        category: body.category,
        subject: body.subject,
        description: body.description,
        mjml_content: body.mjml_content,
        html_content: htmlContent,
        text_content: textContent,
        template_variables: body.template_variables || [],
        use_studio_branding: body.use_studio_branding ?? true,
        is_active: body.is_active ?? true,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating email template:', error)
      if (error.code === '23505') {
        // Unique violation
        throw createError({
          statusCode: 409,
          statusMessage: 'A template with this slug already exists',
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create email template',
      })
    }

    return {
      success: true,
      template: data,
    }
  } catch (error: any) {
    console.error('Email template creation error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
