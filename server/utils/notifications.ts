// server/utils/notifications.ts
// Email and SMS notification utilities using Mailgun

import FormData from 'form-data'
import Mailgun from 'mailgun.js'

interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
}

interface AbsenceNotificationData {
  studentName: string
  className: string
  absenceDate: string
  parentEmail: string
  parentName: string
}

interface AttendanceAlertData {
  studentName: string
  alertType: string
  alertMessage: string
  parentEmail: string
  parentName: string
}

/**
 * Send an email using Mailgun
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const config = useRuntimeConfig()

  if (!config.mailgunApiKey || !config.mailgunDomain) {
    console.error('Mailgun not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.')
    return false
  }

  try {
    const mailgun = new Mailgun(FormData)
    const mg = mailgun.client({
      username: 'api',
      key: config.mailgunApiKey,
    })

    const from = options.from || `Dance Studio <noreply@${config.mailgunDomain}>`

    const messageData = {
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      ...(options.html && { html: options.html }),
      ...(options.text && { text: options.text }),
    }

    await mg.messages.create(config.mailgunDomain, messageData)

    console.log(`Email sent successfully to ${options.to}`)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

/**
 * Send absence notification to parent
 */
export async function sendAbsenceNotification(data: AbsenceNotificationData): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4F46E5; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        .btn { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Absence Notification</h1>
        </div>
        <div class="content">
          <p>Dear ${data.parentName},</p>
          <p>This is to inform you that <strong>${data.studentName}</strong> was marked absent from class today.</p>

          <div class="info-box">
            <strong>Class:</strong> ${data.className}<br>
            <strong>Date:</strong> ${new Date(data.absenceDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          <p>If this absence was planned, please excuse it in your parent portal. If this is unexpected, please contact us.</p>

          <p style="margin-top: 20px;">
            <a href="${useRuntimeConfig().public.marketingSiteUrl}/parent/attendance" class="btn">View Attendance</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated message from your dance studio attendance system.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    Absence Notification

    Dear ${data.parentName},

    This is to inform you that ${data.studentName} was marked absent from class today.

    Class: ${data.className}
    Date: ${new Date(data.absenceDate).toLocaleDateString()}

    If this absence was planned, please excuse it in your parent portal. If this is unexpected, please contact us.
  `

  return await sendEmail({
    to: data.parentEmail,
    subject: `Absence Notice: ${data.studentName} - ${data.className}`,
    html,
    text,
  })
}

/**
 * Send attendance alert notification
 */
export async function sendAttendanceAlert(data: AttendanceAlertData): Promise<boolean> {
  const severityColor = {
    consecutive_absences: '#DC2626',
    low_attendance: '#F59E0B',
    excessive_tardiness: '#F59E0B',
    custom: '#6B7280',
  }

  const color = severityColor[data.alertType as keyof typeof severityColor] || '#6B7280'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .alert-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${color}; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        .btn { display: inline-block; padding: 12px 24px; background: ${color}; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Attendance Alert</h1>
        </div>
        <div class="content">
          <p>Dear ${data.parentName},</p>
          <p>We've noticed a concerning attendance pattern for <strong>${data.studentName}</strong>.</p>

          <div class="alert-box">
            <strong>Alert:</strong> ${data.alertMessage}
          </div>

          <p>Consistent attendance is important for your dancer's progress and development. Please contact us if there are any issues we can help address.</p>

          <p style="margin-top: 20px;">
            <a href="${useRuntimeConfig().public.marketingSiteUrl}/parent/attendance" class="btn">View Full Attendance Record</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated message from your dance studio attendance system.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    Attendance Alert

    Dear ${data.parentName},

    We've noticed a concerning attendance pattern for ${data.studentName}.

    Alert: ${data.alertMessage}

    Consistent attendance is important for your dancer's progress and development. Please contact us if there are any issues we can help address.
  `

  return await sendEmail({
    to: data.parentEmail,
    subject: `Attendance Alert: ${data.studentName}`,
    html,
    text,
  })
}

/**
 * Send weekly attendance summary to parent
 */
export async function sendWeeklyAttendanceSummary(
  parentEmail: string,
  parentName: string,
  students: Array<{
    name: string
    className: string
    attendancePercentage: number
    classesThisWeek: number
    absences: number
  }>
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .student-card { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stats { display: flex; justify-content: space-around; margin-top: 10px; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #4F46E5; }
        .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Weekly Attendance Summary</h1>
        </div>
        <div class="content">
          <p>Dear ${parentName},</p>
          <p>Here's a summary of your dancer's attendance this week:</p>

          ${students.map(student => `
            <div class="student-card">
              <h3>${student.name}</h3>
              <p><strong>Class:</strong> ${student.className}</p>
              <div class="stats">
                <div class="stat">
                  <div class="stat-value">${student.classesThisWeek}</div>
                  <div class="stat-label">Classes</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${student.absences}</div>
                  <div class="stat-label">Absences</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${student.attendancePercentage}%</div>
                  <div class="stat-label">Attendance</div>
                </div>
              </div>
            </div>
          `).join('')}

        </div>
        <div class="footer">
          <p>This is an automated weekly summary from your dance studio.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: parentEmail,
    subject: 'Weekly Attendance Summary',
    html,
  })
}
