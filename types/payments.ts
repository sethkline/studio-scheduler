// types/payments.ts

/**
 * Payment record for tracking all parent payments
 */
export interface Payment {
  id: string
  guardian_id: string
  student_id?: string | null

  // Payment details
  amount_cents: number // Store in cents
  currency: string // USD, EUR, etc.
  payment_type: PaymentType
  payment_method?: PaymentMethod

  // Status tracking
  status: PaymentStatus

  // Description and metadata
  description: string
  notes?: string

  // References
  class_instance_id?: string | null
  recital_id?: string | null
  order_id?: string | null

  // Stripe integration
  stripe_payment_intent_id?: string
  stripe_charge_id?: string
  stripe_customer_id?: string

  // Dates
  due_date?: string
  paid_at?: string

  // Receipt information
  receipt_number?: string
  receipt_url?: string

  created_at: string
  updated_at: string
}

/**
 * Payment with additional relationship data
 */
export interface PaymentWithRelations extends Payment {
  student?: {
    id: string
    first_name: string
    last_name: string
  }
  guardian?: {
    id: string
    first_name: string
    last_name: string
  }
}

/**
 * Payment types
 */
export type PaymentType =
  | 'tuition'
  | 'recital_fee'
  | 'costume'
  | 'registration'
  | 'late_fee'
  | 'tickets'
  | 'other'

/**
 * Payment methods
 */
export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'ach'
  | 'check'
  | 'cash'
  | 'stripe'

/**
 * Payment status
 */
export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'overdue'

/**
 * Payment summary statistics
 */
export interface PaymentSummary {
  total_paid: number // in cents
  total_pending: number // in cents
  total_overdue: number // in cents
  total_due: number // in cents (pending + overdue)
  payment_count: number
  last_payment_date?: string
  next_due_date?: string
}

/**
 * Payment history response
 */
export interface PaymentHistoryResponse {
  payments: PaymentWithRelations[]
  summary: PaymentSummary
}

/**
 * Payment method on file
 */
export interface PaymentMethodOnFile {
  id: string
  guardian_id: string

  // Stripe details
  stripe_payment_method_id?: string
  type: 'card' | 'ach' | 'bank_account'

  // Card details
  card_brand?: string
  card_last4?: string
  card_exp_month?: number
  card_exp_year?: number

  // Bank account details
  bank_name?: string
  bank_last4?: string

  // Status
  is_default: boolean
  status: 'active' | 'expired' | 'removed'

  created_at: string
  updated_at: string
}

/**
 * Payment filter options
 */
export interface PaymentFilters {
  student_id?: string
  payment_type?: PaymentType
  status?: PaymentStatus
  start_date?: string
  end_date?: string
}

/**
 * Create payment request
 */
export interface CreatePaymentRequest {
  guardian_id: string
  student_id?: string
  amount_cents: number
  currency?: string
  payment_type: PaymentType
  description: string
  due_date?: string
  notes?: string
  class_instance_id?: string
  recital_id?: string
}

/**
 * Update payment request
 */
export interface UpdatePaymentRequest {
  status?: PaymentStatus
  payment_method?: PaymentMethod
  paid_at?: string
  notes?: string
  stripe_payment_intent_id?: string
  stripe_charge_id?: string
}
