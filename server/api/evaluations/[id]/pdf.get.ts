/**
 * GET /api/evaluations/[id]/pdf
 *
 * Generate and download PDF for an evaluation.
 * Access: Teachers (own evaluations), Admin/Staff, Parents (children's evaluations)
 */

import { getSupabaseClient } from '../../../utils/supabase'
import puppeteer from 'puppeteer'

export default defineEventHandler(async (event) => {
  try {
    const client = getSupabaseClient()
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Evaluation ID is required'
      })
    }

    // Get authenticated user
    const authHeader = event.node.req.headers.authorization
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await client.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Get user profile to check role
    const { data: profile } = await client
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()

    // Fetch evaluation with all relationships
    const { data: evaluation, error } = await client
      .from('evaluations')
      .select(`
        *,
        student:students!evaluations_student_id_fkey(id, first_name, last_name, date_of_birth),
        teacher:teachers!evaluations_teacher_id_fkey(id, first_name, last_name),
        class_instance:class_instances!evaluations_class_instance_id_fkey(
          id,
          name,
          class_definition:class_definitions(
            id,
            name,
            dance_style:dance_styles(id, name, color),
            class_level:class_levels(id, name)
          )
        ),
        schedule:schedules!evaluations_schedule_id_fkey(id, name, start_date, end_date),
        recommended_level:class_levels!evaluations_recommended_next_level_fkey(id, name),
        evaluation_skills(*)
      `)
      .eq('id', id)
      .single()

    if (error || !evaluation) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Evaluation not found'
      })
    }

    // Check permissions
    if (profile?.user_role === 'teacher') {
      if (evaluation.teacher_id !== user.id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Permission denied'
        })
      }
    } else if (profile?.user_role === 'parent') {
      const { data: guardianship } = await client
        .from('guardians')
        .select('student_id')
        .eq('guardian_id', user.id)
        .eq('student_id', evaluation.student_id)
        .single()

      if (!guardianship) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Permission denied'
        })
      }
    } else if (!['admin', 'staff'].includes(profile?.user_role || '')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied'
      })
    }

    // Get studio profile for branding
    const { data: studio } = await client
      .from('studio_profile')
      .select('*')
      .single()

    // Generate HTML for PDF
    const html = generateEvaluationHTML(evaluation, studio)

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new',
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    // Generate PDF
    const pdf = await page.pdf({
      format: 'letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    })

    await browser.close()

    // Set response headers
    setResponseHeader(event, 'Content-Type', 'application/pdf')
    setResponseHeader(
      event,
      'Content-Disposition',
      `attachment; filename="evaluation-${evaluation.student.first_name}-${evaluation.student.last_name}-${new Date().toISOString().split('T')[0]}.pdf"`
    )

    return pdf
  } catch (error: any) {
    console.error('PDF generation error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to generate PDF'
    })
  }
})

function generateEvaluationHTML(evaluation: any, studio: any): string {
  const skillsByCategory = evaluation.evaluation_skills?.reduce((acc: any, skill: any) => {
    const category = skill.skill_category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(skill)
    return acc
  }, {}) || {}

  const formatRating = (rating: string) => {
    const labels: Record<string, string> = {
      needs_work: 'Needs Work',
      proficient: 'Proficient',
      excellent: 'Excellent'
    }
    return labels[rating] || rating
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getRatingStars = (rating: number | null) => {
    if (!rating) return ''
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #333;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #4F46E5;
        }

        .logo {
          max-width: 150px;
          margin-bottom: 10px;
        }

        h1 {
          font-size: 24pt;
          color: #4F46E5;
          margin-bottom: 10px;
        }

        .studio-name {
          font-size: 18pt;
          font-weight: bold;
          color: #666;
        }

        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }

        .section-title {
          font-size: 16pt;
          font-weight: bold;
          color: #4F46E5;
          margin-bottom: 12px;
          padding-bottom: 5px;
          border-bottom: 2px solid #E5E7EB;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
        }

        .info-label {
          font-size: 10pt;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 12pt;
          font-weight: 600;
          color: #333;
          margin-top: 2px;
        }

        .ratings-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .rating-box {
          background: #F9FAFB;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #E5E7EB;
        }

        .rating-label {
          font-size: 10pt;
          color: #666;
          margin-bottom: 8px;
        }

        .rating-stars {
          font-size: 18pt;
          color: #FFC107;
          margin-bottom: 5px;
        }

        .rating-value {
          font-size: 14pt;
          font-weight: bold;
          color: #333;
        }

        .skills-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        .skills-table th {
          background: #F3F4F6;
          padding: 10px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #E5E7EB;
        }

        .skills-table td {
          padding: 10px;
          border-bottom: 1px solid #E5E7EB;
        }

        .skill-category {
          background: #EEF2FF;
          padding: 8px 12px;
          font-weight: 600;
          color: #4F46E5;
          text-transform: capitalize;
          margin-top: 10px;
        }

        .rating-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 10pt;
          font-weight: 600;
        }

        .rating-excellent {
          background: #D1FAE5;
          color: #065F46;
        }

        .rating-proficient {
          background: #DBEAFE;
          color: #1E40AF;
        }

        .rating-needs-work {
          background: #FEE2E2;
          color: #991B1B;
        }

        .feedback-box {
          background: #F9FAFB;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #4F46E5;
          margin-top: 10px;
          white-space: pre-wrap;
        }

        .recommendation-box {
          background: #EEF2FF;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #4F46E5;
          margin-top: 10px;
        }

        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
          font-size: 10pt;
          color: #666;
        }

        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${studio?.logo_url ? `<img src="${studio.logo_url}" alt="Studio Logo" class="logo">` : ''}
        <div class="studio-name">${studio?.name || 'Dance Studio'}</div>
        <h1>Student Evaluation Report</h1>
      </div>

      <div class="section">
        <div class="section-title">Student Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Student Name</div>
            <div class="info-value">${evaluation.student.first_name} ${evaluation.student.last_name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Class</div>
            <div class="info-value">${evaluation.class_instance.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Teacher</div>
            <div class="info-value">${evaluation.teacher.first_name} ${evaluation.teacher.last_name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Evaluation Date</div>
            <div class="info-value">${formatDate(evaluation.created_at)}</div>
          </div>
          ${evaluation.schedule ? `
          <div class="info-item">
            <div class="info-label">Term</div>
            <div class="info-value">${evaluation.schedule.name}</div>
          </div>
          ` : ''}
        </div>
      </div>

      ${evaluation.overall_rating || evaluation.effort_rating || evaluation.attitude_rating ? `
      <div class="section">
        <div class="section-title">Overall Assessment</div>
        <div class="ratings-grid">
          ${evaluation.overall_rating ? `
          <div class="rating-box">
            <div class="rating-label">Overall Performance</div>
            <div class="rating-stars">${getRatingStars(evaluation.overall_rating)}</div>
            <div class="rating-value">${evaluation.overall_rating}/5</div>
          </div>
          ` : ''}
          ${evaluation.effort_rating ? `
          <div class="rating-box">
            <div class="rating-label">Effort Level</div>
            <div class="rating-stars">${getRatingStars(evaluation.effort_rating)}</div>
            <div class="rating-value">${evaluation.effort_rating}/5</div>
          </div>
          ` : ''}
          ${evaluation.attitude_rating ? `
          <div class="rating-box">
            <div class="rating-label">Attitude</div>
            <div class="rating-stars">${getRatingStars(evaluation.attitude_rating)}</div>
            <div class="rating-value">${evaluation.attitude_rating}/5</div>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      ${Object.keys(skillsByCategory).length > 0 ? `
      <div class="section">
        <div class="section-title">Skills Assessment</div>
        ${Object.keys(skillsByCategory).map(category => `
          <div class="skill-category">${category}</div>
          <table class="skills-table">
            <thead>
              <tr>
                <th style="width: 40%;">Skill</th>
                <th style="width: 20%;">Rating</th>
                <th style="width: 40%;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${skillsByCategory[category].map((skill: any) => `
                <tr>
                  <td>${skill.skill_name}</td>
                  <td>
                    <span class="rating-badge rating-${skill.rating.replace('_', '-')}">
                      ${formatRating(skill.rating)}
                    </span>
                  </td>
                  <td>${skill.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `).join('')}
      </div>
      ` : ''}

      ${evaluation.strengths ? `
      <div class="section">
        <div class="section-title">Strengths</div>
        <div class="feedback-box">${evaluation.strengths}</div>
      </div>
      ` : ''}

      ${evaluation.areas_for_improvement ? `
      <div class="section">
        <div class="section-title">Areas for Improvement</div>
        <div class="feedback-box">${evaluation.areas_for_improvement}</div>
      </div>
      ` : ''}

      ${evaluation.comments ? `
      <div class="section">
        <div class="section-title">Additional Comments</div>
        <div class="feedback-box">${evaluation.comments}</div>
      </div>
      ` : ''}

      ${evaluation.recommended_level ? `
      <div class="section">
        <div class="section-title">Recommendations</div>
        <div class="recommendation-box">
          <strong>Recommended Next Level:</strong> ${evaluation.recommended_level.name}
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <p>This evaluation was generated on ${formatDate(new Date().toISOString())}</p>
        ${studio?.address || studio?.phone || studio?.email ? `
        <p style="margin-top: 10px;">
          ${[studio?.address, studio?.phone, studio?.email].filter(Boolean).join(' • ')}
        </p>
        ` : ''}
      </div>
    </body>
    </html>
  `
}
