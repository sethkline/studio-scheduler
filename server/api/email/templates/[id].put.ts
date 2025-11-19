// server/api/email/templates/[id].put.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../../utils/supabase'
import { enhancedEmailService } from '../../../utils/emailService'
import type { EmailTemplateForm } from '~/types/email'

/**
 * PUT /api/email/templates/[id]
 * Update an email template
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody<Partial<EmailTemplateForm>>(event)

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Template ID is required',
      })
    }

    // Get current user
    const authHeader = event.headers.get('authorization')
    let userId: string | null = null

    if (authHeader) {
      const { data: { user } } = await client.auth.getUser(authHeader.replace('Bearer ', ''))
      userId = user?.id || null
    }

    // Build update object
    const updateData: any = {
      updated_by: userId,
    }

    if (body.name) updateData.name = body.name
    if (body.slug) updateData.slug = body.slug
    if (body.category) updateData.category = body.category
    if (body.subject) updateData.subject = body.subject
    if (body.description !== undefined) updateData.description = body.description
    if (body.template_variables) updateData.template_variables = body.template_variables
    if (body.use_studio_branding !== undefined) updateData.use_studio_branding = body.use_studio_branding
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    // Handle MJML/HTML content updates
    if (body.mjml_content !== undefined) {
      updateData.mjml_content = body.mjml_content
      if (body.mjml_content) {
        const { html, errors } = enhancedEmailService.compileMjml(body.mjml_content)
        if (errors && errors.length > 0) {
          console.warn('MJML compilation warnings:', errors)
        }
        updateData.html_content = html
      }
    } else if (body.html_content !== undefined) {
      updateData.html_content = body.html_content
    }

    // Handle text content
    if (body.text_content !== undefined) {
      updateData.text_content = body.text_content
    } else if (updateData.html_content) {
      // Generate text from HTML if HTML was updated
      updateData.text_content = enhancedEmailService.htmlToText(updateData.html_content)
    }

    const { data, error } = await client
      .from('email_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating email template:', error)
      if (error.code === '23505') {
        throw createError({
          statusCode: 409,
          statusMessage: 'A template with this slug already exists',
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update email template',
      })
    }

    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Email template not found',
      })
    }

    return {
      success: true,
      template: data,
    }
  } catch (error: any) {
    console.error('Email template update error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
