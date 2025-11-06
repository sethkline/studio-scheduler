/**
 * Tuition & Billing System Types
 * Comprehensive type definitions for financial management
 */

// =====================================================
// ENUMS
// =====================================================

export type TuitionPlanType = 'per_class' | 'monthly' | 'semester' | 'annual'
export type DiscountType = 'percentage' | 'fixed_amount'
export type DiscountScope = 'multi_class' | 'sibling' | 'early_registration' | 'scholarship' | 'custom' | 'coupon'
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partial_paid' | 'overdue' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'cancelled'
export type PaymentMethodType = 'card' | 'bank_transfer' | 'cash' | 'check' | 'other'
export type RefundStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type RefundType = 'full' | 'partial' | 'pro_rated' | 'studio_credit'
export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled'
export type PaymentPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled'

// =====================================================
// TUITION PLANS & PRICING
// =====================================================

export interface TuitionPlan {
  id: string
  name: string
  description: string | null
  plan_type: TuitionPlanType
  is_active: boolean
  effective_from: string
  effective_to: string | null

  // Pricing
  base_price: number
  classes_per_week: number | null
  registration_fee: number
  costume_fee: number
  recital_fee: number

  // Restrictions
  class_definition_id: string | null
  class_level_id: string | null
  dance_style_id: string | null

  // Metadata
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface CreateTuitionPlanInput {
  name: string
  description?: string
  plan_type: TuitionPlanType
  is_active?: boolean
  effective_from: string
  effective_to?: string
  base_price: number
  classes_per_week?: number
  registration_fee?: number
  costume_fee?: number
  recital_fee?: number
  class_definition_id?: string
  class_level_id?: string
  dance_style_id?: string
}

export interface UpdateTuitionPlanInput extends Partial<CreateTuitionPlanInput> {
  id: string
}

export interface PricingRule {
  id: string
  name: string
  description: string | null
  discount_type: DiscountType
  discount_scope: DiscountScope

  // Discount values
  discount_percentage: number | null
  discount_amount: number | null

  // Application rules
  min_classes: number
  applies_to_class_number: number | null
  requires_sibling: boolean
  early_registration_days: number | null

  // Coupon
  coupon_code: string | null
  max_uses: number | null
  current_uses: number

  // Validity
  is_active: boolean
  valid_from: string | null
  valid_to: string | null

  // Metadata
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface CreatePricingRuleInput {
  name: string
  description?: string
  discount_type: DiscountType
  discount_scope: DiscountScope
  discount_percentage?: number
  discount_amount?: number
  min_classes?: number
  applies_to_class_number?: number
  requires_sibling?: boolean
  early_registration_days?: number
  coupon_code?: string
  max_uses?: number
  is_active?: boolean
  valid_from?: string
  valid_to?: string
}

export interface UpdatePricingRuleInput extends Partial<CreatePricingRuleInput> {
  id: string
}

export interface FamilyDiscount {
  id: string
  student_id: string
  pricing_rule_id: string

  // Scholarship fields
  is_scholarship: boolean
  scholarship_amount: number | null
  scholarship_percentage: number | null
  scholarship_notes: string | null

  // Approval
  approved_by: string | null
  approved_at: string | null

  // Validity
  is_active: boolean
  valid_from: string
  valid_to: string | null

  // Metadata
  created_at: string
  updated_at: string
}

export interface ApplyDiscountInput {
  student_id: string
  pricing_rule_id: string
  is_scholarship?: boolean
  scholarship_amount?: number
  scholarship_percentage?: number
  scholarship_notes?: string
  valid_from: string
  valid_to?: string
}

// =====================================================
// INVOICING
// =====================================================

export interface Invoice {
  id: string
  invoice_number: string
  parent_user_id: string
  student_id: string | null

  // Status and dates
  status: InvoiceStatus
  issue_date: string
  due_date: string

  // Amounts
  subtotal: number
  discount_total: number
  tax_total: number
  total_amount: number
  amount_paid: number
  amount_due: number

  // Late fees
  late_fee_applied: number
  late_fee_applied_at: string | null

  // Notes
  notes: string | null
  internal_notes: string | null

  // PDF
  pdf_url: string | null
  pdf_generated_at: string | null

  // Tracking
  sent_at: string | null
  viewed_at: string | null
  paid_at: string | null

  // Metadata
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  amount: number

  // References
  enrollment_id: string | null
  tuition_plan_id: string | null

  // Discounts
  discount_amount: number
  discount_description: string | null

  created_at: string
}

export interface CreateInvoiceInput {
  parent_user_id: string
  student_id?: string
  issue_date: string
  due_date: string
  notes?: string
  internal_notes?: string
  line_items: CreateInvoiceLineItemInput[]
}

export interface CreateInvoiceLineItemInput {
  description: string
  quantity: number
  unit_price: number
  enrollment_id?: string
  tuition_plan_id?: string
  discount_amount?: number
  discount_description?: string
}

export interface InvoiceWithLineItems extends Invoice {
  line_items: InvoiceLineItem[]
}

export interface InvoiceSummary {
  total_invoices: number
  total_amount: number
  total_paid: number
  total_outstanding: number
  overdue_count: number
  overdue_amount: number
}

// =====================================================
// PAYMENTS
// =====================================================

export interface Payment {
  id: string
  parent_user_id: string
  invoice_id: string | null

  // Payment details
  amount: number
  payment_status: PaymentStatus
  payment_method_type: PaymentMethodType

  // Stripe
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null

  // Metadata
  payment_date: string
  confirmation_number: string | null
  allocated_to_invoice: boolean

  // Notes
  notes: string | null
  internal_notes: string | null

  // Receipt
  receipt_url: string | null
  receipt_email_sent: boolean
  receipt_sent_at: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

export interface PaymentAllocation {
  id: string
  payment_id: string
  invoice_id: string
  allocated_amount: number
  created_at: string
}

export interface CreatePaymentInput {
  parent_user_id: string
  invoice_id?: string
  amount: number
  payment_method_type: PaymentMethodType
  stripe_payment_intent_id?: string
  notes?: string
  allocations?: PaymentAllocationInput[]
}

export interface PaymentAllocationInput {
  invoice_id: string
  allocated_amount: number
}

export interface ProcessPaymentInput {
  invoice_id: string
  amount: number
  payment_method_id: string
  save_payment_method?: boolean
}

export interface PaymentSummary {
  total_payments: number
  total_amount: number
  card_payments: number
  card_amount: number
  cash_payments: number
  cash_amount: number
}

// =====================================================
// PAYMENT METHODS & AUTO-PAY
// =====================================================

export interface PaymentMethod {
  id: string
  parent_user_id: string

  // Stripe
  stripe_payment_method_id: string
  stripe_customer_id: string

  // Details
  payment_method_type: PaymentMethodType
  card_brand: string | null
  card_last4: string | null
  card_exp_month: number | null
  card_exp_year: number | null

  // Settings
  is_default: boolean
  is_autopay_enabled: boolean
  nickname: string | null

  // Metadata
  created_at: string
  updated_at: string
}

export interface AddPaymentMethodInput {
  stripe_payment_method_id: string
  is_default?: boolean
  is_autopay_enabled?: boolean
  nickname?: string
}

export interface BillingSchedule {
  id: string
  parent_user_id: string
  student_id: string
  payment_method_id: string | null

  // Schedule
  is_active: boolean
  billing_day: number

  // Stripe subscription
  stripe_subscription_id: string | null
  stripe_price_id: string | null

  // Discount
  autopay_discount_percentage: number

  // Next billing
  next_billing_date: string | null
  last_billing_date: string | null

  // Failures
  retry_count: number
  last_failure_date: string | null
  last_failure_reason: string | null

  // Metadata
  created_at: string
  updated_at: string
}

export interface CreateBillingScheduleInput {
  student_id: string
  payment_method_id: string
  billing_day: number
  autopay_discount_percentage?: number
}

export interface UpdateBillingScheduleInput {
  id: string
  is_active?: boolean
  payment_method_id?: string
  billing_day?: number
}

// =====================================================
// REFUNDS
// =====================================================

export interface Refund {
  id: string
  payment_id: string
  invoice_id: string | null

  // Refund details
  refund_amount: number
  refund_type: RefundType
  refund_status: RefundStatus

  // Stripe
  stripe_refund_id: string | null

  // Reason and approval
  reason: string
  internal_notes: string | null
  requested_by: string | null
  approved_by: string | null
  approved_at: string | null

  // Processing
  processed_at: string | null
  completed_at: string | null

  // Studio credit
  is_studio_credit: boolean
  studio_credit_balance: string | null

  // Metadata
  created_at: string
  updated_at: string
}

export interface CreateRefundInput {
  payment_id: string
  invoice_id?: string
  refund_amount: number
  refund_type: RefundType
  reason: string
  internal_notes?: string
  is_studio_credit?: boolean
}

export interface ApproveRefundInput {
  refund_id: string
  approved_by: string
}

export interface StudioCredit {
  id: string
  parent_user_id: string
  total_credit: number
  used_credit: number
  available_credit: number
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface StudioCreditTransaction {
  id: string
  studio_credit_id: string
  transaction_type: string
  amount: number
  description: string | null
  refund_id: string | null
  invoice_id: string | null
  created_at: string
}

// =====================================================
// LATE PAYMENT TRACKING
// =====================================================

export interface PaymentReminder {
  id: string
  invoice_id: string
  parent_user_id: string

  // Reminder details
  reminder_type: string
  days_overdue: number

  // Status
  reminder_status: ReminderStatus
  scheduled_for: string
  sent_at: string | null

  // Email
  email_subject: string | null
  email_body: string | null

  // Tracking
  opened_at: string | null
  clicked_at: string | null

  created_at: string
}

export interface ScheduleReminderInput {
  invoice_id: string
  reminder_type: string
  scheduled_for: string
  email_subject: string
  email_body: string
}

export interface LatePaymentPenalty {
  id: string
  invoice_id: string
  penalty_amount: number
  applied_at: string
  days_overdue: number
  penalty_percentage: number | null
  penalty_flat_fee: number | null
  created_at: string
}

export interface ApplyLateFeeInput {
  invoice_id: string
  penalty_amount: number
  days_overdue: number
  penalty_percentage?: number
  penalty_flat_fee?: number
}

// =====================================================
// PAYMENT PLANS
// =====================================================

export interface PaymentPlan {
  id: string
  parent_user_id: string
  invoice_id: string

  // Plan details
  total_amount: number
  down_payment: number
  remaining_balance: number

  // Installments
  num_installments: number
  installment_amount: number
  installment_frequency: string

  // Status
  payment_plan_status: PaymentPlanStatus

  // Dates
  start_date: string
  next_payment_date: string

  // Tracking
  payments_made: number
  total_paid: number

  // Metadata
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface PaymentPlanInstallment {
  id: string
  payment_plan_id: string
  installment_number: number
  due_date: string
  amount: number
  is_paid: boolean
  payment_id: string | null
  paid_at: string | null
  created_at: string
}

export interface CreatePaymentPlanInput {
  invoice_id: string
  down_payment: number
  num_installments: number
  installment_frequency: string
  start_date: string
}

export interface PaymentPlanWithInstallments extends PaymentPlan {
  installments: PaymentPlanInstallment[]
}

// =====================================================
// FINANCIAL REPORTING
// =====================================================

export interface RevenueSummary {
  month: string
  payment_count: number
  total_revenue: number
  card_revenue: number
  cash_revenue: number
  check_revenue: number
}

export interface OutstandingBalance {
  parent_user_id: string
  parent_name: string
  parent_email: string
  invoice_count: number
  total_outstanding: number
  overdue_amount: number
  oldest_due_date: string
  most_recent_overdue_date: string | null
}

export interface AgingReport {
  parent_user_id: string
  parent_name: string
  parent_email: string
  days_0_30: number
  days_31_60: number
  days_61_90: number
  days_90_plus: number
  total_outstanding: number
}

export interface FinancialReport {
  period: string
  total_revenue: number
  total_expenses: number
  net_income: number
  outstanding_balance: number
  overdue_balance: number
  revenue_by_source: {
    tuition: number
    tickets: number
    merchandise: number
    other: number
  }
  payment_collection_rate: number
}

export interface RevenueByClassReport {
  class_definition_id: string
  class_name: string
  teacher_name: string
  enrolled_students: number
  total_revenue: number
  projected_revenue: number
  collection_rate: number
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface BillingConfiguration {
  late_fee_percentage: number
  late_fee_flat_amount: number
  late_fee_grace_period_days: number
  autopay_discount_percentage: number
  tax_rate: number
  invoice_due_days: number
  payment_retry_attempts: number
  payment_retry_interval_days: number
}

export interface AutomatedBillingJob {
  id: string
  job_type: string
  scheduled_for: string
  status: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  invoices_generated: number
  invoices_failed: number
  created_at: string
}
