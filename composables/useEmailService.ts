// composables/useEmailService.ts
import type {
  EmailTemplate,
  EmailLog,
  EmailQueue,
  EmailPreferences,
  EmailBatch,
  SendEmailRequest,
  SendBatchEmailRequest,
  EmailTemplateForm,
  EmailPreview,
  EmailTemplateData,
} from '~/types/email'

/**
 * Composable for email operations
 */
export function useEmailService() {
  const config = useRuntimeConfig()

  // ============================================================================
  // Email Templates
  // ============================================================================

  /**
   * Fetch all email templates
   */
  const fetchTemplates = async (filters?: {
    category?: string
    is_active?: boolean
    is_default?: boolean
    limit?: number
    offset?: number
  }) => {
    return await $fetch('/api/email/templates', {
      method: 'GET',
      params: filters,
    })
  }

  /**
   * Fetch a single email template
   */
  const fetchTemplate = async (id: string) => {
    return await $fetch(`/api/email/templates/${id}`, {
      method: 'GET',
    })
  }

  /**
   * Create a new email template
   */
  const createTemplate = async (template: EmailTemplateForm) => {
    return await $fetch('/api/email/templates', {
      method: 'POST',
      body: template,
    })
  }

  /**
   * Update an email template
   */
  const updateTemplate = async (id: string, template: Partial<EmailTemplateForm>) => {
    return await $fetch(`/api/email/templates/${id}`, {
      method: 'PUT',
      body: template,
    })
  }

  /**
   * Delete an email template
   */
  const deleteTemplate = async (id: string, hardDelete = false) => {
    return await $fetch(`/api/email/templates/${id}`, {
      method: 'DELETE',
      params: { hard: hardDelete },
    })
  }

  /**
   * Preview an email template
   */
  const previewTemplate = async (templateId: string, templateData?: EmailTemplateData): Promise<EmailPreview> => {
    const response = await $fetch('/api/email/templates/preview', {
      method: 'POST',
      body: {
        template_id: templateId,
        template_data: templateData,
      },
    })
    return response as EmailPreview
  }

  // ============================================================================
  // Email Sending
  // ============================================================================

  /**
   * Send a single email
   */
  const sendEmail = async (request: SendEmailRequest) => {
    return await $fetch('/api/email/send', {
      method: 'POST',
      body: request,
    })
  }

  /**
   * Send batch emails
   */
  const sendBatchEmails = async (request: SendBatchEmailRequest) => {
    return await $fetch('/api/email/send-batch', {
      method: 'POST',
      body: request,
    })
  }

  // ============================================================================
  // Email Logs
  // ============================================================================

  /**
   * Fetch email logs
   */
  const fetchLogs = async (filters?: {
    status?: string
    recipient_email?: string
    recipient_type?: string
    template_id?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }) => {
    return await $fetch('/api/email/logs', {
      method: 'GET',
      params: filters,
    })
  }

  // ============================================================================
  // Email Queue
  // ============================================================================

  /**
   * Fetch email queue
   */
  const fetchQueue = async (filters?: {
    status?: string
    batch_id?: string
    scheduled_before?: string
    scheduled_after?: string
    limit?: number
    offset?: number
  }) => {
    return await $fetch('/api/email/queue', {
      method: 'GET',
      params: filters,
    })
  }

  // ============================================================================
  // Email Preferences
  // ============================================================================

  /**
   * Fetch email preferences
   */
  const fetchPreferences = async (token?: string) => {
    return await $fetch('/api/email/preferences', {
      method: 'GET',
      params: token ? { token } : undefined,
    })
  }

  /**
   * Update email preferences
   */
  const updatePreferences = async (
    preferences: Partial<EmailPreferences>,
    token?: string
  ) => {
    return await $fetch('/api/email/preferences', {
      method: 'PUT',
      body: preferences,
      params: token ? { token } : undefined,
    })
  }

  /**
   * Unsubscribe from all emails
   */
  const unsubscribe = async (token: string) => {
    return await $fetch('/api/email/unsubscribe', {
      method: 'POST',
      body: { token },
    })
  }

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Get email category label
   */
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      enrollment: 'Enrollment',
      payment: 'Payment',
      recital: 'Recital',
      announcement: 'Announcement',
      reminder: 'Reminder',
      system: 'System',
    }
    return labels[category] || category
  }

  /**
   * Get email status label and color
   */
  const getStatusInfo = (status: string): { label: string; severity: string } => {
    const info: Record<string, { label: string; severity: string }> = {
      queued: { label: 'Queued', severity: 'info' },
      sending: { label: 'Sending', severity: 'info' },
      sent: { label: 'Sent', severity: 'success' },
      delivered: { label: 'Delivered', severity: 'success' },
      failed: { label: 'Failed', severity: 'danger' },
      bounced: { label: 'Bounced', severity: 'danger' },
      complained: { label: 'Spam Complaint', severity: 'danger' },
      pending: { label: 'Pending', severity: 'warning' },
      processing: { label: 'Processing', severity: 'info' },
      cancelled: { label: 'Cancelled', severity: 'secondary' },
      completed: { label: 'Completed', severity: 'success' },
    }
    return info[status] || { label: status, severity: 'secondary' }
  }

  /**
   * Format email analytics
   */
  const formatAnalytics = (logs: EmailLog[]) => {
    const total = logs.length
    const delivered = logs.filter((l) => ['delivered', 'opened'].includes(l.status)).length
    const failed = logs.filter((l) => ['failed', 'bounced'].includes(l.status)).length
    const opened = logs.filter((l) => l.open_count > 0).length
    const clicked = logs.filter((l) => l.click_count > 0).length

    return {
      total,
      delivered,
      failed,
      opened,
      clicked,
      delivery_rate: total > 0 ? (delivered / total) * 100 : 0,
      open_rate: delivered > 0 ? (opened / delivered) * 100 : 0,
      click_rate: opened > 0 ? (clicked / opened) * 100 : 0,
    }
  }

  return {
    // Templates
    fetchTemplates,
    fetchTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    previewTemplate,

    // Sending
    sendEmail,
    sendBatchEmails,

    // Logs
    fetchLogs,

    // Queue
    fetchQueue,

    // Preferences
    fetchPreferences,
    updatePreferences,
    unsubscribe,

    // Helpers
    getCategoryLabel,
    getStatusInfo,
    formatAnalytics,
  }
}
