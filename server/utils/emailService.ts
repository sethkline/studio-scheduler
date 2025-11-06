// server/utils/emailService.ts
import formData from 'form-data'
import Mailgun from 'mailgun.js'
import mjml2html from 'mjml'
import type {
  EmailTemplate,
  EmailTemplateData,
  SendEmailRequest,
  EmailLog,
  EmailPreferences,
} from '~/types/email'

/**
 * Enhanced Email Service
 * Supports template-based emails, MJML compilation, tracking, and batch sending
 */
class EnhancedEmailService {
  private static instance: EnhancedEmailService
  private mailgun: any
  private isInitialized: boolean = false
  private domain: string
  private fromAddress: string
  private replyToAddress: string
  private baseUrl: string

  private constructor() {
    this.domain = ''
    this.fromAddress = ''
    this.replyToAddress = ''
    this.baseUrl = ''
  }

  public static getInstance(): EnhancedEmailService {
    if (!EnhancedEmailService.instance) {
      EnhancedEmailService.instance = new EnhancedEmailService()
    }
    return EnhancedEmailService.instance
  }

  /**
   * Initialize the email service with environment variables
   */
  public setup(): boolean {
    if (this.isInitialized) {
      return true
    }

    const apiKey = process.env.MAILGUN_API_KEY
    this.domain = process.env.MAILGUN_DOMAIN || ''
    this.fromAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@example.com'
    this.replyToAddress = process.env.MAIL_REPLY_TO_ADDRESS || this.fromAddress
    this.baseUrl = process.env.MARKETING_SITE_URL || 'http://localhost:3000'

    if (!apiKey || !this.domain) {
      console.error('Missing email configuration: MAILGUN_API_KEY or MAILGUN_DOMAIN')
      return false
    }

    const mailgun = new Mailgun(formData)
    this.mailgun = mailgun.client({ username: 'api', key: apiKey })
    this.isInitialized = true
    return true
  }

  /**
   * Compile MJML to HTML
   */
  public compileMjml(mjmlContent: string): { html: string; errors: any[] } {
    try {
      const result = mjml2html(mjmlContent, {
        validationLevel: 'soft',
        minify: true,
      })
      return {
        html: result.html,
        errors: result.errors,
      }
    } catch (error) {
      console.error('MJML compilation error:', error)
      throw new Error('Failed to compile MJML template')
    }
  }

  /**
   * Replace template variables in content
   */
  public replaceVariables(content: string, data: EmailTemplateData): string {
    let result = content

    // Replace all {{variable}} patterns
    Object.keys(data).forEach((key) => {
      const value = data[key]
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      result = result.replace(regex, value != null ? String(value) : '')
    })

    return result
  }

  /**
   * Convert HTML to plain text (basic implementation)
   */
  public htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim()
  }

  /**
   * Add studio branding to email content
   */
  public async addStudioBranding(
    html: string,
    studioData: {
      name?: string
      logo_url?: string
      email?: string
      phone?: string
      website?: string
    }
  ): Promise<string> {
    // Simple wrapper with studio header/footer
    const brandedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ${
            studioData.logo_url || studioData.name
              ? `
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #8b5cf6;">
              ${
                studioData.logo_url
                  ? `<img src="${studioData.logo_url}" alt="${studioData.name || 'Studio'}" style="max-width: 200px; height: auto;" />`
                  : `<h1 style="color: #ffffff; margin: 0; font-size: 28px;">${studioData.name || 'Dance Studio'}</h1>`
              }
            </td>
          </tr>
          `
              : ''
          }
          <tr>
            <td style="padding: 40px 30px;">
              ${html}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666;">
              <p style="margin: 0 0 10px 0;">
                ${studioData.name || 'Dance Studio'}
                ${studioData.phone ? `• ${studioData.phone}` : ''}
                ${studioData.email ? `• ${studioData.email}` : ''}
              </p>
              ${
                studioData.website
                  ? `<p style="margin: 0 0 10px 0;"><a href="${studioData.website}" style="color: #8b5cf6; text-decoration: none;">${studioData.website}</a></p>`
                  : ''
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
    return brandedHtml
  }

  /**
   * Generate unsubscribe footer
   */
  public getUnsubscribeFooter(unsubscribeToken: string): string {
    const unsubscribeUrl = `${this.baseUrl}/unsubscribe?token=${unsubscribeToken}`
    return `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 11px; color: #999;">
        <p>Don't want to receive these emails? <a href="${unsubscribeUrl}" style="color: #8b5cf6; text-decoration: underline;">Unsubscribe</a></p>
      </div>
    `
  }

  /**
   * Send an email using Mailgun
   */
  public async sendEmail(params: {
    to: string
    subject: string
    html: string
    text: string
    replyTo?: string
    cc?: string[]
    bcc?: string[]
    tags?: string[]
    customVariables?: Record<string, string>
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.setup()) {
      return { success: false, error: 'Email service not configured' }
    }

    try {
      const message: any = {
        from: this.fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        'h:Reply-To': params.replyTo || this.replyToAddress,
      }

      if (params.cc && params.cc.length > 0) {
        message.cc = params.cc.join(',')
      }

      if (params.bcc && params.bcc.length > 0) {
        message.bcc = params.bcc.join(',')
      }

      // Add tags for tracking
      if (params.tags && params.tags.length > 0) {
        message['o:tag'] = params.tags
      }

      // Add custom variables for webhook tracking
      if (params.customVariables) {
        Object.keys(params.customVariables).forEach((key) => {
          message[`v:${key}`] = params.customVariables![key]
        })
      }

      // Enable tracking
      message['o:tracking'] = 'yes'
      message['o:tracking-clicks'] = 'yes'
      message['o:tracking-opens'] = 'yes'

      const result = await this.mailgun.messages.create(this.domain, message)

      return {
        success: true,
        messageId: result.id,
      }
    } catch (error: any) {
      console.error('Error sending email:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email',
      }
    }
  }

  /**
   * Send a template-based email
   */
  public async sendTemplateEmail(
    template: EmailTemplate,
    recipientEmail: string,
    recipientName: string,
    templateData: EmailTemplateData,
    options?: {
      replyTo?: string
      cc?: string[]
      bcc?: string[]
      subjectOverride?: string
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Prepare template data with defaults
      const data: EmailTemplateData = {
        recipient_name: recipientName,
        ...templateData,
      }

      // Replace variables in subject
      const subject = options?.subjectOverride || this.replaceVariables(template.subject, data)

      // Replace variables in HTML
      let html = this.replaceVariables(template.html_content, data)

      // Replace variables in text
      let text = this.replaceVariables(template.text_content, data)

      // Add unsubscribe footer if token provided
      if (data.unsubscribe_token) {
        html += this.getUnsubscribeFooter(data.unsubscribe_token as string)
        text += `\n\nTo unsubscribe: ${this.baseUrl}/unsubscribe?token=${data.unsubscribe_token}`
      }

      // Send the email
      return await this.sendEmail({
        to: recipientEmail,
        subject,
        html,
        text,
        replyTo: options?.replyTo,
        cc: options?.cc,
        bcc: options?.bcc,
        tags: [template.category, template.slug],
        customVariables: {
          template_id: template.id,
          template_slug: template.slug,
        },
      })
    } catch (error: any) {
      console.error('Error sending template email:', error)
      return {
        success: false,
        error: error.message || 'Failed to send template email',
      }
    }
  }

  /**
   * Preview an email template with data
   */
  public previewTemplate(
    template: EmailTemplate,
    templateData: EmailTemplateData
  ): { subject: string; html: string; text: string } {
    const data: EmailTemplateData = {
      recipient_name: 'Preview User',
      ...templateData,
    }

    const subject = this.replaceVariables(template.subject, data)
    let html = this.replaceVariables(template.html_content, data)
    const text = this.replaceVariables(template.text_content, data)

    // Add sample unsubscribe footer
    html += this.getUnsubscribeFooter('preview-token-12345')

    return { subject, html, text }
  }

  /**
   * Verify webhook signature from Mailgun
   */
  public verifyWebhookSignature(timestamp: string, token: string, signature: string): boolean {
    const crypto = require('crypto')
    const apiKey = process.env.MAILGUN_API_KEY || ''

    const encodedToken = crypto.createHmac('sha256', apiKey).update(timestamp + token).digest('hex')

    return encodedToken === signature
  }
}

export const enhancedEmailService = EnhancedEmailService.getInstance()

// Export for backwards compatibility
export const emailService = {
  sendTicketConfirmation: async (
    email: string,
    customerName: string,
    orderId: string,
    ticketCount: number,
    showName: string,
    showDate: string,
    showTime: string,
    showLocation: string,
    totalAmount: number
  ): Promise<boolean> => {
    // This can be migrated to use templates later
    // For now, keep the existing implementation
    const service = enhancedEmailService
    if (!service.setup()) {
      return false
    }

    const formatAmount = (amount: number): string => {
      return (amount / 100).toFixed(2)
    }

    const formatDate = (dateString: string): string => {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    const formatTime = (timeString: string): string => {
      const [hours, minutes] = timeString.split(':')
      const date = new Date()
      date.setHours(parseInt(hours))
      date.setMinutes(parseInt(minutes))
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }

    const viewTicketsUrl = `${process.env.MARKETING_SITE_URL || ''}/public/tickets?orderId=${orderId}&email=${encodeURIComponent(email)}`
    const ticketText = ticketCount === 1 ? 'ticket' : 'tickets'

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Ticket Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #8b5cf6; margin-bottom: 10px;">Thank You For Your Purchase!</h1>
    <p>Your tickets are ready to view and print.</p>
  </div>

  <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
    <h2>Order #${orderId.substring(0, 8).toUpperCase()}</h2>
    <p>Hello ${customerName},</p>
    <p>Your purchase has been confirmed. Here are your order details:</p>

    <div style="border-top: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; padding: 15px 0; margin: 20px 0;">
      <table width="100%">
        <tr><td><strong>Event:</strong></td><td>${showName}</td></tr>
        <tr><td><strong>Date:</strong></td><td>${formatDate(showDate)}</td></tr>
        <tr><td><strong>Time:</strong></td><td>${formatTime(showTime)}</td></tr>
        <tr><td><strong>Location:</strong></td><td>${showLocation}</td></tr>
        <tr><td><strong>Tickets:</strong></td><td>${ticketCount} ${ticketText}</td></tr>
        <tr><td><strong>Total Amount:</strong></td><td>$${formatAmount(totalAmount)}</td></tr>
      </table>
    </div>

    <div style="text-align: center;">
      <a href="${viewTicketsUrl}" style="display: inline-block; background-color: #8b5cf6; color: white; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; margin: 20px 0;">View My Tickets</a>
    </div>

    <p>You can view and print your tickets by clicking the button above.</p>
  </div>

  <p>If you have any questions about your order, please contact us by replying to this email.</p>
</body>
</html>
    `

    const text = `
Thank you for your purchase, ${customerName}!

Your Order #${orderId.substring(0, 8).toUpperCase()}

Event: ${showName}
Date: ${formatDate(showDate)}
Time: ${formatTime(showTime)}
Location: ${showLocation}
Tickets: ${ticketCount} ${ticketText}
Total Amount: $${formatAmount(totalAmount)}

You can view and print your tickets at:
${viewTicketsUrl}

Thank you for your support!

If you have any questions, please reply to this email.
    `

    const result = await service.sendEmail({
      to: email,
      subject: `Your Tickets for ${showName}`,
      html,
      text,
      tags: ['ticket', 'confirmation'],
    })

    return result.success
  },
}
