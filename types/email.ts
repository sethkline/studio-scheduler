// types/email.ts

/**
 * Email template stored in database
 */
export interface EmailTemplate {
  id: string
  name: string
  slug: string
  category: EmailCategory
  subject: string
  description?: string
  mjml_content?: string
  html_content: string
  text_content: string
  template_variables: string[]
  use_studio_branding: boolean
  is_active: boolean
  is_default: boolean
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
}

/**
 * Email categories for organization
 */
export type EmailCategory =
  | 'enrollment'
  | 'payment'
  | 'recital'
  | 'announcement'
  | 'reminder'
  | 'system'

/**
 * Email log entry tracking sent emails
 */
export interface EmailLog {
  id: string
  template_id?: string
  template_slug?: string
  recipient_email: string
  recipient_name?: string
  recipient_type?: RecipientType
  recipient_id?: string
  subject: string
  html_content: string
  text_content: string
  sent_from: string
  reply_to?: string
  cc?: string
  bcc?: string
  mailgun_message_id?: string
  mailgun_domain?: string
  status: EmailStatus
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  failed_at?: string
  error_message?: string
  open_count: number
  click_count: number
  metadata: Record<string, any>
  sent_by?: string
  created_at: string
  updated_at: string
}

/**
 * Email status states
 */
export type EmailStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'complained'

/**
 * Recipient type
 */
export type RecipientType = 'parent' | 'teacher' | 'student' | 'admin' | 'staff'

/**
 * Queued email waiting to be sent
 */
export interface EmailQueue {
  id: string
  template_id: string
  recipient_email: string
  recipient_name?: string
  recipient_type?: RecipientType
  recipient_id?: string
  template_data: Record<string, any>
  scheduled_for: string
  priority: number
  status: QueueStatus
  attempts: number
  max_attempts: number
  last_attempt_at?: string
  error_message?: string
  email_log_id?: string
  batch_id?: string
  batch_name?: string
  metadata: Record<string, any>
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * Queue status states
 */
export type QueueStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'

/**
 * Email preferences and unsubscribe management
 */
export interface EmailPreferences {
  id: string
  user_id?: string
  email: string
  unsubscribe_token: string
  email_enabled: boolean
  unsubscribed_at?: string
  enrollment_emails: boolean
  payment_emails: boolean
  recital_emails: boolean
  announcement_emails: boolean
  reminder_emails: boolean
  marketing_emails: boolean
  created_at: string
  updated_at: string
}

/**
 * Email batch campaign
 */
export interface EmailBatch {
  id: string
  name: string
  description?: string
  template_id?: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  failed_count: number
  opened_count: number
  clicked_count: number
  status: BatchStatus
  scheduled_for?: string
  started_at?: string
  completed_at?: string
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * Batch status states
 */
export type BatchStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled'

/**
 * Request to send an email
 */
export interface SendEmailRequest {
  templateSlug?: string
  templateId?: string
  recipientEmail: string
  recipientName?: string
  recipientType?: RecipientType
  recipientId?: string
  templateData?: Record<string, any>
  subject?: string // Override template subject
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  metadata?: Record<string, any>
  scheduledFor?: string // ISO date string for scheduled sending
}

/**
 * Request to send batch emails
 */
export interface SendBatchEmailRequest {
  batchName: string
  description?: string
  templateId: string
  recipients: {
    email: string
    name?: string
    type?: RecipientType
    id?: string
    templateData?: Record<string, any>
  }[]
  scheduledFor?: string
  priority?: number
}

/**
 * Email template data for rendering
 */
export interface EmailTemplateData {
  // Common variables available in all templates
  studio_name?: string
  studio_logo_url?: string
  studio_email?: string
  studio_phone?: string
  studio_website?: string
  parent_name?: string
  student_name?: string
  unsubscribe_url?: string

  // Custom variables
  [key: string]: any
}

/**
 * Email analytics summary
 */
export interface EmailAnalytics {
  total_sent: number
  total_delivered: number
  total_failed: number
  total_opened: number
  total_clicked: number
  delivery_rate: number
  open_rate: number
  click_rate: number
  bounce_rate: number
  complaint_rate: number
}

/**
 * Email preview
 */
export interface EmailPreview {
  subject: string
  html: string
  text: string
  templateVariables: string[]
}

/**
 * Mailgun webhook event
 */
export interface MailgunWebhookEvent {
  signature: {
    timestamp: string
    token: string
    signature: string
  }
  'event-data': {
    event: 'delivered' | 'opened' | 'clicked' | 'failed' | 'bounced' | 'complained'
    timestamp: number
    id: string
    message: {
      headers: {
        'message-id': string
      }
    }
    recipient: string
    'delivery-status'?: {
      message?: string
      code?: number
    }
    'client-info'?: {
      'user-agent'?: string
    }
    url?: string
  }
}

/**
 * Form data for creating/editing email template
 */
export interface EmailTemplateForm {
  name: string
  slug: string
  category: EmailCategory
  subject: string
  description?: string
  mjml_content?: string
  html_content: string
  text_content: string
  template_variables: string[]
  use_studio_branding: boolean
  is_active: boolean
}

/**
 * Email statistics by category
 */
export interface EmailStatsByCategory {
  category: EmailCategory
  total_sent: number
  delivered: number
  opened: number
  clicked: number
  failed: number
  open_rate: number
  click_rate: number
}
