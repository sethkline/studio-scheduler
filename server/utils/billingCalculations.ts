/**
 * Billing Calculation Utilities
 * Core logic for calculating tuition, discounts, and generating invoices
 */

import type { Database } from '~/types/supabase'

interface EnrollmentWithClass {
  id: string
  student_id: string
  status: string
  class_instance: {
    id: string
    class_definition_id: string
    class_definition: {
      id: string
      name: string
      dance_style_id: string | null
      class_level_id: string | null
    }
  }
}

interface TuitionPlan {
  id: string
  name: string
  plan_type: 'per_class' | 'monthly' | 'semester' | 'annual'
  base_price: number
  registration_fee: number
  costume_fee: number
  recital_fee: number
  class_definition_id: string | null
  class_level_id: string | null
  dance_style_id: string | null
}

interface PricingRule {
  id: string
  name: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_scope: string
  discount_percentage: number | null
  discount_amount: number | null
  min_classes: number
  applies_to_class_number: number | null
  requires_sibling: boolean
}

interface FamilyDiscount {
  id: string
  student_id: string
  pricing_rule: PricingRule
  is_scholarship: boolean
  scholarship_amount: number | null
  scholarship_percentage: number | null
}

interface LineItem {
  description: string
  quantity: number
  unit_price_in_cents: number
  amount_in_cents: number
  enrollment_id: string | null
  tuition_plan_id: string | null
  discount_amount_in_cents: number
  discount_description: string | null
}

interface BillingCalculationResult {
  line_items: LineItem[]
  subtotal_in_cents: number
  discount_total_in_cents: number
  total_in_cents: number
  applied_discounts: string[]
}

/**
 * Calculate monthly tuition for a student
 */
export async function calculateStudentMonthlyTuition(
  studentId: string,
  billingDate: string
): Promise<BillingCalculationResult> {
  const client = getSupabaseClient()

  // Get all active enrollments for this student
  const { data: enrollments, error: enrollmentsError } = await client
    .from('enrollments')
    .select(`
      id,
      student_id,
      status,
      class_instance:class_instances!inner(
        id,
        class_definition_id,
        class_definition:class_definitions!inner(
          id,
          name,
          dance_style_id,
          class_level_id
        )
      )
    `)
    .eq('student_id', studentId)
    .eq('status', 'active')

  if (enrollmentsError || !enrollments || enrollments.length === 0) {
    return {
      line_items: [],
      subtotal_in_cents: 0,
      discount_total_in_cents: 0,
      total_in_cents: 0,
      applied_discounts: [],
    }
  }

  // Get applicable tuition plans
  const lineItems: LineItem[] = []

  for (const enrollment of enrollments) {
    const classDefId = enrollment.class_instance.class_definition_id

    // Find applicable tuition plan (class-specific first, then general)
    const { data: tuitionPlan } = await client
      .from('tuition_plans')
      .select('*')
      .eq('is_active', true)
      .lte('effective_from', billingDate)
      .or(`effective_to.is.null,effective_to.gte.${billingDate}`)
      .or(`class_definition_id.eq.${classDefId},class_definition_id.is.null`)
      .order('class_definition_id', { ascending: false, nullsLast: true })
      .limit(1)
      .single()

    if (!tuitionPlan) {
      console.warn(`No tuition plan found for enrollment ${enrollment.id}`)
      continue
    }

    // Create line item
    lineItems.push({
      description: `${enrollment.class_instance.class_definition.name} - Monthly Tuition`,
      quantity: 1,
      unit_price_in_cents: Math.round(tuitionPlan.base_price * 100),
      amount_in_cents: Math.round(tuitionPlan.base_price * 100),
      enrollment_id: enrollment.id,
      tuition_plan_id: tuitionPlan.id,
      discount_amount_in_cents: 0,
      discount_description: null,
    })
  }

  const subtotalInCents = lineItems.reduce((sum, item) => sum + item.amount_in_cents, 0)

  // Apply discounts
  const { lineItemsWithDiscounts, totalDiscountInCents, appliedDiscounts } = await applyDiscounts(
    studentId,
    lineItems,
    billingDate
  )

  const totalInCents = subtotalInCents - totalDiscountInCents

  return {
    line_items: lineItemsWithDiscounts,
    subtotal_in_cents: subtotalInCents,
    discount_total_in_cents: totalDiscountInCents,
    total_in_cents: totalInCents,
    applied_discounts: appliedDiscounts,
  }
}

/**
 * Apply all applicable discounts to line items
 */
async function applyDiscounts(
  studentId: string,
  lineItems: LineItem[],
  billingDate: string
): Promise<{
  lineItemsWithDiscounts: LineItem[]
  totalDiscountInCents: number
  appliedDiscounts: string[]
}> {
  const client = getSupabaseClient()
  const appliedDiscounts: string[] = []
  const updatedLineItems = [...lineItems]

  // Get student's parent to check for siblings
  const { data: student } = await client
    .from('students')
    .select('id, parent_id')
    .eq('id', studentId)
    .single()

  if (!student) {
    return {
      lineItemsWithDiscounts: updatedLineItems,
      totalDiscountInCents: 0,
      appliedDiscounts: [],
    }
  }

  const parentId = student.parent_id

  // 1. Apply multi-class discount (if multiple classes)
  if (lineItems.length > 1) {
    const { data: multiClassRule } = await client
      .from('pricing_rules')
      .select('*')
      .eq('discount_scope', 'multi_class')
      .eq('is_active', true)
      .lte('min_classes', lineItems.length)
      .or(`valid_from.is.null,valid_from.lte.${billingDate}`)
      .or(`valid_to.is.null,valid_to.gte.${billingDate}`)
      .order('min_classes', { ascending: false })
      .limit(1)
      .single()

    if (multiClassRule) {
      // Apply to 2nd, 3rd+ classes
      updatedLineItems.forEach((item, index) => {
        if (index > 0) {
          const discountAmount =
            multiClassRule.discount_type === 'percentage'
              ? Math.round((item.unit_price_in_cents * (multiClassRule.discount_percentage || 0)) / 100)
              : Math.round((multiClassRule.discount_amount || 0) * 100)

          item.discount_amount_in_cents = Math.max(item.discount_amount_in_cents, discountAmount)
          item.discount_description = multiClassRule.name
          appliedDiscounts.push(multiClassRule.name)
        }
      })
    }
  }

  // 2. Apply sibling discount (if multiple students in family)
  const { data: siblings } = await client
    .from('students')
    .select('id')
    .eq('parent_id', parentId)
    .neq('id', studentId)

  if (siblings && siblings.length > 0) {
    const { data: siblingRule } = await client
      .from('pricing_rules')
      .select('*')
      .eq('discount_scope', 'sibling')
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${billingDate}`)
      .or(`valid_to.is.null,valid_to.gte.${billingDate}`)
      .limit(1)
      .single()

    if (siblingRule) {
      // Apply sibling discount to all classes (take highest discount)
      updatedLineItems.forEach((item, index) => {
        const discountAmount =
          siblingRule.discount_type === 'percentage'
            ? Math.round((item.unit_price_in_cents * (siblingRule.discount_percentage || 0)) / 100)
            : Math.round((siblingRule.discount_amount || 0) * 100)

        if (discountAmount > item.discount_amount_in_cents) {
          item.discount_amount_in_cents = discountAmount
          item.discount_description = siblingRule.name
          if (!appliedDiscounts.includes(siblingRule.name)) {
            appliedDiscounts.push(siblingRule.name)
          }
        }
      })
    }
  }

  // 3. Apply family-specific discounts and scholarships
  const { data: familyDiscounts } = await client
    .from('family_discounts')
    .select(`
      *,
      pricing_rule:pricing_rules(*)
    `)
    .eq('student_id', studentId)
    .eq('is_active', true)
    .lte('valid_from', billingDate)
    .or(`valid_to.is.null,valid_to.gte.${billingDate}`)

  if (familyDiscounts && familyDiscounts.length > 0) {
    familyDiscounts.forEach((discount: any) => {
      updatedLineItems.forEach((item) => {
        let discountAmount = 0

        if (discount.is_scholarship) {
          // Apply scholarship
          if (discount.scholarship_percentage) {
            discountAmount = Math.round((item.unit_price_in_cents * discount.scholarship_percentage) / 100)
          } else if (discount.scholarship_amount) {
            discountAmount = Math.round(discount.scholarship_amount * 100)
          }

          // Scholarships stack with other discounts
          item.discount_amount_in_cents += discountAmount
          const scholarshipDesc = 'Scholarship'
          item.discount_description = item.discount_description
            ? `${item.discount_description}, ${scholarshipDesc}`
            : scholarshipDesc

          if (!appliedDiscounts.includes(scholarshipDesc)) {
            appliedDiscounts.push(scholarshipDesc)
          }
        } else if (discount.pricing_rule) {
          // Apply custom discount rule
          discountAmount =
            discount.pricing_rule.discount_type === 'percentage'
              ? Math.round((item.unit_price_in_cents * (discount.pricing_rule.discount_percentage || 0)) / 100)
              : Math.round((discount.pricing_rule.discount_amount || 0) * 100)

          if (discountAmount > item.discount_amount_in_cents) {
            item.discount_amount_in_cents = discountAmount
            item.discount_description = discount.pricing_rule.name
            if (!appliedDiscounts.includes(discount.pricing_rule.name)) {
              appliedDiscounts.push(discount.pricing_rule.name)
            }
          }
        }
      })
    })
  }

  const totalDiscountInCents = updatedLineItems.reduce((sum, item) => sum + item.discount_amount_in_cents, 0)

  return {
    lineItemsWithDiscounts: updatedLineItems,
    totalDiscountInCents,
    appliedDiscounts,
  }
}

/**
 * Calculate monthly tuition for a family (all students under a parent)
 */
export async function calculateFamilyMonthlyTuition(
  parentUserId: string,
  billingDate: string
): Promise<{
  [studentId: string]: BillingCalculationResult
}> {
  const client = getSupabaseClient()

  // Get all students for this parent
  const { data: students, error } = await client
    .from('students')
    .select('id')
    .eq('parent_id', parentUserId)

  if (error || !students || students.length === 0) {
    return {}
  }

  const results: { [studentId: string]: BillingCalculationResult } = {}

  for (const student of students) {
    results[student.id] = await calculateStudentMonthlyTuition(student.id, billingDate)
  }

  return results
}

/**
 * Generate invoice number
 * Format: INV-YYYYMM-XXXXX
 */
export async function generateInvoiceNumber(): Promise<string> {
  const client = getSupabaseClient()
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

  // Get the count of tuition invoices for this month
  const { count, error } = await client
    .from('ticket_orders')
    .select('*', { count: 'exact', head: true })
    .eq('order_type', 'tuition')
    .like('invoice_number', `INV-${yearMonth}-%`)

  if (error) {
    throw new Error(`Failed to generate invoice number: ${error.message}`)
  }

  const sequence = String((count || 0) + 1).padStart(5, '0')
  return `INV-${yearMonth}-${sequence}`
}

/**
 * Calculate late fee
 */
export function calculateLateFee(
  amountDueInCents: number,
  daysOverdue: number,
  penaltyPercentage: number = 0,
  penaltyFlatFeeInCents: number = 0
): number {
  let lateFeeInCents = 0

  if (penaltyPercentage > 0) {
    lateFeeInCents += Math.round((amountDueInCents * penaltyPercentage) / 100)
  }

  if (penaltyFlatFeeInCents > 0) {
    lateFeeInCents += penaltyFlatFeeInCents
  }

  return lateFeeInCents
}

/**
 * Calculate pro-rated refund for enrollment withdrawal
 */
export function calculateProRatedRefund(
  totalAmountInCents: number,
  startDate: Date,
  endDate: Date,
  withdrawalDate: Date
): number {
  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  const daysRemaining = (endDate.getTime() - withdrawalDate.getTime()) / (1000 * 60 * 60 * 24)

  if (daysRemaining <= 0) {
    return 0
  }

  if (daysRemaining >= totalDays) {
    return totalAmountInCents
  }

  return Math.round((totalAmountInCents * daysRemaining) / totalDays)
}
