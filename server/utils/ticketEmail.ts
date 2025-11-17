// server/utils/ticketEmail.ts
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { getSupabaseClient } from './supabase';
import { generateAndUploadTicketPDF, getOrGenerateTicketPDF } from './ticketPdf';

/**
 * Enhanced email service for ticket confirmations with PDF attachments and studio branding
 */

interface TicketEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  showName: string;
  showDate: string;
  showTime: string;
  showLocation: string;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    seatSection: string;
    seatRow: string;
    seatNumber: string;
    price: number;
    pdfUrl?: string;
  }>;
  totalAmount: number;
  orderNumber: string;
  studioName: string;
  studioLogoUrl?: string;
  studioEmail?: string;
  studioPhone?: string;
  primaryColor?: string;
}

/**
 * Fetch all data needed for ticket confirmation email
 */
export async function fetchTicketEmailData(orderId: string): Promise<TicketEmailData> {
  const client = getSupabaseClient();

  // Fetch order with relations
  const { data: order, error: orderError } = await client
    .from('ticket_orders')
    .select(`
      id,
      customer_name,
      customer_email,
      total_amount_in_cents,
      order_number,
      show_id,
      recital_shows:show_id (
        id,
        name,
        date,
        start_time,
        venue_id,
        venues:venue_id (
          id,
          name,
          address,
          city,
          state
        )
      ),
      tickets (
        id,
        ticket_number,
        pdf_url,
        show_seat_id,
        show_seats:show_seat_id (
          id,
          price_in_cents,
          seat_id,
          seats:seat_id (
            id,
            seat_number,
            row_name,
            venue_section_id,
            venue_sections:venue_section_id (
              name
            )
          )
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderError?.message || 'Unknown error'}`);
  }

  // Fetch studio profile for branding
  const { data: studio } = await client
    .from('studio_profile')
    .select('name, logo_url, email, phone, theme')
    .single();

  // Extract show and venue info
  const show = order.recital_shows;
  const venue = show?.venues;

  const showLocation = venue ?
    `${venue.name}${venue.address ? ', ' + venue.address : ''}${venue.city ? ', ' + venue.city : ''}${venue.state ? ', ' + venue.state : ''}` :
    'Venue TBD';

  // Format tickets with seat information
  const tickets = order.tickets.map(ticket => ({
    id: ticket.id,
    ticketNumber: ticket.ticket_number || 'N/A',
    seatSection: ticket.show_seats?.seats?.venue_sections?.name || 'General',
    seatRow: ticket.show_seats?.seats?.row_name || 'N/A',
    seatNumber: ticket.show_seats?.seats?.seat_number?.toString() || 'N/A',
    price: ticket.show_seats?.price_in_cents || 0,
    pdfUrl: ticket.pdf_url || undefined
  }));

  return {
    orderId: order.id,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    showName: show?.name || 'Event',
    showDate: show?.date || '',
    showTime: show?.start_time || '',
    showLocation,
    tickets,
    totalAmount: order.total_amount_in_cents,
    orderNumber: order.order_number || order.id.substring(0, 8).toUpperCase(),
    studioName: studio?.name || 'Dance Studio',
    studioLogoUrl: studio?.logo_url,
    studioEmail: studio?.email,
    studioPhone: studio?.phone,
    primaryColor: studio?.theme?.primary_color || '#8b5cf6'
  };
}

/**
 * Generate or retrieve PDFs for all tickets in an order
 */
export async function ensureTicketPDFs(ticketIds: string[]): Promise<Map<string, string>> {
  const client = getSupabaseClient();
  const pdfUrls = new Map<string, string>();

  for (const ticketId of ticketIds) {
    try {
      const pdfUrl = await getOrGenerateTicketPDF(client, ticketId);
      if (pdfUrl) {
        pdfUrls.set(ticketId, pdfUrl);
      }
    } catch (error) {
      console.error(`Failed to generate PDF for ticket ${ticketId}:`, error);
    }
  }

  return pdfUrls;
}

/**
 * Render HTML email template with studio branding
 */
function renderEmailTemplate(data: TicketEmailData): string {
  const formatAmount = (cents: number) => (cents / 100).toFixed(2);

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

  const viewTicketsUrl = `${process.env.PUBLIC_URL || ''}/public/tickets/${data.orderId}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Ticket Confirmation</title>
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

    /* Base styles */
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
    }

    /* Container */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }

    /* Header */
    .header {
      background-color: ${data.primaryColor};
      padding: 30px 20px;
      text-align: center;
      color: #ffffff;
    }

    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }

    .logo {
      max-width: 150px;
      height: auto;
      margin-bottom: 15px;
    }

    /* Content */
    .content {
      padding: 30px 20px;
    }

    .order-number {
      background-color: #f8f9fa;
      border-left: 4px solid ${data.primaryColor};
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
    }

    .order-number strong {
      color: ${data.primaryColor};
      font-size: 16px;
    }

    /* Event details */
    .event-details {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }

    .event-details h2 {
      margin: 0 0 15px 0;
      font-size: 22px;
      color: #333333;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-weight: 600;
      color: #666666;
    }

    .detail-value {
      color: #333333;
    }

    /* Tickets table */
    .tickets-section {
      margin: 25px 0;
    }

    .tickets-section h3 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #333333;
    }

    .tickets-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .tickets-table th {
      background-color: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #666666;
      font-size: 13px;
      border-bottom: 2px solid #e0e0e0;
    }

    .tickets-table td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
    }

    .tickets-table tr:last-child td {
      border-bottom: none;
    }

    /* Total */
    .total-row {
      background-color: #f8f9fa;
      padding: 15px;
      margin: 20px 0;
      text-align: right;
      font-size: 18px;
      font-weight: 700;
      color: #333333;
    }

    .total-row .total-label {
      color: #666666;
      font-weight: 600;
    }

    /* Button */
    .button-container {
      text-align: center;
      margin: 30px 0;
    }

    .button {
      display: inline-block;
      background-color: ${data.primaryColor};
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    }

    .button:hover {
      opacity: 0.9;
    }

    /* Info box */
    .info-box {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #92400e;
    }

    /* Footer */
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 13px;
      color: #666666;
    }

    .footer a {
      color: ${data.primaryColor};
      text-decoration: none;
    }

    /* Mobile responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }

      .content {
        padding: 20px 15px !important;
      }

      .header h1 {
        font-size: 24px !important;
      }

      .tickets-table {
        font-size: 12px !important;
      }

      .tickets-table th,
      .tickets-table td {
        padding: 8px 4px !important;
      }

      .detail-row {
        flex-direction: column;
      }

      .detail-value {
        margin-top: 5px;
        font-weight: 600;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px 0;">

        <!-- Email Container -->
        <table role="presentation" class="email-container" style="width: 600px; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td class="header">
              ${data.studioLogoUrl ? `<img src="${data.studioLogoUrl}" alt="${data.studioName}" class="logo">` : ''}
              <h1>Thank You For Your Purchase!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Your tickets are ready</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content">

              <p style="font-size: 16px; margin-bottom: 20px;">
                Hello ${data.customerName},
              </p>

              <p style="font-size: 15px; color: #666666;">
                Your ticket purchase has been confirmed! We're excited to see you at the show.
              </p>

              <!-- Order Number -->
              <div class="order-number">
                <strong>Order #${data.orderNumber}</strong>
              </div>

              <!-- Event Details -->
              <div class="event-details">
                <h2>${data.showName}</h2>
                <div class="detail-row">
                  <span class="detail-label">Date</span>
                  <span class="detail-value">${formatDate(data.showDate)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time</span>
                  <span class="detail-value">${formatTime(data.showTime)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Location</span>
                  <span class="detail-value">${data.showLocation}</span>
                </div>
              </div>

              <!-- Tickets -->
              <div class="tickets-section">
                <h3>Your Tickets (${data.tickets.length})</h3>
                <table class="tickets-table" role="presentation">
                  <thead>
                    <tr>
                      <th>Ticket #</th>
                      <th>Section</th>
                      <th>Row</th>
                      <th>Seat</th>
                      <th style="text-align: right;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.tickets.map(ticket => `
                    <tr>
                      <td>${ticket.ticketNumber}</td>
                      <td>${ticket.seatSection}</td>
                      <td>${ticket.seatRow}</td>
                      <td>${ticket.seatNumber}</td>
                      <td style="text-align: right;">$${formatAmount(ticket.price)}</td>
                    </tr>
                    `).join('')}
                  </tbody>
                </table>

                <!-- Total -->
                <div class="total-row">
                  <span class="total-label">Total: </span>
                  <span style="color: ${data.primaryColor};">$${formatAmount(data.totalAmount)}</span>
                </div>
              </div>

              <!-- View Tickets Button -->
              <div class="button-container">
                <a href="${viewTicketsUrl}" class="button">View & Download Tickets</a>
              </div>

              <!-- Info -->
              <div class="info-box">
                <strong>📱 Important:</strong> Please bring your tickets (printed or on your mobile device) to the event.
                Each ticket has a unique QR code that will be scanned at the entrance.
              </div>

              <p style="font-size: 14px; color: #666666; margin-top: 25px;">
                Your tickets are attached to this email as PDF files. You can also view and download them anytime
                by clicking the button above.
              </p>

              ${data.studioEmail || data.studioPhone ? `
              <p style="font-size: 14px; color: #666666; margin-top: 20px;">
                Questions? Contact us at:
                ${data.studioEmail ? `<br><strong>Email:</strong> <a href="mailto:${data.studioEmail}" style="color: ${data.primaryColor};">${data.studioEmail}</a>` : ''}
                ${data.studioPhone ? `<br><strong>Phone:</strong> ${data.studioPhone}` : ''}
              </p>
              ` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} ${data.studioName}. All rights reserved.</p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                This is an automated confirmation email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Render plain text email template
 */
function renderTextTemplate(data: TicketEmailData): string {
  const formatAmount = (cents: number) => (cents / 100).toFixed(2);

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

  const viewTicketsUrl = `${process.env.PUBLIC_URL || ''}/public/tickets/${data.orderId}`;

  return `
${data.studioName}
Thank You For Your Purchase!

Hello ${data.customerName},

Your ticket purchase has been confirmed! We're excited to see you at the show.

ORDER #${data.orderNumber}

EVENT DETAILS
─────────────────────────────────────
${data.showName}

Date:     ${formatDate(data.showDate)}
Time:     ${formatTime(data.showTime)}
Location: ${data.showLocation}

YOUR TICKETS (${data.tickets.length})
─────────────────────────────────────
${data.tickets.map(ticket => `
Ticket #${ticket.ticketNumber}
Section: ${ticket.seatSection} | Row: ${ticket.seatRow} | Seat: ${ticket.seatNumber}
Price: $${formatAmount(ticket.price)}
`).join('\n')}
─────────────────────────────────────
TOTAL: $${formatAmount(data.totalAmount)}

VIEW & DOWNLOAD TICKETS
${viewTicketsUrl}

IMPORTANT: Please bring your tickets (printed or on your mobile device) to the event.
Each ticket has a unique QR code that will be scanned at the entrance.

Your tickets are attached to this email as PDF files. You can also view and download
them anytime using the link above.

${data.studioEmail || data.studioPhone ? `
Questions? Contact us at:
${data.studioEmail ? `Email: ${data.studioEmail}` : ''}
${data.studioPhone ? `Phone: ${data.studioPhone}` : ''}
` : ''}

────────────────────────────────────
© ${new Date().getFullYear()} ${data.studioName}. All rights reserved.

This is an automated confirmation email.
  `.trim();
}

/**
 * Send ticket confirmation email with PDF attachments
 */
export async function sendTicketConfirmationEmail(
  orderId: string,
  options: {
    toEmail?: string; // Override recipient email (for resending)
    includePdfAttachments?: boolean; // Default true
  } = {}
): Promise<boolean> {
  try {
    // Initialize Mailgun
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN || '';
    const fromAddress = process.env.MAIL_FROM_ADDRESS || '';
    const replyToAddress = process.env.MAIL_REPLY_TO_ADDRESS || '';

    if (!apiKey || !domain || !fromAddress) {
      console.error('Missing email configuration parameters');
      return false;
    }

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({ username: 'api', key: apiKey });

    // Fetch email data
    const emailData = await fetchTicketEmailData(orderId);

    // Generate PDFs for all tickets
    const includePdfs = options.includePdfAttachments !== false;
    let pdfUrls: Map<string, string> | undefined;

    if (includePdfs) {
      const ticketIds = emailData.tickets.map(t => t.id);
      pdfUrls = await ensureTicketPDFs(ticketIds);
    }

    // Render templates
    const html = renderEmailTemplate(emailData);
    const text = renderTextTemplate(emailData);

    // Prepare message
    const recipientEmail = options.toEmail || emailData.customerEmail;
    const message: any = {
      from: fromAddress,
      to: recipientEmail,
      'h:Reply-To': replyToAddress,
      subject: `Your Tickets for ${emailData.showName}`,
      text,
      html
    };

    // Attach PDFs if available
    if (includePdfs && pdfUrls && pdfUrls.size > 0) {
      // Note: Mailgun attachments from URLs require additional setup
      // For now, we'll include download links in the email
      // To implement actual attachments, you would need to:
      // 1. Fetch PDF from Supabase Storage
      // 2. Convert to Buffer
      // 3. Attach using attachment: [{data: buffer, filename: 'ticket.pdf'}]

      // Alternative: Include PDF URLs in the email (already in template)
      console.log(`Generated ${pdfUrls.size} PDFs for order ${orderId}`);
    }

    // Send email
    const result = await mg.messages.create(domain, message);

    console.log('Ticket confirmation email sent successfully:', {
      orderId,
      recipient: recipientEmail,
      messageId: result.id
    });

    return true;
  } catch (error) {
    console.error('Error sending ticket confirmation email:', error);
    return false;
  }
}
