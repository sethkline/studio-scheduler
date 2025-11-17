// server/utils/email.ts
import formData from 'form-data';
import Mailgun from 'mailgun.js';



// Email template types
export interface EmailTemplateData {
  [key: string]: any;
}

// Email service singleton
class EmailService {
  private static instance: EmailService;
  private mailgun: any;
  private isInitialized: boolean = false;
  private domain: string;
  private fromAddress: string;
  private replyToAddress: string;

  private constructor() {
    // Initialize in setup() to avoid issues with env variables
    this.domain = '';
    this.fromAddress = '';
    this.replyToAddress = '';
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    
    return EmailService.instance;
  }

  public setup(): boolean {
    if (this.isInitialized) {
      return true;
    }

    const apiKey = process.env.MAILGUN_API_KEY;
    this.domain = process.env.MAILGUN_DOMAIN || '';
    this.fromAddress = process.env.MAIL_FROM_ADDRESS || '';
    this.replyToAddress = process.env.MAIL_REPLY_TO_ADDRESS || '';

    if (!apiKey || !this.domain || !this.fromAddress) {
      console.error('Missing email configuration parameters');
      return false;
    }

    const mailgun = new Mailgun(formData);
    this.mailgun = mailgun.client({ username: 'api', key: apiKey });
    this.isInitialized = true;
    return true;
  }

  public async sendTicketConfirmation(
    email: string,
    customerName: string,
    orderId: string,
    ticketCount: number,
    showName: string,
    showDate: string,
    showTime: string,
    showLocation: string,
    totalAmount: number
  ): Promise<boolean> {
    if (!this.setup()) {
      console.error('Email service not properly configured');
      return false;
    }

    try {
      const formatAmount = (amount: number): string => {
        return (amount / 100).toFixed(2);
      };

      const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };

      const formatTime = (timeString: string): string => {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours));
        date.setMinutes(parseInt(minutes));
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      };

      // Create ticket access URL
      const viewTicketsUrl = `${process.env.PUBLIC_URL || ''}/public/tickets?orderId=${orderId}&email=${encodeURIComponent(email)}`;

      const ticketText = ticketCount === 1 ? 'ticket' : 'tickets';
      const message = {
        from: this.fromAddress,
        to: email,
        'h:Reply-To': this.replyToAddress,
        subject: `Your Tickets for ${showName}`,
        text: `
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
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Ticket Confirmation</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #8b5cf6;
      margin-bottom: 10px;
    }
    .ticket-info {
      background-color: #f8f9fa;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .order-details {
      border-top: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
      padding: 15px 0;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .btn {
      display: inline-block;
      background-color: #8b5cf6;
      color: white;
      text-decoration: none;
      padding: 12px 25px;
      border-radius: 4px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      font-size: 0.8em;
      text-align: center;
      margin-top: 40px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Thank You For Your Purchase!</h1>
    <p>Your tickets are ready to view and print.</p>
  </div>

  <div class="ticket-info">
    <h2>Order #${orderId.substring(0, 8).toUpperCase()}</h2>
    <p>Hello ${customerName},</p>
    <p>Your purchase has been confirmed. Here are your order details:</p>

    <div class="order-details">
      <div class="detail-row">
        <strong>Event:</strong>
        <span>${showName}</span>
      </div>
      <div class="detail-row">
        <strong>Date:</strong>
        <span>${formatDate(showDate)}</span>
      </div>
      <div class="detail-row">
        <strong>Time:</strong>
        <span>${formatTime(showTime)}</span>
      </div>
      <div class="detail-row">
        <strong>Location:</strong>
        <span>${showLocation}</span>
      </div>
      <div class="detail-row">
        <strong>Tickets:</strong>
        <span>${ticketCount} ${ticketText}</span>
      </div>
      <div class="detail-row">
        <strong>Total Amount:</strong>
        <span>$${formatAmount(totalAmount)}</span>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${viewTicketsUrl}" class="btn">View My Tickets</a>
    </div>

    <p>You can view and print your tickets by clicking the button above or visiting <a href="${viewTicketsUrl}">${viewTicketsUrl}</a></p>
  </div>

  <p>If you have any questions about your order, please contact us by replying to this email.</p>

  <div class="footer">
    <p>This is an automated message. Please do not reply directly to this email.</p>
  </div>
</body>
</html>
        `
      };

      const result = await this.mailgun.messages.create(this.domain, message);

      console.log('Email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Generic method to send email with custom subject and HTML
   */
  public async sendEmail(options: { to: string; subject: string; html: string; text?: string }): Promise<boolean> {
    if (!this.setup()) {
      console.error('Email service not properly configured');
      return false;
    }

    try {
      const message = {
        from: this.fromAddress,
        to: options.to,
        'h:Reply-To': this.replyToAddress,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text fallback
      };

      const result = await this.mailgun.messages.create(this.domain, message);

      console.log('Email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();

/**
 * Get the email service singleton instance
 */
export function getEmailService(): EmailService {
  return EmailService.getInstance();
}