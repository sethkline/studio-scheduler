# Attendance & Check-In System

## Overview

The Attendance & Check-In System is a comprehensive solution for tracking student attendance, managing absences, and handling makeup classes at your dance studio. It features quick check-in methods, teacher attendance marking, automatic notifications, and detailed reporting.

## Features

### 1. Front Desk Check-In System (Story 3.1.1)
- **QR Code Scanning**: Instant check-in by scanning student ID cards
- **Manual Search**: Search and check in students by name
- **Real-time Dashboard**: See today's expected students and check-in status
- **Student Information**: View photo, allergies, medical alerts, and emergency contacts
- **Late Detection**: Automatically flags students arriving more than 10 minutes late
- **Early Pickup**: Track when students leave early

**Access**: Staff and Admin only
**URL**: `/attendance/check-in`

### 2. Teacher Attendance Marking (Story 3.1.2)
- **Mobile-Optimized**: Easy-to-use interface on tablets/phones
- **Quick Marking**: One-tap to mark present/tardy/absent
- **Class Roster**: View full roster with enrollment status
- **Makeup Students**: See which students are attending as makeup
- **Real-time Summary**: Track present, tardy, and absent counts

**Access**: Teachers, Staff, and Admin
**URL**: `/attendance/teacher`

### 3. Absence Tracking & Notifications (Story 3.1.3)
- **Report Absences**: Parents can report planned absences in advance
- **Automatic Alerts**: Notifications sent if student marked absent unexpectedly
- **Excuse Management**: Staff can excuse absences and grant makeup credits
- **Attendance Patterns**: System tracks concerning patterns (3+ consecutive absences)
- **Attendance Percentage**: View attendance rate per student/class

### 4. Makeup Class System (Story 3.1.4)
- **Credit Management**: Automatic makeup credits for excused absences
- **Booking System**: Browse and book makeup classes
- **Capacity Checking**: Prevents overbooking makeup classes
- **Credit Expiration**: Credits expire at end of term
- **Usage Tracking**: Track when credits are used or expire

### 5. Attendance Reports (Story 3.1.5)
- **Student Reports**: Individual attendance history and statistics
- **Class Reports**: Attendance for specific classes with percentages
- **Date Range Filtering**: Filter by any date range
- **Export Capability**: Export reports to CSV/Excel
- **Visual Analytics**: Charts showing attendance trends
- **At-Risk Identification**: Identify students with low attendance

## Setup Instructions

### 1. Database Migration

Run the database migration to create all necessary tables:

```bash
# Connect to your Supabase project
# Execute the migration file:
psql -h [your-supabase-host] -d postgres -U postgres -f database/migrations/001_attendance_system.sql
```

Or use the Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `/database/migrations/001_attendance_system.sql`
4. Click "Run"

### 2. Generate Student QR Codes

After migration, generate QR codes for existing students:

```bash
# Use the API endpoint to generate codes
POST /api/attendance/qr-code/generate
Body: { "student_id": "uuid-here" }
```

Or create a batch script to generate for all students:

```javascript
// scripts/generate-qr-codes.js
const students = await $fetch('/api/students')
for (const student of students) {
  await $fetch('/api/attendance/qr-code/generate', {
    method: 'POST',
    body: { student_id: student.id }
  })
}
```

### 3. Configure Permissions

Ensure Row Level Security (RLS) policies are active. The migration includes policies for:
- **Admin**: Full access to all attendance data
- **Staff**: Full access to all attendance data
- **Teachers**: Access to their own class attendance
- **Parents**: Access to their own students' attendance

### 4. Set Up Notifications (Optional)

To enable automatic absence notifications, set up a scheduled job:

```sql
-- Using pg_cron (if available)
SELECT cron.schedule(
  'check-attendance-daily',
  '0 22 * * *',  -- Run at 10 PM daily
  $$
  SELECT auto_mark_absent_students();
  SELECT check_attendance_alerts();
  $$
);
```

Or set up a server-side cron job that calls:
- `/api/attendance/auto-mark-absent` (after classes end)
- `/api/attendance/alerts/check` (daily)

## User Guides

### For Front Desk Staff

#### Checking In a Student

**Method 1: QR Code**
1. Navigate to `/attendance/check-in`
2. Ensure "Scan QR Code" tab is selected
3. Scan the student's QR code or type it manually
4. Student is instantly checked in

**Method 2: Manual Search**
1. Navigate to `/attendance/check-in`
2. Click "Search Student" tab
3. Type student name in search box
4. Click "Check In" next to the student's name

#### Viewing Today's Roster
- The dashboard shows all expected students for today
- Green checkmark = checked in
- Orange clock = late
- Gray = not yet checked in

#### Checking Out a Student
- Click on a checked-in student
- Click "Check Out" button
- System records check-out time

### For Teachers

#### Marking Attendance

1. Navigate to `/attendance/teacher`
2. Select your class from the dropdown
3. For each student, tap one of:
   - ✓ (green) = Present
   - 🕐 (orange) = Tardy
   - ✗ (red) = Absent
4. Changes save automatically

#### Viewing Student Notes
- Tap on a student's name to see:
  - Previous attendance
  - Allergies/medical info
  - Recent notes

#### Offline Mode (Coming Soon)
- Mark attendance offline
- Syncs when connection restored

### For Parents

#### Reporting a Planned Absence

1. Log in to parent portal
2. Navigate to "My Students"
3. Select student
4. Click "Report Absence"
5. Fill in:
   - Date of absence
   - Reason
   - Additional notes
6. Submit

#### Viewing Attendance History

1. Navigate to student profile
2. Click "Attendance" tab
3. View:
   - Attendance percentage
   - Recent attendance
   - Absence history

#### Booking Makeup Classes

1. Go to "Makeup Credits"
2. See available credits with expiration dates
3. Click "Book Makeup"
4. Browse available classes
5. Select date and class
6. Confirm booking

### For Administrators

#### Excusing Absences

1. Navigate to `/absences/manage`
2. Find the absence
3. Click "Excuse"
4. Optionally grant makeup credit
5. Save

#### Viewing Reports

1. Navigate to `/attendance/reports`
2. Select report type:
   - Student Report
   - Class Report
   - Date Range Report
3. Apply filters
4. View or export

#### Managing Alerts

1. Navigate to `/attendance/alerts`
2. View unresolved alerts
3. Click on alert to see details
4. Take action:
   - Contact parent
   - Schedule meeting
   - Mark as resolved

## API Reference

### Check-In Endpoints

#### POST `/api/attendance/check-in`
Check in a student.

**Request:**
```json
{
  "student_id": "uuid",  // Optional if qr_code_data provided
  "qr_code_data": "string",  // Optional if student_id provided
  "class_instance_id": "uuid",  // Optional, auto-detected
  "check_in_time": "2024-01-15T09:30:00Z",  // Optional, defaults to now
  "notes": "string"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "attendance": { /* attendance record */ },
  "student": { /* student info */ },
  "is_makeup": false
}
```

#### POST `/api/attendance/check-out`
Check out a student.

**Request:**
```json
{
  "attendance_id": "uuid",
  "check_out_time": "2024-01-15T10:30:00Z",  // Optional
  "notes": "string"  // Optional
}
```

### Attendance Marking

#### POST `/api/attendance/mark`
Mark attendance for a student.

**Request:**
```json
{
  "student_id": "uuid",
  "class_instance_id": "uuid",
  "attendance_date": "2024-01-15",
  "status": "present|absent|excused|tardy|left_early",
  "notes": "string"  // Optional
}
```

### Absence Management

#### POST `/api/absences/report`
Report an absence.

**Request:**
```json
{
  "student_id": "uuid",
  "class_instance_id": "uuid",
  "absence_date": "2024-01-15",
  "absence_type": "planned|unplanned",
  "reason": "illness|vacation|family_emergency|school_conflict|other",
  "reason_notes": "string"  // Optional
}
```

#### POST `/api/absences/excuse`
Excuse an absence (staff/admin only).

**Request:**
```json
{
  "absence_id": "uuid",
  "is_excused": true,
  "grant_makeup_credit": true  // Optional
}
```

### Makeup Classes

#### POST `/api/makeup/book`
Book a makeup class.

**Request:**
```json
{
  "makeup_credit_id": "uuid",
  "makeup_class_instance_id": "uuid",
  "makeup_date": "2024-01-20",
  "notes": "string"  // Optional
}
```

#### GET `/api/makeup/credits/[studentId]`
Get available makeup credits for a student.

**Response:**
```json
{
  "student_id": "uuid",
  "credits": [
    {
      "credit_id": "uuid",
      "class_name": "Ballet 101",
      "remaining_credits": 1,
      "expiration_date": "2024-06-30",
      "absence_date": "2024-01-10"
    }
  ],
  "total_available": 3
}
```

### Reports

#### GET `/api/attendance/reports`
Get attendance report.

**Query Parameters:**
- `student_id`: Filter by student (optional)
- `class_instance_id`: Filter by class (optional)
- `start_date`: Start date (optional)
- `end_date`: End date (optional)
- `status`: Filter by status (optional)
- `include_makeup`: Include makeup attendance (default: true)

**Response:**
```json
{
  "filters": { /* applied filters */ },
  "summary": {
    "total_classes": 20,
    "total_present": 18,
    "total_absent": 2,
    "total_excused": 1,
    "total_tardy": 3,
    "attendance_percentage": 90.0
  },
  "records": [ /* attendance records */ ],
  "student_summaries": [ /* per-student summaries */ ]
}
```

## Database Schema

See `/docs/database/attendance-db.md` for complete schema documentation.

### Key Tables

- **attendance**: Main attendance records (check-in, status, timestamps)
- **absences**: Absence tracking with reasons and excuses
- **makeup_credits**: Available makeup class credits
- **makeup_bookings**: Booked makeup classes
- **attendance_notes**: Notes about student attendance/behavior
- **student_qr_codes**: QR codes for quick check-in
- **attendance_alerts**: Automatic alerts for concerning patterns

### Views

- **v_student_attendance_summary**: Per-student attendance statistics
- **v_makeup_credits_available**: Available makeup credits with details

## Troubleshooting

### QR Code Not Working
1. Check if QR code is active: Query `student_qr_codes` table
2. Regenerate QR code: POST to `/api/attendance/qr-code/generate`
3. Ensure QR scanner is focused and has good lighting

### Student Can't Check In
1. Verify student is enrolled in class
2. Check if already checked in today
3. For makeup students, verify booking exists

### Makeup Credit Not Appearing
1. Verify absence is marked as excused
2. Check credit hasn't expired
3. Ensure database trigger is active

### Reports Not Loading
1. Check date range (large ranges may be slow)
2. Verify user has permission to view data
3. Check browser console for errors

## Performance Optimization

### Indexes
All necessary indexes are created by the migration. Key indexes:
- `idx_attendance_student_date` for student history queries
- `idx_attendance_class_date` for class roster queries
- `idx_makeup_credits_student_status` for credit availability

### Caching
Consider caching:
- Today's roster (refresh every 5 minutes)
- Student QR code lookups (in-memory cache)
- Class schedules (refresh on schedule changes)

### Database Queries
- Use views (`v_student_attendance_summary`) for complex queries
- Batch QR code generation
- Archive old attendance records (>2 years) to separate table

## Security Considerations

### Row Level Security (RLS)
All tables have RLS enabled with policies for each user role.

### Sensitive Information
- Student photos stored in Supabase Storage with proper access control
- Medical information only visible to staff/admin
- QR codes are unique and non-guessable

### Audit Trail
- All attendance changes logged with `marked_by` user ID
- Timestamps track when records created/updated
- Consider enabling `attendance_notes` for important changes

## Future Enhancements

Potential future features:
1. **Biometric Check-In**: Fingerprint or face recognition
2. **Mobile Parent Check-In**: Parents check in from parking lot
3. **Attendance Gamification**: Rewards for perfect attendance
4. **Predictive Analytics**: ML to predict at-risk students
5. **Billing Integration**: Auto-adjust billing based on attendance
6. **Video Verification**: Brief clips at check-in for security
7. **Geofencing**: Only allow check-in within studio premises

## Support

For questions or issues:
1. Check this documentation
2. Review API error messages
3. Check database logs
4. Contact system administrator

## Credits

Built with:
- Nuxt 3
- Supabase (PostgreSQL)
- PrimeVue
- TypeScript
