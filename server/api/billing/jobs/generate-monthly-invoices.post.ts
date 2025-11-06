/**
 * POST /api/billing/jobs/generate-monthly-invoices
 * Generate monthly invoices for all active enrollments
 * This should be called by a cron job on the billing day of each month
 */

import { generateInvoiceNumber } from '~/server/utils/invoiceUtils'
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
    total_amount: 0,
    errors: [] as any[],
  }

  try {
    // Get all active enrollments grouped by parent
    const { data: enrollments, error: enrollmentsError } = await client
      .from('enrollments')
      .select(`
        *,
        student:students(id, first_name, last_name, parent_id),
        class_instance:class_instances(
          id,
          class_definition_id,
          class_definitions(id, name)
        )
      `)
      .eq('status', 'active')

    if (enrollmentsError) {
      throw new Error(`Failed to fetch enrollments: ${enrollmentsError.message}`)
    }

    if (!enrollments || enrollments.length === 0) {
      return {
        ...results,
        message: 'No active enrollments found',
      }
    }

    // Group enrollments by parent
    const enrollmentsByParent = new Map<string, any[]>()
    enrollments.forEach((enrollment) => {
      const parentId = enrollment.student.parent_id
      if (!enrollmentsByParent.has(parentId)) {
        enrollmentsByParent.set(parentId, [])
      }
      enrollmentsByParent.get(parentId)!.push(enrollment)
    })

    // Generate invoice for each parent
    for (const [parentId, parentEnrollments] of enrollmentsByParent) {
      try {
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

        // Get active tuition plans for enrollments
        const lineItems: any[] = []
        const enrollmentIds: string[] = []

        for (const enrollment of parentEnrollments) {
          const classDefId = enrollment.class_instance.class_definition_id

          // Find applicable tuition plan
          const { data: tuitionPlan } = await client
            .from('tuition_plans')
            .select('*')
            .eq('is_active', true)
            .eq('class_definition_id', classDefId)
            .lte('effective_from', billingDate)
            .or(`effective_to.is.null,effective_to.gte.${billingDate}`)
            .single()

          if (!tuitionPlan) {
            // No specific plan, try to find a general plan
            const { data: generalPlan } = await client
              .from('tuition_plans')
              .select('*')
              .eq('is_active', true)
              .is('class_definition_id', null)
              .lte('effective_from', billingDate)
              .or(`effective_to.is.null,effective_to.gte.${billingDate}`)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (!generalPlan) {
              results.errors.push({
                parent_id: parentId,
                enrollment_id: enrollment.id,
                error: 'No active tuition plan found',
              })
              continue
            }

            lineItems.push({
              description: `${enrollment.class_instance.class_definitions.name} - Monthly Tuition`,
              quantity: 1,
              unit_price: generalPlan.base_price,
              enrollment_id: enrollment.id,
              tuition_plan_id: generalPlan.id,
            })
            enrollmentIds.push(enrollment.id)
          } else {
            lineItems.push({
              description: `${enrollment.class_instance.class_definitions.name} - Monthly Tuition`,
              quantity: 1,
              unit_price: tuitionPlan.base_price,
              enrollment_id: enrollment.id,
              tuition_plan_id: tuitionPlan.id,
            })
            enrollmentIds.push(enrollment.id)
          }
        }

        if (lineItems.length === 0) {
          results.errors.push({
            parent_id: parentId,
            error: 'No billable line items',
          })
          results.invoices_failed++
          continue
        }

        // Get applicable family discounts
        const { data: familyDiscounts } = await client
          .from('family_discounts')
          .select('*, pricing_rule:pricing_rules(*)')
          .in('student_id', parentEnrollments.map(e => e.student.id))
          .eq('is_active', true)
          .lte('valid_from', billingDate)
          .or(`valid_to.is.null,valid_to.gte.${billingDate}`)

        // Apply multi-class discounts
        if (lineItems.length > 1) {
          const { data: multiClassRule } = await client
            .from('pricing_rules')
            .select('*')
            .eq('discount_scope', 'multi_class')
            .eq('is_active', true)
            .lte('min_classes', lineItems.length)
            .single()

          if (multiClassRule) {
            // Apply discount to 2nd, 3rd+ classes
            lineItems.forEach((item, index) => {
              if (index > 0) {
                const discountAmount = multiClassRule.discount_type === 'percentage'
                  ? (item.unit_price * multiClassRule.discount_percentage) / 100
                  : multiClassRule.discount_amount

                item.discount_amount = discountAmount
                item.discount_description = multiClassRule.name
              }
            })
          }
        }

        // Apply sibling discounts
        const uniqueStudents = new Set(parentEnrollments.map(e => e.student.id))
        if (uniqueStudents.size > 1) {
          const { data: siblingRule } = await client
            .from('pricing_rules')
            .select('*')
            .eq('discount_scope', 'sibling')
            .eq('is_active', true)
            .single()

          if (siblingRule) {
            lineItems.forEach((item, index) => {
              if (index > 0) {
                const existingDiscount = item.discount_amount || 0
                const siblingDiscount = siblingRule.discount_type === 'percentage'
                  ? (item.unit_price * siblingRule.discount_percentage) / 100
                  : siblingRule.discount_amount

                // Apply the higher discount
                if (siblingDiscount > existingDiscount) {
                  item.discount_amount = siblingDiscount
                  item.discount_description = siblingRule.name
                }
              }
            })
          }
        }

        // Apply scholarship/custom discounts
        if (familyDiscounts && familyDiscounts.length > 0) {
          familyDiscounts.forEach((discount: any) => {
            // Find line items for this student
            lineItems.forEach((item) => {
              const enrollment = parentEnrollments.find(e => e.id === item.enrollment_id)
              if (enrollment && enrollment.student.id === discount.student_id) {
                if (discount.is_scholarship) {
                  const scholarshipDiscount = discount.scholarship_percentage
                    ? (item.unit_price * discount.scholarship_percentage) / 100
                    : discount.scholarship_amount

                  item.discount_amount = (item.discount_amount || 0) + scholarshipDiscount
                  item.discount_description = item.discount_description
                    ? `${item.discount_description}, Scholarship`
                    : 'Scholarship'
                }
              }
            })
          })
        }

        // Calculate totals
        const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
        const discountTotal = lineItems.reduce((sum, item) => sum + (item.discount_amount || 0), 0)
        const totalAmount = subtotal - discountTotal

        if (dryRun) {
          console.log('DRY RUN - Would create invoice:', {
            parent: parent.full_name,
            line_items: lineItems.length,
            subtotal,
            discount_total: discountTotal,
            total: totalAmount,
          })
          results.invoices_generated++
          results.total_amount += totalAmount
          continue
        }

        // Generate invoice
        const invoiceNumber = await generateInvoiceNumber()
        const issueDate = billingDate
        const dueDate = new Date(billingDate)
        dueDate.setDate(dueDate.getDate() + 14) // Due in 14 days

        const { data: invoice, error: invoiceError } = await client
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            parent_user_id: parentId,
            status: 'draft',
            issue_date: issueDate,
            due_date: dueDate.toISOString().split('T')[0],
            subtotal,
            discount_total: discountTotal,
            tax_total: 0,
            total_amount: totalAmount,
            amount_paid: 0,
            amount_due: totalAmount,
            notes: 'Monthly tuition invoice - automatically generated',
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
        const lineItemsData = lineItems.map((item) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.quantity * item.unit_price,
          enrollment_id: item.enrollment_id,
          tuition_plan_id: item.tuition_plan_id,
          discount_amount: item.discount_amount || 0,
          discount_description: item.discount_description || null,
        }))

        const { error: lineItemsError } = await client
          .from('invoice_line_items')
          .insert(lineItemsData)

        if (lineItemsError) {
          // Rollback
          await client.from('invoices').delete().eq('id', invoice.id)
          results.errors.push({
            parent_id: parentId,
            error: `Failed to create line items: ${lineItemsError.message}`,
          })
          results.invoices_failed++
          continue
        }

        // Send invoice immediately
        const { error: sendError } = await client
          .from('invoices')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', invoice.id)

        if (!sendError) {
          // Send email
          try {
            await sendInvoiceEmail({
              invoice: { ...invoice, line_items: lineItemsData },
              parentEmail: parent.email,
              parentName: parent.full_name,
            })
          } catch (emailError) {
            console.error('Failed to send invoice email:', emailError)
          }
        }

        results.invoices_generated++
        results.total_amount += totalAmount

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
      message: `Generated ${results.invoices_generated} invoices. ${results.invoices_failed} failed.`,
    }

  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to generate invoices: ${error.message}`,
    })
  }
})
