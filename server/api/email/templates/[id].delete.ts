// server/api/email/templates/[id].delete.ts
import { getSupabaseClient } from '../../../utils/supabase'

/**
 * DELETE /api/email/templates/[id]
 * Delete an email template (soft delete by setting is_active = false)
 */
export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')
    const query = getQuery(event)
    const hardDelete = query.hard === 'true'

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Template ID is required',
      })
    }

    // Check if template is a default template
    const { data: template } = await client
      .from('email_templates')
      .select('is_default')
      .eq('id', id)
      .single()

    if (template?.is_default && hardDelete) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Cannot permanently delete default templates',
      })
    }

    if (hardDelete) {
      // Hard delete
      const { error } = await client
        .from('email_templates')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting email template:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to delete email template',
        })
      }
    } else {
      // Soft delete (deactivate)
      const { error } = await client
        .from('email_templates')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        console.error('Error deactivating email template:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to deactivate email template',
        })
      }
    }

    return {
      success: true,
      message: hardDelete ? 'Template deleted successfully' : 'Template deactivated successfully',
    }
  } catch (error: any) {
    console.error('Email template deletion error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error',
    })
  }
})
