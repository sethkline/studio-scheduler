import { getSupabaseClient } from '../../../../utils/supabase'
import { jsPDF } from 'jspdf'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user
  const paymentId = getRouterParam(event, 'id')

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!paymentId) {
    throw createError({
      statusCode: 400,
      message: 'Payment ID is required',
    })
  }

  try {
    // Get guardian record for this user
    const { data: guardian, error: guardianError } = await client
      .from('guardians')
      .select('id, first_name, last_name, email, phone, address, city, state, zip_code')
      .eq('user_id', user.id)
      .single()

    if (guardianError || !guardian) {
      throw createError({
        statusCode: 404,
        message: 'Guardian profile not found',
      })
    }

    // Get payment details
    const { data: payment, error: paymentError } = await client
      .from('payments')
      .select(`
        *,
        student:students(id, first_name, last_name),
        guardian:guardians(id, first_name, last_name)
      `)
      .eq('id', paymentId)
      .eq('guardian_id', guardian.id)
      .single()

    if (paymentError || !payment) {
      throw createError({
        statusCode: 404,
        message: 'Payment not found',
      })
    }

    // Get studio profile for receipt header
    const { data: studio } = await client
      .from('studio_profile')
      .select('name, email, phone, address, city, state, zip_code, logo_url')
      .single()

    // Generate PDF receipt
    const doc = new jsPDF()

    // Add studio logo if available
    let yPosition = 20
    if (studio?.logo_url) {
      try {
        // TODO: Add logo image when available
        // doc.addImage(studio.logo_url, 'PNG', 15, 10, 30, 30)
        yPosition = 45
      } catch (err) {
        console.warn('Could not add logo to receipt:', err)
      }
    }

    // Studio information
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(studio?.name || 'Dance Studio', 15, yPosition)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    if (studio?.address) {
      doc.text(studio.address, 15, yPosition + 7)
      doc.text(`${studio.city}, ${studio.state} ${studio.zip_code}`, 15, yPosition + 12)
    }
    if (studio?.phone) {
      doc.text(`Phone: ${studio.phone}`, 15, yPosition + 17)
    }
    if (studio?.email) {
      doc.text(`Email: ${studio.email}`, 15, yPosition + 22)
    }

    // Receipt title
    yPosition += 35
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('PAYMENT RECEIPT', 105, yPosition, { align: 'center' })

    // Receipt details box
    yPosition += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const receiptDetails = [
      ['Receipt Number:', payment.receipt_number || paymentId.substring(0, 8).toUpperCase()],
      ['Date:', new Date(payment.created_at).toLocaleDateString()],
      ['Status:', payment.status.toUpperCase()],
    ]

    receiptDetails.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.text(label, 140, yPosition)
      doc.setFont('helvetica', 'normal')
      doc.text(value, 175, yPosition)
      yPosition += 6
    })

    // Guardian information
    yPosition += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Billed To:', 15, yPosition)
    yPosition += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`${guardian.first_name} ${guardian.last_name}`, 15, yPosition)
    yPosition += 5

    if (guardian.email) {
      doc.text(guardian.email, 15, yPosition)
      yPosition += 5
    }

    if (guardian.phone) {
      doc.text(guardian.phone, 15, yPosition)
      yPosition += 5
    }

    if (guardian.address) {
      doc.text(guardian.address, 15, yPosition)
      yPosition += 5
      doc.text(`${guardian.city}, ${guardian.state} ${guardian.zip_code}`, 15, yPosition)
      yPosition += 5
    }

    // Payment details table
    yPosition += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Payment Details', 15, yPosition)
    yPosition += 8

    // Table header
    doc.setFillColor(240, 240, 240)
    doc.rect(15, yPosition - 5, 180, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Description', 17, yPosition)
    doc.text('Student', 110, yPosition)
    doc.text('Amount', 175, yPosition, { align: 'right' })
    yPosition += 8

    // Table row
    doc.setFont('helvetica', 'normal')
    const studentName = payment.student
      ? `${payment.student.first_name} ${payment.student.last_name}`
      : 'N/A'
    const amount = `$${(payment.amount_cents / 100).toFixed(2)}`

    // Wrap description if too long
    const description = payment.description || 'Payment'
    const descriptionLines = doc.splitTextToSize(description, 85)

    descriptionLines.forEach((line: string, index: number) => {
      doc.text(line, 17, yPosition + (index * 5))
    })

    doc.text(studentName, 110, yPosition)
    doc.text(amount, 175, yPosition, { align: 'right' })
    yPosition += Math.max(8, descriptionLines.length * 5 + 3)

    // Draw line
    doc.line(15, yPosition, 195, yPosition)
    yPosition += 8

    // Total
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Total:', 145, yPosition)
    doc.text(amount, 175, yPosition, { align: 'right' })
    yPosition += 8

    // Payment information
    if (payment.paid_at) {
      yPosition += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Paid on: ${new Date(payment.paid_at).toLocaleDateString()}`, 15, yPosition)
      if (payment.payment_method) {
        yPosition += 5
        doc.text(`Payment method: ${payment.payment_method}`, 15, yPosition)
      }
    } else if (payment.due_date) {
      yPosition += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Due date: ${new Date(payment.due_date).toLocaleDateString()}`, 15, yPosition)
    }

    // Footer
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('Thank you for your payment!', 105, 280, { align: 'center' })

    // Generate PDF as buffer
    const pdfBuffer = doc.output('arraybuffer')

    // Set headers for file download
    setResponseHeaders(event, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${payment.receipt_number || paymentId}.pdf"`,
    })

    return pdfBuffer
  } catch (error: any) {
    console.error('Error generating receipt:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate receipt',
    })
  }
})
