/**
 * POST /api/billing/jobs/generate-monthly-invoices
 * Generate monthly tuition invoices for all families with active enrollments
 * REVISED: Uses enrollment-based calculation and integrates with ticket_orders
 */

import { calculateFamilyMonthlyTuition, generateInvoiceNumber } from '~/server/utils/billingCalculations'
import { sendInvoiceEmail } from '~/server/utils/emailTemplates'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody<{
    billing_date?: string
    dry_run?: boolean
  }>(event)

  const billingDate = body.billing_date || new Date().toISOString().split('T')[0]
  const dryRun = body.dry_run || false

  const results = {
    success: true,
    invoices_generated: 0,
    invoices_failed: 0,
    total_amount_in_cents: 0,
    families_processed: 0,
    errors: [] as any[],
  }

  try {
    // Get all unique parents with active enrollments
    const { data: activeEnrollments, error: enrollmentsError } = await client
      .from('enrollments')
      .select(`
        student:students!inner(
          id,
          parent_id,
          first_name,
          last_name
        )
      `)
      .eq('status', 'active')

    if (enrollmentsError) {
      throw new Error(`Failed to fetch enrollments: ${enrollmentsError.message}`)
    }

    if (!activeEnrollments || activeEnrollments.length === 0) {
      return {
        ...results,
        message: 'No active enrollments found',
      }
    }

    // Get unique parent IDs
    const parentIds = new Set<string>()
    activeEnrollments.forEach((enrollment: any) => {
      if (enrollment.student?.parent_id) {
        parentIds.add(enrollment.student.parent_id)
      }
    })

    // Process each family
    for (const parentId of parentIds) {
      try {
        results.families_processed++

        // Get parent profile
        const { data: parent } = await client
          .from('profiles')
          .select('user_id, full_name, email')
          .eq('user_id', parentId)
          .single()

        if (!parent) {
          results.errors.push({
            parent_id: parentId,
            error: 'Parent profile not found',
          })
          results.invoices_failed++
          continue
        }

        // Calculate tuition for all students in family
        const familyTuition = await calculateFamilyMonthlyTuition(parentId, billingDate)

        // Combine all line items from all students
        const allLineItems: any[] = []
        let familyTotalInCents = 0
        let familyDiscountInCents = 0
        const appliedDiscounts: string[] = []

        Object.values(familyTuition).forEach((studentTuition) => {
          allLineItems.push(...studentTuition.line_items)
          familyTotalInCents += studentTuition.total_in_cents
          familyDiscountInCents += studentTuition.discount_total_in_cents

          studentTuition.applied_discounts.forEach((discount) => {
            if (!appliedDiscounts.includes(discount)) {
              appliedDiscounts.push(discount)
            }
          })
        })

        if (allLineItems.length === 0) {
          results.errors.push({
            parent_id: parentId,
            error: 'No billable items found',
          })
          results.invoices_failed++
          continue
        }

        if (dryRun) {
          console.log('DRY RUN - Would create invoice:', {
            parent: parent.full_name,
            line_items: allLineItems.length,
            subtotal_in_cents: allLineItems.reduce((sum, item) => sum + item.amount_in_cents, 0),
            discount_total_in_cents: familyDiscountInCents,
            total_in_cents: familyTotalInCents,
            applied_discounts: appliedDiscounts,
          })
          results.invoices_generated++
          results.total_amount_in_cents += familyTotalInCents
          continue
        }

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber()
        const issueDate = billingDate
        const dueDate = new Date(billingDate)
        dueDate.setDate(dueDate.getDate() + 14) // Due in 14 days

        // Create invoice (using ticket_orders table with order_type='tuition')
        const { data: invoice, error: invoiceError } = await client
          .from('ticket_orders')
          .insert({
            order_type: 'tuition',
            parent_user_id: parentId,
            invoice_number: invoiceNumber,
            customer_name: parent.full_name,
            email: parent.email,
            total_amount_in_cents: familyTotalInCents,
            payment_status: 'pending',
            due_date: dueDate.toISOString().split('T')[0],
            notes: `Monthly tuition invoice - ${appliedDiscounts.length > 0 ? 'Discounts applied: ' + appliedDiscounts.join(', ') : 'No discounts'}`,
          })
          .select()
          .single()

        if (invoiceError) {
          results.errors.push({
            parent_id: parentId,
            error: `Failed to create invoice: ${invoiceError.message}`,
          })
          results.invoices_failed++
          continue
        }

        // Create line items
        const lineItemsData = allLineItems.map((item) => ({
          order_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price_in_cents: item.unit_price_in_cents,
          amount_in_cents: item.amount_in_cents,
          enrollment_id: item.enrollment_id,
          tuition_plan_id: item.tuition_plan_id,
          discount_amount_in_cents: item.discount_amount_in_cents,
          discount_description: item.discount_description,
        }))

        const { error: lineItemsError } = await client
          .from('order_line_items')
          .insert(lineItemsData)

        if (lineItemsError) {
          // Rollback: delete the invoice if line items fail
          await client.from('ticket_orders').delete().eq('id', invoice.id)
          results.errors.push({
            parent_id: parentId,
            error: `Failed to create line items: ${lineItemsError.message}`,
          })
          results.invoices_failed++
          continue
        }

        // Send invoice email
        try {
          await sendInvoiceEmail({
            invoice: {
              ...invoice,
              line_items: lineItemsData,
            },
            parentEmail: parent.email,
            parentName: parent.full_name,
          })
        } catch (emailError) {
          console.error('Failed to send invoice email:', emailError)
          // Don't fail the whole operation if email fails
        }

        results.invoices_generated++
        results.total_amount_in_cents += familyTotalInCents

      } catch (error: any) {
        results.errors.push({
          parent_id: parentId,
          error: error.message,
        })
        results.invoices_failed++
      }
    }

    return {
      ...results,
      message: `Processed ${results.families_processed} families. Generated ${results.invoices_generated} invoices. ${results.invoices_failed} failed.`,
    }

  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to generate invoices: ${error.message}`,
    })
  }
})
