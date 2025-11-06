/**
 * Email template functions for billing system
 */

import { getEmailService } from './email'

interface InvoiceEmailData {
  invoice: any
  parentEmail: string
  parentName: string
}

interface PaymentReceiptData {
  payment: any
  invoice: any
  parentEmail: string
  parentName: string
}

interface ReminderEmailData {
  invoice: any
  parentEmail: string
  parentName: string
  reminderType: string
  daysOverdue: number
}

/**
 * Send invoice email to parent
 */
export async function sendInvoiceEmail(data: InvoiceEmailData) {
  const emailService = getEmailService()
  const config = useRuntimeConfig()

  const { invoice, parentEmail, parentName } = data

  // Format line items for email
  const lineItemsHtml = invoice.line_items
    .map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unit_price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.amount.toFixed(2)}</td>
      </tr>
    `)
    .join('')

  const subject = `Invoice ${invoice.invoice_number} from Your Dance Studio`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #1f2937; margin: 0;">New Invoice</h1>
      </div>

      <p>Dear ${parentName},</p>

      <p>You have received a new invoice for dance classes. Please find the details below:</p>

      <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Invoice Number:</td>
            <td style="padding: 8px; text-align: right;">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Issue Date:</td>
            <td style="padding: 8px; text-align: right;">${new Date(invoice.issue_date).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Due Date:</td>
            <td style="padding: 8px; text-align: right; color: #dc2626; font-weight: bold;">${new Date(invoice.due_date).toLocaleDateString()}</td>
          </tr>
        </table>

        <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Invoice Items</h3>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>

        <table style="width: 100%; margin-top: 20px;">
          <tr>
            <td style="padding: 8px; text-align: right; font-weight: bold;">Subtotal:</td>
            <td style="padding: 8px; text-align: right; width: 120px;">$${invoice.subtotal.toFixed(2)}</td>
          </tr>
          ${invoice.discount_total > 0 ? `
          <tr>
            <td style="padding: 8px; text-align: right; color: #16a34a;">Discounts:</td>
            <td style="padding: 8px; text-align: right; color: #16a34a;">-$${invoice.discount_total.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr style="border-top: 2px solid #e5e7eb;">
            <td style="padding: 8px; text-align: right; font-weight: bold; font-size: 1.1em;">Total Due:</td>
            <td style="padding: 8px; text-align: right; font-weight: bold; font-size: 1.1em; color: #dc2626;">$${invoice.total_amount.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      ${invoice.notes ? `
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Note:</strong> ${invoice.notes}</p>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${config.public.marketingSiteUrl}/parent/billing"
           style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          View Invoice & Pay Now
        </a>
      </div>

      <p style="color: #6b7280; font-size: 0.9em;">
        If you have any questions about this invoice, please contact us.
      </p>

      <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; color: #6b7280; font-size: 0.85em;">
        <p>This is an automated message from your dance studio billing system.</p>
      </div>
    </body>
    </html>
  `

  return emailService.sendEmail({
    to: parentEmail,
    subject,
    html,
  })
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(data: PaymentReceiptData) {
  const emailService = getEmailService()
  const { payment, invoice, parentEmail, parentName } = data

  const subject = `Payment Receipt - ${payment.confirmation_number}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #10b981; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">✓ Payment Received</h1>
      </div>

      <p>Dear ${parentName},</p>

      <p>Thank you! We have successfully received your payment.</p>

      <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0;">Payment Details</h3>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Confirmation Number:</td>
            <td style="padding: 8px; text-align: right;">${payment.confirmation_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Payment Date:</td>
            <td style="padding: 8px; text-align: right;">${new Date(payment.payment_date).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Amount Paid:</td>
            <td style="padding: 8px; text-align: right; color: #10b981; font-weight: bold; font-size: 1.2em;">$${payment.amount.toFixed(2)}</td>
          </tr>
          ${invoice ? `
          <tr>
            <td style="padding: 8px; font-weight: bold;">Invoice Number:</td>
            <td style="padding: 8px; text-align: right;">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Remaining Balance:</td>
            <td style="padding: 8px; text-align: right;">${invoice.amount_due <= 0 ? 'PAID IN FULL' : `$${invoice.amount_due.toFixed(2)}`}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p style="color: #6b7280; font-size: 0.9em;">
        Please keep this confirmation number for your records. If you have any questions, please contact us.
      </p>

      <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; color: #6b7280; font-size: 0.85em;">
        <p>Thank you for your business!</p>
      </div>
    </body>
    </html>
  `

  return emailService.sendEmail({
    to: parentEmail,
    subject,
    html,
  })
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminderEmail(data: ReminderEmailData) {
  const emailService = getEmailService()
  const config = useRuntimeConfig()
  const { invoice, parentEmail, parentName, reminderType, daysOverdue } = data

  let subject = ''
  let urgencyColor = '#f59e0b'
  let message = ''

  switch (reminderType) {
    case 'upcoming':
      subject = `Upcoming Payment Due - Invoice ${invoice.invoice_number}`
      urgencyColor = '#3b82f6'
      message = 'Your payment is due soon. Please submit payment by the due date to avoid late fees.'
      break
    case 'due':
      subject = `Payment Due Today - Invoice ${invoice.invoice_number}`
      urgencyColor = '#f59e0b'
      message = 'Your payment is due today. Please submit payment as soon as possible.'
      break
    case 'overdue_3':
    case 'overdue_7':
    case 'overdue_14':
      subject = `Overdue Payment Reminder - Invoice ${invoice.invoice_number}`
      urgencyColor = '#dc2626'
      message = `Your payment is ${daysOverdue} days overdue. Please submit payment immediately to avoid additional late fees.`
      break
    case 'final_notice':
      subject = `FINAL NOTICE - Overdue Payment ${invoice.invoice_number}`
      urgencyColor = '#dc2626'
      message = 'This is a final notice regarding your overdue payment. Please contact us immediately to resolve this matter.'
      break
    default:
      subject = `Payment Reminder - Invoice ${invoice.invoice_number}`
      message = 'This is a friendly reminder about your outstanding invoice.'
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: ${urgencyColor}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0;">Payment Reminder</h1>
      </div>

      <p>Dear ${parentName},</p>

      <p>${message}</p>

      <div style="background-color: #fff; border: 2px solid ${urgencyColor}; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Invoice Number:</td>
            <td style="padding: 8px; text-align: right;">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Due Date:</td>
            <td style="padding: 8px; text-align: right; color: ${urgencyColor}; font-weight: bold;">${new Date(invoice.due_date).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Amount Due:</td>
            <td style="padding: 8px; text-align: right; color: ${urgencyColor}; font-weight: bold; font-size: 1.3em;">$${invoice.amount_due.toFixed(2)}</td>
          </tr>
          ${invoice.late_fee_applied > 0 ? `
          <tr>
            <td style="padding: 8px; font-weight: bold;">Late Fees:</td>
            <td style="padding: 8px; text-align: right; color: #dc2626;">$${invoice.late_fee_applied.toFixed(2)}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${config.public.marketingSiteUrl}/parent/billing"
           style="background-color: ${urgencyColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Pay Now
        </a>
      </div>

      <p style="color: #6b7280; font-size: 0.9em;">
        If you have already made this payment, please disregard this message. If you have questions or need to set up a payment plan, please contact us.
      </p>

      <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; color: #6b7280; font-size: 0.85em;">
        <p>This is an automated reminder from your dance studio billing system.</p>
      </div>
    </body>
    </html>
  `

  return emailService.sendEmail({
    to: parentEmail,
    subject,
    html,
  })
}
