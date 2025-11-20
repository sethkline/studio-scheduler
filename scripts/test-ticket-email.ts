#!/usr/bin/env node
/**
 * Manual Test Script for Ticket Confirmation Email
 *
 * This script allows you to manually test the ticket confirmation email
 * by triggering it for an existing order.
 *
 * Usage:
 *   npx tsx scripts/test-ticket-email.ts <order-id>
 *
 * Example:
 *   npx tsx scripts/test-ticket-email.ts 550e8400-e29b-41d4-a716-446655440000
 */

import { createClient } from '@supabase/supabase-js'
import { sendTicketConfirmationEmail } from '../server/utils/ticketEmail'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

async function testTicketEmail() {
  // Get order ID from command line arguments
  const orderId = process.argv[2]

  if (!orderId) {
    console.error('❌ Error: Order ID is required')
    console.log('\nUsage:')
    console.log('  npx tsx scripts/test-ticket-email.ts <order-id>')
    console.log('\nExample:')
    console.log('  npx tsx scripts/test-ticket-email.ts 550e8400-e29b-41d4-a716-446655440000')
    process.exit(1)
  }

  // Verify environment variables
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'MAIL_FROM_ADDRESS',
  ]

  const missingVars = requiredVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    console.error('❌ Error: Missing required environment variables:')
    missingVars.forEach((varName) => console.error(`   - ${varName}`))
    console.log('\nPlease set these variables in your .env file')
    process.exit(1)
  }

  console.log('🔧 Test Configuration:')
  console.log(`   Order ID: ${orderId}`)
  console.log(`   Mailgun Domain: ${process.env.MAILGUN_DOMAIN}`)
  console.log(`   From Address: ${process.env.MAIL_FROM_ADDRESS}`)
  console.log(`   Base URL: ${process.env.MARKETING_SITE_URL || 'http://localhost:3000'}`)
  console.log('')

  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    console.log('📋 Fetching order details...')

    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('ticket_orders')
      .select(
        `
        id,
        customer_name,
        customer_email,
        status,
        total_amount_in_cents,
        show_id,
        recital_shows:show_id (
          name,
          date,
          start_time
        )
      `
      )
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('❌ Error: Order not found')
      console.error(`   Order ID: ${orderId}`)
      if (orderError) {
        console.error(`   Error: ${orderError.message}`)
      }
      process.exit(1)
    }

    console.log('✅ Order found:')
    console.log(`   Customer: ${order.customer_name}`)
    console.log(`   Email: ${order.customer_email}`)
    console.log(`   Status: ${order.status}`)
    console.log(`   Show: ${order.recital_shows?.name || 'N/A'}`)
    console.log(`   Total: $${(order.total_amount_in_cents / 100).toFixed(2)}`)
    console.log('')

    // Count tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id')
      .eq('ticket_order_id', orderId)

    if (ticketsError) {
      console.error('❌ Error fetching tickets:', ticketsError.message)
      process.exit(1)
    }

    console.log(`   Tickets: ${tickets?.length || 0}`)
    console.log('')

    // Confirm sending
    console.log('📧 Preparing to send confirmation email...')
    console.log('')

    if (process.env.MAILGUN_DOMAIN?.includes('sandbox')) {
      console.log('⚠️  WARNING: Using Mailgun sandbox domain')
      console.log('   Make sure the recipient email is authorized in Mailgun dashboard')
      console.log('   Or the email will not be delivered!')
      console.log('')
    }

    // Send email
    console.log('📤 Sending email...')
    const emailSent = await sendTicketConfirmationEmail(supabase as any, orderId)

    if (emailSent) {
      console.log('✅ Email sent successfully!')
      console.log('')
      console.log('📬 Check the following:')
      console.log(`   1. Email inbox for: ${order.customer_email}`)
      console.log('   2. Spam/junk folder')
      console.log('   3. Mailgun dashboard logs: https://app.mailgun.com')
      console.log('')
      console.log('Expected subject: Your Tickets for ' + (order.recital_shows?.name || 'Event'))
    } else {
      console.error('❌ Failed to send email')
      console.log('')
      console.log('Troubleshooting:')
      console.log('   1. Check server logs above for specific errors')
      console.log('   2. Verify Mailgun credentials are correct')
      console.log('   3. Ensure Mailgun domain is verified (or using sandbox with authorized recipient)')
      console.log('   4. Check Mailgun dashboard for delivery issues')
      process.exit(1)
    }
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
    console.error('')
    console.error('Stack trace:')
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the test
testTicketEmail().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
