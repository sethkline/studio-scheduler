/**
 * Invoice utility functions
 */

/**
 * Generate a unique invoice number
 * Format: INV-YYYYMM-XXXXX
 */
export async function generateInvoiceNumber(): Promise<string> {
  const client = getSupabaseClient()
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

  // Get the count of invoices for this month
  const { count, error } = await client
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .like('invoice_number', `INV-${yearMonth}-%`)

  if (error) {
    throw new Error(`Failed to generate invoice number: ${error.message}`)
  }

  const sequence = String((count || 0) + 1).padStart(5, '0')
  return `INV-${yearMonth}-${sequence}`
}

/**
 * Calculate discount amount based on pricing rules
 */
export function calculateDiscountAmount(
  subtotal: number,
  discountType: 'percentage' | 'fixed_amount',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return (subtotal * discountValue) / 100
  }
  return Math.min(discountValue, subtotal) // Don't exceed subtotal
}

/**
 * Calculate late fee
 */
export function calculateLateFee(
  amountDue: number,
  daysOverdue: number,
  penaltyPercentage: number = 0,
  penaltyFlatFee: number = 0
): number {
  let lateFee = 0

  if (penaltyPercentage > 0) {
    lateFee += (amountDue * penaltyPercentage) / 100
  }

  if (penaltyFlatFee > 0) {
    lateFee += penaltyFlatFee
  }

  return lateFee
}

/**
 * Calculate pro-rated refund for enrollment withdrawal
 */
export function calculateProRatedRefund(
  totalAmount: number,
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
    return totalAmount
  }

  return (totalAmount * daysRemaining) / totalDays
}
