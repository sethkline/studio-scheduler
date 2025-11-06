/**
 * POST /api/billing/invoices
 * Create a new invoice manually
 */

import type { CreateInvoiceInput, InvoiceWithLineItems } from '~/types/billing'
import { generateInvoiceNumber } from '~/server/utils/invoiceUtils'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody<CreateInvoiceInput>(event)

  // Get authenticated user
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Validate required fields
  if (!body.parent_user_id || !body.issue_date || !body.due_date || !body.line_items || body.line_items.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: parent_user_id, issue_date, due_date, line_items',
    })
  }

  // Validate dates
  if (new Date(body.due_date) < new Date(body.issue_date)) {
    throw createError({
      statusCode: 400,
      message: 'Due date must be after issue date',
    })
  }

  // Calculate totals from line items
  let subtotal = 0
  let discountTotal = 0

  body.line_items.forEach((item) => {
    const itemAmount = item.quantity * item.unit_price
    subtotal += itemAmount
    discountTotal += item.discount_amount || 0
  })

  const totalAmount = subtotal - discountTotal
  const amountDue = totalAmount

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber()

  // Create invoice
  const { data: invoice, error: invoiceError } = await client
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      parent_user_id: body.parent_user_id,
      student_id: body.student_id || null,
      status: 'draft',
      issue_date: body.issue_date,
      due_date: body.due_date,
      subtotal,
      discount_total: discountTotal,
      tax_total: 0, // TODO: Add tax calculation if needed
      total_amount: totalAmount,
      amount_paid: 0,
      amount_due: amountDue,
      notes: body.notes || null,
      internal_notes: body.internal_notes || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (invoiceError) {
    throw createError({
      statusCode: 500,
      message: `Failed to create invoice: ${invoiceError.message}`,
    })
  }

  // Create line items
  const lineItemsData = body.line_items.map((item) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    amount: item.quantity * item.unit_price,
    enrollment_id: item.enrollment_id || null,
    tuition_plan_id: item.tuition_plan_id || null,
    discount_amount: item.discount_amount || 0,
    discount_description: item.discount_description || null,
  }))

  const { data: lineItems, error: lineItemsError } = await client
    .from('invoice_line_items')
    .insert(lineItemsData)
    .select()

  if (lineItemsError) {
    // Rollback: delete the invoice if line items fail
    await client.from('invoices').delete().eq('id', invoice.id)

    throw createError({
      statusCode: 500,
      message: `Failed to create invoice line items: ${lineItemsError.message}`,
    })
  }

  return {
    success: true,
    data: {
      ...invoice,
      line_items: lineItems,
    } as InvoiceWithLineItems,
    message: 'Invoice created successfully',
  }
})
