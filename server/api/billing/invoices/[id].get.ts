/**
 * GET /api/billing/invoices/[id]
 * Get invoice details with line items
 */

import type { InvoiceWithLineItems } from '~/types/billing'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Invoice ID is required',
    })
  }

  // Fetch invoice
  const { data: invoice, error: invoiceError } = await client
    .from('invoices')
    .select(`
      *,
      parent:profiles!invoices_parent_user_id_fkey(user_id, full_name, email, phone),
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
  const { data: lineItems, error: lineItemsError } = await client
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at', { ascending: true })

  if (lineItemsError) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch invoice line items: ${lineItemsError.message}`,
    })
  }

  // Update viewed timestamp if invoice was sent but not yet viewed
  if (invoice.status === 'sent' && !invoice.viewed_at) {
    await client
      .from('invoices')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  return {
    success: true,
    data: {
      ...invoice,
      line_items: lineItems,
    } as InvoiceWithLineItems,
  }
})
