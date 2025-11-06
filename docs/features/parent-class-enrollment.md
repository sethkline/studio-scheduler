# Parent Class Enrollment Feature

## Overview

The Parent Class Enrollment feature allows parents/guardians to browse available classes, submit enrollment requests for their children, and manage their enrollments. This feature implements an approval workflow where staff/admin must approve enrollment requests before students are enrolled.

**User Story:**
> AS A parent
> I WANT to enroll my child in classes and see enrollment status
> SO THAT I can manage their dance education

---

## Features Implemented

### ✅ For Parents

1. **Browse Available Classes** (`/parent/classes`)
   - Filter classes by dance style, level, day of week
   - Age-appropriate filtering based on student's age
   - View class details (teacher, schedule, capacity, etc.)
   - See real-time class availability
   - Automatic conflict detection

2. **Submit Enrollment Requests**
   - Request enrollment for any of their students
   - Add notes to requests
   - Receive validation feedback:
     - Schedule conflicts with existing classes
     - Age eligibility warnings
     - Class capacity status
   - Automatic waitlist handling for full classes

3. **Manage Enrollments** (`/parent/enrollments`)
   - View all enrollment requests by status:
     - Pending: Awaiting staff approval
     - Approved: Request approved (student enrolled)
     - Denied: Request rejected with reason
     - Waitlist: Class is full
     - Cancelled: Parent cancelled request
   - Cancel pending/waitlist requests
   - View active enrollments per student
   - See enrollment history timeline

4. **Enrollment History**
   - Complete audit trail of all enrollment actions
   - Track state changes (requested → approved → enrolled → dropped)
   - See who performed each action

5. **Dashboard Integration**
   - Quick action cards for browsing classes and managing enrollments
   - Pending requests counter in stats
   - Action items for pending/approved requests

### ✅ For Staff/Admin

1. **Review Enrollment Requests** (`/enrollment-requests`)
   - View all enrollment requests across all students
   - Filter by status (pending, approved, denied, waitlist, cancelled)
   - See summary statistics
   - View detailed student, guardian, and class information

2. **Approve/Deny Requests**
   - Approve requests to enroll students
   - Automatic enrollment creation on approval
   - Automatic waitlist handling if class is full
   - Deny requests with required reason
   - Add admin notes (internal)

3. **Validation & Warnings**
   - Age eligibility checks
   - Class capacity warnings
   - Schedule conflict alerts
   - Complete conflict details from initial request

4. **Notifications**
   - Queue notifications for parents when requests are processed
   - Track notification delivery status

---

## Database Schema

### New Tables

#### `enrollment_requests`
Primary table for storing enrollment requests with approval workflow.

**Fields:**
- `id` - UUID primary key
- `student_id` - FK to students
- `class_instance_id` - FK to class_instances
- `guardian_id` - FK to guardians
- `status` - pending | approved | denied | cancelled | waitlist
- `requested_at` - Request timestamp
- `processed_at` - Processing timestamp
- `processed_by` - FK to profiles (staff who processed)
- `notes` - Parent's notes
- `admin_notes` - Staff notes (internal)
- `denial_reason` - Reason if denied
- `has_schedule_conflict` - Boolean flag
- `conflict_details` - JSONB with conflict information

**Indexes:**
- `student_id`, `class_instance_id`, `guardian_id`, `status`, `requested_at`

**Constraints:**
- Unique constraint on (student_id, class_instance_id, status) where status IN ('pending', 'approved', 'waitlist')

#### `enrollment_history`
Complete audit trail of all enrollment-related state changes.

**Fields:**
- `id` - UUID primary key
- `enrollment_id` - FK to enrollments (nullable)
- `enrollment_request_id` - FK to enrollment_requests (nullable)
- `student_id` - FK to students
- `class_instance_id` - FK to class_instances
- `action` - requested | approved | denied | enrolled | dropped | waitlist_added | cancelled
- `previous_status` - Previous state
- `new_status` - New state
- `performed_by` - FK to profiles
- `performed_by_role` - parent | staff | admin | system
- `notes` - Action notes
- `metadata` - JSONB for action-specific data
- `created_at` - Timestamp

**Triggers:**
- Auto-creates history entries when enrollment requests change status
- Auto-creates history entries when enrollments change status

#### `enrollment_notifications`
Queue for enrollment-related notifications to parents.

**Fields:**
- `id` - UUID primary key
- `enrollment_request_id` - FK to enrollment_requests
- `guardian_id` - FK to guardians
- `notification_type` - request_received | approved | denied | waitlist_added | etc.
- `status` - pending | sent | failed | cancelled
- `subject` - Email subject
- `message` - Email body
- `metadata` - JSONB with additional data
- `sent_at` - Delivery timestamp
- `failed_at` - Failure timestamp
- `failure_reason` - Error details
- `retry_count` - Number of retry attempts

---

## API Endpoints

### Parent Endpoints

#### `POST /api/parent/enrollment-requests`
Create a new enrollment request.

**Request Body:**
```json
{
  "student_id": "uuid",
  "class_instance_id": "uuid",
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "message": "Enrollment request created successfully",
  "enrollmentRequest": { ... },
  "validation": {
    "canEnroll": true,
    "requiresWaitlist": false,
    "conflicts": [],
    "warnings": []
  }
}
```

**Validations:**
- Guardian-student relationship
- No duplicate requests
- No existing enrollments
- Student age vs class age range
- Schedule conflicts with current enrollments
- Class capacity

#### `GET /api/parent/enrollment-requests`
Get all enrollment requests for guardian's students.

**Response:**
```json
{
  "enrollmentRequests": [...],
  "total": 5
}
```

#### `PATCH /api/parent/enrollment-requests/:id`
Cancel a pending enrollment request.

**Request Body:**
```json
{
  "action": "cancel"
}
```

#### `GET /api/parent/enrollment-history/:studentId`
Get enrollment history for a student.

**Response:**
```json
{
  "enrollmentHistory": [...],
  "total": 12
}
```

### Staff/Admin Endpoints

#### `GET /api/staff/enrollment-requests`
Get all enrollment requests (with optional filters).

**Query Parameters:**
- `status` - Filter by status
- `class_instance_id` - Filter by class

**Response:**
```json
{
  "enrollmentRequests": [...],
  "summary": {
    "total": 25,
    "pending": 10,
    "approved": 8,
    "denied": 2,
    "waitlist": 3,
    "cancelled": 2
  }
}
```

#### `PATCH /api/staff/enrollment-requests/:id`
Approve or deny an enrollment request.

**Request Body (Approve):**
```json
{
  "action": "approve",
  "admin_notes": "Optional notes"
}
```

**Request Body (Deny):**
```json
{
  "action": "deny",
  "denial_reason": "Required reason",
  "admin_notes": "Optional internal notes"
}
```

**Behavior on Approve:**
- If class has capacity: Creates active enrollment
- If class is full: Moves request to waitlist status
- Creates notification for parent
- Records in enrollment history

---

## Utilities & Services

### `utils/student-conflict-checker.ts`

Comprehensive conflict checking for student enrollments:

**Functions:**
- `checkStudentScheduleConflicts()` - Detect time overlaps with existing classes
- `checkAgeRequirements()` - Validate student age vs class age range
- `checkClassCapacity()` - Check if class has available spots
- `validateEnrollmentRequest()` - Complete validation combining all checks
- `getStudentWeeklySchedule()` - Get organized weekly schedule

**Conflict Types:**
- `time_overlap` - Student already has a class at this time
- `duplicate_enrollment` - Student already enrolled in this class
- `age_restriction` - Student doesn't meet age requirements

**Warnings:**
- `back_to_back` - Classes are consecutive (not blocking)
- `same_day_multiple` - Student has many classes on same day
- `max_classes_exceeded` - Student has more than recommended class count

### `composables/useEnrollmentService.ts`

Centralized service for all enrollment operations:

**Functions:**
- `createEnrollmentRequest()` - Submit new request
- `getEnrollmentRequests()` - Fetch parent's requests
- `cancelEnrollmentRequest()` - Cancel pending request
- `getStaffEnrollmentRequests()` - Staff view all requests
- `approveEnrollmentRequest()` - Approve request
- `denyEnrollmentRequest()` - Deny request
- `getEnrollmentHistory()` - Get student history
- `getAvailableClasses()` - Browse available classes

**Helpers:**
- `formatStatus()`, `getStatusSeverity()`, `formatDayOfWeek()`, `formatTime()`

---

## UI Components & Pages

### Parent Pages

#### `/parent/classes`
**Class Browsing Page**

Features:
- Student selector (required to view classes)
- Filters: Dance style, level, day of week, age-appropriate toggle
- Class cards showing:
  - Dance style (color-coded)
  - Level, teacher, schedule, duration
  - Age range
  - Capacity (available spots / full status)
  - Enrollment status if already enrolled/requested
- Enrollment dialog with:
  - Class summary
  - Conflict warnings
  - Notes field
  - Waitlist notice if class is full

#### `/parent/enrollments`
**Enrollment Management Page**

Tabs:
1. **Enrollment Requests**
   - All requests grouped by status
   - Status badges (pending, approved, denied, waitlist, cancelled)
   - Class and request details
   - Admin notes and denial reasons visible
   - Cancel button for pending/waitlist requests

2. **Active Enrollments**
   - Student filter dropdown
   - Enrollments grouped by student
   - Class cards with schedule info
   - View history button per enrollment

Dialogs:
- Cancel confirmation
- Enrollment history timeline

#### `/parent/dashboard` (Updated)
**Enhanced Parent Dashboard**

New Features:
- **Quick Action Cards:**
  - Browse Classes (blue gradient)
  - Manage Enrollments (purple gradient)
- **Updated Stats:**
  - Pending Requests counter added
- **Action Items:**
  - Pending enrollment requests
  - Approved enrollment requests

### Staff/Admin Pages

#### `/enrollment-requests`
**Enrollment Request Approval Page**

Features:
- **Summary Cards:** Pending, Waitlist, Approved, Denied, Total counts
- **Filters:** Status filter, refresh button
- **Request Cards:**
  - Student info (name, age)
  - Guardian info (name, email, phone)
  - Class details (style, level, teacher, schedule, capacity)
  - Request details (requested date, notes)
  - Validation warnings (age, capacity, conflicts)
  - Action buttons (Approve, Deny, Details)
- **Approve Dialog:**
  - Confirmation message
  - Waitlist warning if class is full
  - Admin notes field
- **Deny Dialog:**
  - Required denial reason
  - Optional admin notes
  - Parent notification notice
- **Details Dialog:**
  - Complete student/guardian information
  - Full conflict details
  - All notes and processing info

---

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

### `enrollment_requests`
- **Parents:**
  - SELECT: Own guardian's requests
  - INSERT: For their own students
  - UPDATE: Cancel their pending requests
- **Staff/Admin:**
  - SELECT: All requests
  - UPDATE: All requests (approve/deny)

### `enrollment_history`
- **Parents:**
  - SELECT: History for their students
- **Staff/Admin:**
  - SELECT: All history
- **System:**
  - INSERT: Via triggers

### `enrollment_notifications`
- **Parents:**
  - SELECT: Their own notifications
- **Staff:**
  - SELECT: All notifications
- **System:**
  - INSERT/UPDATE: Notification processing

---

## Navigation Updates

### Parent Sidebar
Added "Enrollment" section with:
- Browse Classes (`/parent/classes`)
- My Enrollments (`/parent/enrollments`)

### Staff/Admin Sidebar
Added "Enrollment" section with:
- Enrollment Requests (`/enrollment-requests`)

---

## Testing Checklist

### Parent User Flow
- [ ] Browse classes with various filters
- [ ] Select different students and see age-appropriate filtering
- [ ] Submit enrollment request for eligible class
- [ ] Submit request for class that causes schedule conflict (verify warning)
- [ ] Submit request for full class (verify waitlist handling)
- [ ] Try to submit duplicate request (verify prevention)
- [ ] View enrollment requests list
- [ ] Cancel pending request
- [ ] View enrollment history

### Staff User Flow
- [ ] View enrollment requests page
- [ ] Filter by different statuses
- [ ] View request details
- [ ] Approve request for class with capacity
- [ ] Approve request for full class (verify waitlist behavior)
- [ ] Deny request with reason
- [ ] Verify notifications are created
- [ ] Check enrollment history shows all actions

### Edge Cases
- [ ] Student age outside class range
- [ ] Multiple back-to-back classes warning
- [ ] Student with many classes warning
- [ ] Concurrent enrollment requests
- [ ] Request for inactive/deleted class
- [ ] Guardian without students

---

## Future Enhancements

1. **Email Notifications:**
   - Background job to process notification queue
   - Mailgun integration for sending emails
   - Email templates for different notification types

2. **Automatic Waitlist Promotion:**
   - When student drops from full class
   - Automatically offer spot to next waitlist student
   - Notification to waitlisted parent

3. **Payment Integration:**
   - Class fees
   - Payment required before enrollment approval
   - Monthly tuition billing

4. **Prerequisites:**
   - Skill level requirements
   - Required classes before advanced classes

5. **Bulk Operations:**
   - Staff approve/deny multiple requests at once
   - Export enrollment request data

6. **Parent Communication:**
   - In-app messaging for request questions
   - Request clarification before approval

7. **Enrollment Periods:**
   - Open/close enrollment for specific terms
   - Early bird enrollment windows
   - Registration priority by student level

---

## Database Migration

To apply the database schema changes:

1. Navigate to Supabase SQL Editor
2. Open `/docs/database/enrollment-requests-migration.sql`
3. Execute the entire migration script
4. Verify all tables, triggers, and policies were created

**Tables Created:**
- `enrollment_requests`
- `enrollment_history`
- `enrollment_notifications`

**Triggers Created:**
- `enrollment_requests_updated_at` - Auto-update timestamps
- `enrollment_notifications_updated_at` - Auto-update timestamps
- `enrollment_request_history_trigger` - Auto-create history
- `enrollment_history_trigger` - Auto-create enrollment history

**RLS Policies:**
- 9 policies for enrollment_requests
- 3 policies for enrollment_history
- 4 policies for enrollment_notifications

---

## File Structure

```
/server/api/
  /parent/
    /enrollment-requests/
      index.get.ts          # Get parent's requests
      index.post.ts         # Create request
      [id].patch.ts         # Cancel request
    /enrollment-history/
      [studentId].get.ts    # Get student history
  /staff/
    /enrollment-requests/
      index.get.ts          # Get all requests (staff)
      [id].patch.ts         # Approve/deny request

/composables/
  useEnrollmentService.ts   # Enrollment API service

/utils/
  student-conflict-checker.ts # Conflict detection

/pages/
  /parent/
    classes.vue             # Browse & enroll page
    enrollments.vue         # Manage enrollments page
    dashboard.vue           # Updated with enrollment links
  enrollment-requests.vue   # Staff approval page

/components/
  AppSidebar.vue            # Updated navigation

/docs/
  /database/
    enrollment-requests-migration.sql  # Database migration
  /features/
    parent-class-enrollment.md         # This document
```

---

## Support

For questions or issues with the enrollment feature:
1. Check this documentation first
2. Review the database migration script for schema details
3. Check API endpoint documentation above
4. Review enrollment history for audit trails

---

**Last Updated:** November 6, 2025
**Feature Status:** ✅ Complete and Ready for Testing
