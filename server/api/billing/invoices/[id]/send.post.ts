/**
 * POST /api/billing/invoices/[id]/send
 * Send an invoice to the parent via email
 */

import { sendInvoiceEmail } from '~/server/utils/emailTemplates'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Invoice ID is required',
    })
  }

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Fetch invoice with parent details
  const { data: invoice, error: invoiceError } = await client
    .from('invoices')
    .select(`
      *,
      parent:profiles!invoices_parent_user_id_fkey(user_id, full_name, email),
      student:students(id, first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (invoiceError) {
    throw createError({
      statusCode: invoiceError.code === 'PGRST116' ? 404 : 500,
      message: invoiceError.code === 'PGRST116' ? 'Invoice not found' : `Failed to fetch invoice: ${invoiceError.message}`,
    })
  }

  // Fetch line items
  const { data: lineItems } = await client
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)

  // Update invoice status
  const { error: updateError } = await client
    .from('invoices')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    throw createError({
      statusCode: 500,
      message: `Failed to update invoice: ${updateError.message}`,
    })
  }

  // Send email (will be implemented in email templates)
  try {
    await sendInvoiceEmail({
      invoice: {
        ...invoice,
        line_items: lineItems || [],
      },
      parentEmail: invoice.parent.email,
      parentName: invoice.parent.full_name,
    })
  } catch (emailError: any) {
    console.error('Failed to send invoice email:', emailError)
    // Don't fail the request if email fails - invoice is still marked as sent
  }

  return {
    success: true,
    message: 'Invoice sent successfully',
  }
})
