// server/api/email/seed-templates.post.ts
import { requireAuth, requireAdminOrStaff } from '~/server/utils/auth'
import { getUserSupabaseClient } from '../utils/supabase'
import { enhancedEmailService } from '../../utils/emailService'
import { defaultEmailTemplates } from '../../utils/emailTemplates'

/**
 * POST /api/email/seed-templates
 * Seed the database with default email templates
 * IMPORTANT: This should only be run by admins during initial setup
 */
export default defineEventHandler(async (event) => {  await requireAdminOrStaff(event)

  try {
    const client = await getUserSupabaseClient(event)

    // Verify admin access (simplified - you may want to add proper auth check)
    const authHeader = event.headers.get('authorization')
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required',
      })
    }

    const { data: { user } } = await client.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid authentication',
      })
    }

    // Check if user is admin
    const { data: profile } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (profile?.user_role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Admin access required',
      })
    }

    const results = {
      created: [] as string[],
      skipped: [] as string[],
      errors: [] as { slug: string; error: string }[],
    }

    for (const template of defaultEmailTemplates) {
      try {
        // Check if template already exists
        const { data: existing } = await client
          .from('email_templates')
          .select('id, slug')
          .eq('slug', template.slug)
          .single()

        if (existing) {
          results.skipped.push(template.slug)
          continue
        }

        // Compile MJML to HTML
        let htmlContent = template.html_content
        let textContent = template.text_content

        if (template.mjml_content) {
          const { html, errors } = enhancedEmailService.compileMjml(template.mjml_content)
          if (errors && errors.length > 0) {
            console.warn(`MJML compilation warnings for ${template.slug}:`, errors)
          }
          htmlContent = html
        }

        // Generate text from HTML if not provided
        if (!textContent && htmlContent) {
          textContent = enhancedEmailService.htmlToText(htmlContent)
        }

        // Insert template
        const { error: insertError } = await client
          .from('email_templates')
          .insert({
            name: template.name,
            slug: template.slug,
            category: template.category,
            subject: template.subject,
            description: template.description,
            mjml_content: template.mjml_content,
            html_content: htmlContent,
            text_content: textContent,
            template_variables: template.template_variables,
            use_studio_branding: template.use_studio_branding,
            is_active: template.is_active,
            is_default: template.is_default,
            created_by: user.id,
            updated_by: user.id,
          })

        if (insertError) {
          console.error(`Error inserting template ${template.slug}:`, insertError)
          results.errors.push({
            slug: template.slug,
            error: insertError.message,
          })
        } else {
          results.created.push(template.slug)
        }
      } catch (err: any) {
        console.error(`Error processing template ${template.slug}:`, err)
        results.errors.push({
          slug: template.slug,
          error: err.message || 'Unknown error',
        })
      }
    }

    return {
      success: true,
      message: 'Default templates seeded successfully',
      results,
      summary: {
        total: defaultEmailTemplates.length,
        created: results.created.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
      },
    }
  } catch (error: any) {
    console.error('Template seeding error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to seed email templates',
    })
  }
})
