import { getSupabaseClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Please log in',
    })
  }

  try {
    const query = getQuery(event)
    const {
      student_id,
      class_instance_id,
      start_date,
      end_date,
      status,
      format = 'csv', // csv or json
    } = query

    // Build attendance query
    let attendanceQuery = client
      .from('attendance')
      .select(`
        attendance_date,
        check_in_time,
        check_out_time,
        status,
        is_makeup,
        notes,
        student:students(
          first_name,
          last_name
        ),
        class_instance:class_instances(
          name,
          dance_style:dance_styles(name)
        ),
        marked_by_user:profiles!attendance_marked_by_fkey(
          first_name,
          last_name
        )
      `)
      .order('attendance_date', { ascending: false })

    // Apply filters
    if (student_id) {
      attendanceQuery = attendanceQuery.eq('student_id', student_id as string)
    }

    if (class_instance_id) {
      attendanceQuery = attendanceQuery.eq('class_instance_id', class_instance_id as string)
    }

    if (start_date) {
      attendanceQuery = attendanceQuery.gte('attendance_date', start_date as string)
    }

    if (end_date) {
      attendanceQuery = attendanceQuery.lte('attendance_date', end_date as string)
    }

    if (status) {
      attendanceQuery = attendanceQuery.eq('status', status as string)
    }

    const { data: records, error: attendanceError } = await attendanceQuery

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError)
      throw attendanceError
    }

    if (format === 'json') {
      return records
    }

    // Convert to CSV
    const csv = convertToCSV(records || [])

    // Set response headers for CSV download
    setHeader(event, 'Content-Type', 'text/csv')
    setHeader(event, 'Content-Disposition', `attachment; filename="attendance-report-${new Date().toISOString().split('T')[0]}.csv"`)

    return csv
  } catch (error: any) {
    console.error('Error exporting attendance:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to export attendance report',
    })
  }
})

/**
 * Convert attendance records to CSV format
 */
function convertToCSV(records: any[]): string {
  if (records.length === 0) {
    return 'Date,Student Name,Class Name,Dance Style,Status,Check-In Time,Check-Out Time,Is Makeup,Notes,Marked By\n'
  }

  const header = 'Date,Student Name,Class Name,Dance Style,Status,Check-In Time,Check-Out Time,Is Makeup,Notes,Marked By\n'

  const rows = records.map(record => {
    const studentName = `${record.student?.first_name || ''} ${record.student?.last_name || ''}`.trim()
    const className = record.class_instance?.name || ''
    const danceStyle = record.class_instance?.dance_style?.name || ''
    const checkInTime = record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : ''
    const checkOutTime = record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : ''
    const markedBy = record.marked_by_user ? `${record.marked_by_user.first_name || ''} ${record.marked_by_user.last_name || ''}`.trim() : ''

    return [
      record.attendance_date,
      escapeCSV(studentName),
      escapeCSV(className),
      escapeCSV(danceStyle),
      record.status,
      checkInTime,
      checkOutTime,
      record.is_makeup ? 'Yes' : 'No',
      escapeCSV(record.notes || ''),
      escapeCSV(markedBy),
    ].join(',')
  })

  return header + rows.join('\n')
}

/**
 * Escape CSV values (wrap in quotes if contains comma, quote, or newline)
 */
function escapeCSV(value: string): string {
  if (!value) return ''

  const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n')

  if (needsQuotes) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}
