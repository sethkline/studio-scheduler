// server/utils/emailTemplates.ts
// Default email templates for common studio notifications

export const defaultEmailTemplates = [
  {
    name: 'Enrollment Confirmation',
    slug: 'enrollment-confirmation',
    category: 'enrollment',
    subject: 'Welcome to {{class_name}}! Enrollment Confirmed',
    description: 'Sent when a student is enrolled in a class',
    template_variables: [
      'parent_name',
      'student_name',
      'class_name',
      'class_day',
      'class_time',
      'teacher_name',
      'start_date',
      'studio_name',
      'studio_email',
      'studio_phone',
    ],
    mjml_content: `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" color="#333" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f5f5f5">
    <mj-section background-color="#8b5cf6" padding="30px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="28px" font-weight="bold">
          Enrollment Confirmed!
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="40px 30px">
      <mj-column>
        <mj-text font-size="16px">
          Dear {{parent_name}},
        </mj-text>
        <mj-text>
          Great news! {{student_name}} has been successfully enrolled in <strong>{{class_name}}</strong>.
        </mj-text>

        <mj-divider border-color="#e0e0e0" />

        <mj-text font-weight="bold" font-size="16px">
          Class Details:
        </mj-text>
        <mj-text>
          <strong>Class:</strong> {{class_name}}<br/>
          <strong>Teacher:</strong> {{teacher_name}}<br/>
          <strong>Schedule:</strong> {{class_day}}s at {{class_time}}<br/>
          <strong>Start Date:</strong> {{start_date}}
        </mj-text>

        <mj-divider border-color="#e0e0e0" />

        <mj-text>
          We're excited to have {{student_name}} join us! If you have any questions, please don't hesitate to contact us.
        </mj-text>

        <mj-button background-color="#8b5cf6" href="{{studio_website}}/portal">
          View Parent Portal
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
    `,
    html_content: '', // Will be compiled from MJML
    text_content: '', // Will be generated from HTML
    use_studio_branding: true,
    is_active: true,
    is_default: true,
  },

  {
    name: 'Payment Receipt',
    slug: 'payment-receipt',
    category: 'payment',
    subject: 'Payment Receipt - {{amount}}',
    description: 'Sent when a payment is received',
    template_variables: [
      'parent_name',
      'amount',
      'payment_date',
      'payment_method',
      'invoice_number',
      'description',
      'studio_name',
    ],
    mjml_content: `
<mjml>
  <mj-body background-color="#f5f5f5">
    <mj-section background-color="#8b5cf6" padding="30px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="28px" font-weight="bold">
          Payment Received
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="40px 30px">
      <mj-column>
        <mj-text font-size="16px">
          Dear {{parent_name}},
        </mj-text>
        <mj-text>
          Thank you for your payment! This email confirms we have received your payment.
        </mj-text>

        <mj-divider border-color="#e0e0e0" />

        <mj-text font-weight="bold" font-size="16px">
          Payment Details:
        </mj-text>
        <mj-text>
          <strong>Amount:</strong> {{amount}}<br/>
          <strong>Date:</strong> {{payment_date}}<br/>
          <strong>Method:</strong> {{payment_method}}<br/>
          <strong>Invoice #:</strong> {{invoice_number}}<br/>
          <strong>For:</strong> {{description}}
        </mj-text>

        <mj-divider border-color="#e0e0e0" />

        <mj-text font-size="12px" color="#666">
          Please keep this receipt for your records. If you have any questions about this payment, please contact us.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
    `,
    html_content: '',
    text_content: '',
    use_studio_branding: true,
    is_active: true,
    is_default: true,
  },

  {
    name: 'Recital Information',
    slug: 'recital-information',
    category: 'recital',
    subject: 'Important Recital Information - {{recital_name}}',
    description: 'General recital information and updates',
    template_variables: [
      'parent_name',
      'student_name',
      'recital_name',
      'recital_date',
      'recital_time',
      'recital_location',
      'important_info',
      'studio_name',
    ],
    mjml_content: `
<mjml>
  <mj-body background-color="#f5f5f5">
    <mj-section background-color="#8b5cf6" padding="30px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="28px" font-weight="bold">
          {{recital_name}}
        </mj-text>
        <mj-text align="center" color="#ffffff" font-size="16px">
          Recital Information
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="40px 30px">
      <mj-column>
        <mj-text font-size="16px">
          Dear {{parent_name}},
        </mj-text>
        <mj-text>
          We're excited to share important information about our upcoming recital featuring {{student_name}}!
        </mj-text>

        <mj-divider border-color="#e0e0e0" />

        <mj-text font-weight="bold" font-size="16px">
          Recital Details:
        </mj-text>
        <mj-text>
          <strong>Event:</strong> {{recital_name}}<br/>
          <strong>Date:</strong> {{recital_date}}<br/>
          <strong>Time:</strong> {{recital_time}}<br/>
          <strong>Location:</strong> {{recital_location}}
        </mj-text>

        <mj-divider border-color="#e0e0e0" />

        <mj-text font-weight="bold">
          Important Information:
        </mj-text>
        <mj-text>
          {{important_info}}
        </mj-text>

        <mj-button background-color="#8b5cf6" href="{{studio_website}}/recitals">
          View Recital Details
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
    `,
    html_content: '',
    text_content: '',
    use_studio_branding: true,
    is_active: true,
    is_default: true,
  },

  {
    name: 'Class Reminder',
    slug: 'class-reminder',
    category: 'reminder',
    subject: 'Reminder: {{class_name}} Tomorrow',
    description: 'Reminder sent before upcoming classes',
    template_variables: [
      'parent_name',
      'student_name',
      'class_name',
      'class_date',
      'class_time',
      'location',
      'special_notes',
    ],
    mjml_content: `
<mjml>
  <mj-body background-color="#f5f5f5">
    <mj-section background-color="#8b5cf6" padding="30px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="28px" font-weight="bold">
          Class Reminder
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="40px 30px">
      <mj-column>
        <mj-text font-size="16px">
          Hi {{parent_name}},
        </mj-text>
        <mj-text>
          This is a friendly reminder that {{student_name}} has class tomorrow!
        </mj-text>

        <mj-divider border-color="#e0e0e0" />

        <mj-text>
          <strong>Class:</strong> {{class_name}}<br/>
          <strong>Date:</strong> {{class_date}}<br/>
          <strong>Time:</strong> {{class_time}}<br/>
          <strong>Location:</strong> {{location}}
        </mj-text>

        <mj-text>
          {{special_notes}}
        </mj-text>

        <mj-text font-size="12px" color="#666">
          See you soon!
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
    `,
    html_content: '',
    text_content: '',
    use_studio_branding: true,
    is_active: true,
    is_default: true,
  },

  {
    name: 'Studio Announcement',
    slug: 'studio-announcement',
    category: 'announcement',
    subject: '{{announcement_title}}',
    description: 'General studio announcements',
    template_variables: [
      'parent_name',
      'announcement_title',
      'announcement_body',
      'call_to_action',
      'action_url',
    ],
    mjml_content: `
<mjml>
  <mj-body background-color="#f5f5f5">
    <mj-section background-color="#8b5cf6" padding="30px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="28px" font-weight="bold">
          {{announcement_title}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="40px 30px">
      <mj-column>
        <mj-text font-size="16px">
          Dear {{parent_name}},
        </mj-text>
        <mj-text>
          {{announcement_body}}
        </mj-text>

        <mj-button background-color="#8b5cf6" href="{{action_url}}">
          {{call_to_action}}
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
    `,
    html_content: '',
    text_content: '',
    use_studio_branding: true,
    is_active: true,
    is_default: true,
  },

  {
    name: 'Payment Reminder',
    slug: 'payment-reminder',
    category: 'payment',
    subject: 'Payment Reminder - Due {{due_date}}',
    description: 'Reminder for upcoming or overdue payments',
    template_variables: [
      'parent_name',
      'amount_due',
      'due_date',
      'description',
      'payment_url',
      'studio_name',
    ],
    mjml_content: `
<mjml>
  <mj-body background-color="#f5f5f5">
    <mj-section background-color="#f59e0b" padding="30px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="28px" font-weight="bold">
          Payment Reminder
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="40px 30px">
      <mj-column>
        <mj-text font-size="16px">
          Dear {{parent_name}},
        </mj-text>
        <mj-text>
          This is a friendly reminder that you have a payment due.
        </mj-text>

        <mj-divider border-color="#e0e0e0" />

        <mj-text font-weight="bold" font-size="16px">
          Payment Details:
        </mj-text>
        <mj-text>
          <strong>Amount Due:</strong> {{amount_due}}<br/>
          <strong>Due Date:</strong> {{due_date}}<br/>
          <strong>For:</strong> {{description}}
        </mj-text>

        <mj-button background-color="#8b5cf6" href="{{payment_url}}">
          Make Payment
        </mj-button>

        <mj-text font-size="12px" color="#666">
          If you've already made this payment, please disregard this reminder. Contact us if you have any questions.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
    `,
    html_content: '',
    text_content: '',
    use_studio_branding: true,
    is_active: true,
    is_default: true,
  },
]
