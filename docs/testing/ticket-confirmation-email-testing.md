# Ticket Confirmation Email Testing Guide

## Overview

This guide explains how to test the end-to-end ticket purchase flow with email confirmation.

## Prerequisites

### 1. Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Stripe Payment Configuration (Test Mode)
STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key-here
STRIPE_SECRET_KEY=sk_test_your-secret-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here

# Mailgun Email Configuration
MAILGUN_API_KEY=your-mailgun-api-key-here
MAILGUN_DOMAIN=mg.yourdomain.com
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_REPLY_TO_ADDRESS=support@yourdomain.com

# Application Configuration
MARKETING_SITE_URL=http://localhost:3000
```

### 2. Install Stripe CLI (for local webhook testing)

```bash
# Install Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/

# Login to Stripe
stripe login
```

### 3. Set Up Mailgun Sandbox (for testing)

1. Sign up for Mailgun at https://signup.mailgun.com
2. Use the sandbox domain provided (e.g., `sandbox123.mailgun.org`)
3. Add authorized recipients for testing (Mailgun sandboxes can only send to authorized emails)
4. Get your API key from the dashboard

## Test Setup

### Step 1: Start Development Server

```bash
# Install dependencies if not already done
npm install

# Start the dev server
npm run dev
```

The application will be available at `http://localhost:3000`

### Step 2: Start Stripe Webhook Forwarding

In a separate terminal, run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe/ticket-payment
```

This will output a webhook signing secret like `whsec_...`. Copy this and add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`.

**Important:** Restart your dev server after updating the `.env` file.

### Step 3: Verify Database Setup

Ensure you have:
1. A recital show created with venue and date/time
2. A seating chart configured for the venue
3. Show seats generated for the show
4. A studio profile configured (for email branding)

## End-to-End Testing

### Test Scenario 1: Complete Ticket Purchase Flow

1. **Navigate to ticket purchase page**
   - Go to `/public/recital-tickets/[show-id]` (replace with actual show ID)
   - Or use the public-facing show listing page

2. **Select seats**
   - Click on available seats in the seating chart
   - Select at least 2 seats to test multiple ticket emails
   - Verify seat reservation works (seats turn to "reserved" state)

3. **Fill customer information**
   - Enter customer name
   - **Important:** Use an authorized email in Mailgun sandbox or your own email
   - Enter phone number (optional)

4. **Complete payment**
   - Click "Proceed to Checkout"
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
   - Click "Pay"

5. **Verify webhook processing**
   - Check the terminal running `stripe listen` for webhook events
   - Look for `payment_intent.succeeded` event
   - Verify webhook returned `200 OK`

6. **Check server logs**
   - Look for log messages:
     - `Order [orderId] marked as paid`
     - `Confirmation email sent successfully for order [orderId]`
   - If you see errors, check the troubleshooting section below

7. **Verify email delivery**
   - Check the inbox for the customer email used
   - Email subject should be: "Your Tickets for [Show Name]"
   - Verify email contains:
     - Studio branding (logo if configured)
     - Order number
     - Show details (name, date, time, location)
     - Ticket details table (seat section, row, seat number, price)
     - Total amount
     - "View & Download Tickets" button
     - QR code notice

8. **Verify database updates**
   - Order status should be `paid`
   - Seats should be marked as `sold`
   - Reservation should be cleared

### Test Scenario 2: Failed Payment

1. Use Stripe test card for declined payments: `4000 0000 0000 0002`
2. Verify:
   - Order status is `failed`
   - Seats are released back to `available`
   - No email is sent

### Test Scenario 3: Email Rendering

Test email appearance across different clients:

1. **HTML Email Test**
   - Open email in Gmail, Outlook, Apple Mail
   - Verify responsive design works on mobile
   - Check that all images load
   - Verify button links work

2. **Plain Text Email Test**
   - Some email clients show plain text version
   - Verify plain text version is readable and contains all info

## Monitoring Email Delivery

### Mailgun Dashboard

1. Go to https://app.mailgun.com
2. Navigate to Sending > Logs
3. Filter by domain
4. Check for recent email sends
5. View delivery status, opens, clicks

### Common Mailgun Events

- `delivered` - Email successfully delivered
- `opened` - Recipient opened the email (if tracking enabled)
- `clicked` - Recipient clicked a link
- `bounced` - Email bounced (invalid address)
- `failed` - Failed to send

## Troubleshooting

### Email Not Sent

**Check 1: Environment Variables**
```bash
# Verify all required variables are set
echo $MAILGUN_API_KEY
echo $MAILGUN_DOMAIN
echo $MAIL_FROM_ADDRESS
```

**Check 2: Mailgun Credentials**
- Verify API key is correct
- Check domain is verified in Mailgun
- Ensure domain DNS records are configured (for production domains)
- For sandbox, verify recipient email is authorized

**Check 3: Server Logs**
Look for errors like:
- `Missing email configuration: MAILGUN_API_KEY or MAILGUN_DOMAIN`
- `Error sending ticket confirmation email`

### Email Sent But Not Received

**Check 1: Spam Folder**
- Check spam/junk folder
- Mark as "Not Spam" for future deliveries

**Check 2: Mailgun Logs**
- Check delivery status in Mailgun dashboard
- Look for bounce or rejection messages

**Check 3: Authorized Recipients (Sandbox)**
- Mailgun sandbox can only send to authorized emails
- Add recipient email in Mailgun dashboard under Authorized Recipients

### Webhook Not Received

**Check 1: Stripe CLI Running**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe/ticket-payment
```

**Check 2: Webhook Secret**
- Ensure `STRIPE_WEBHOOK_SECRET` matches the output from `stripe listen`
- Restart dev server after updating `.env`

**Check 3: Server Logs**
Look for:
- `Received Stripe webhook: payment_intent.succeeded`
- Webhook signature verification errors

### Order Created But No Email

**Check 1: Order Status**
```sql
SELECT id, status, customer_email FROM ticket_orders WHERE id = 'order-id';
```
- Email only sends when status is updated to `paid`

**Check 2: Email Service Initialization**
- Check server logs for: `Missing email configuration`
- Verify Mailgun credentials are valid

## Testing in Production

### Before Going Live

1. **Update Stripe Keys**
   - Replace test keys with production keys
   - Update webhook endpoint in Stripe dashboard
   - Get new webhook signing secret

2. **Update Mailgun Domain**
   - Use verified production domain (not sandbox)
   - Ensure DNS records are configured
   - Test email delivery to multiple providers (Gmail, Outlook, Yahoo)

3. **Update Environment Variables**
   - Set `MARKETING_SITE_URL` to production URL
   - Use production Supabase instance
   - Enable `NODE_ENV=production`

4. **Test with Real Payment**
   - Use a real credit card (small amount)
   - Verify full flow works
   - Check email delivery
   - Verify can view/download tickets

### Production Monitoring

1. **Set up Stripe webhook alerts**
   - Configure webhook failure notifications
   - Monitor webhook success rate

2. **Monitor Mailgun delivery**
   - Set up delivery rate alerts
   - Track bounce and complaint rates
   - Monitor sending reputation

3. **Set up application logging**
   - Log all email send attempts
   - Track successful vs failed deliveries
   - Alert on high failure rates

## Test Checklist

Use this checklist to verify the complete integration:

- [ ] Environment variables configured
- [ ] Stripe CLI installed and authenticated
- [ ] Mailgun account set up with sandbox
- [ ] Development server running
- [ ] Stripe webhook forwarding active
- [ ] Can navigate to ticket purchase page
- [ ] Can select and reserve seats
- [ ] Can complete checkout with test card
- [ ] Webhook receives `payment_intent.succeeded`
- [ ] Server logs show "Order marked as paid"
- [ ] Server logs show "Confirmation email sent"
- [ ] Email received in inbox (check spam)
- [ ] Email renders correctly (HTML and text)
- [ ] Email contains all ticket details
- [ ] "View Tickets" link works
- [ ] Order status is `paid` in database
- [ ] Seats status is `sold` in database
- [ ] Can test failed payment scenario
- [ ] Seats released on payment failure

## Additional Resources

- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Mailgun Documentation](https://documentation.mailgun.com/en/latest/)
- [MJML Email Templates](https://mjml.io/documentation/)

## Next Steps

After successful testing:

1. Review email template design with stakeholders
2. Test email rendering across all major email clients
3. Set up production Mailgun domain
4. Configure production Stripe webhooks
5. Implement email delivery monitoring
6. Add email resend functionality for customers (already implemented in `/api/public/orders/[id]/resend-email.post.ts`)
