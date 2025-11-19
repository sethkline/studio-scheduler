# Rehearsal Management System - Implementation Guide

## Overview

The Rehearsal Management System allows studio administrators and teachers to schedule, track, and manage all rehearsals leading up to a recital performance. This includes tech rehearsals, dress rehearsals, class rehearsals, and full run-throughs.

**Priority:** Tier 1 - Critical for Next Recital

---

## Business Requirements

### User Stories

**As an Admin/Staff member, I want to:**
- Schedule different types of rehearsals (tech, dress, stage, class, full)
- Assign specific classes/performances to rehearsal time slots
- Track which students attend each rehearsal
- Record notes and feedback for each rehearsal
- Share rehearsal videos with parents and students
- See attendance patterns to identify students who need reminders

**As a Teacher, I want to:**
- View my rehearsal schedule
- Take attendance quickly
- Add performance notes and feedback
- Upload reference videos for students

**As a Parent, I want to:**
- See my child's rehearsal schedule with call times
- View attendance history
- Access rehearsal videos and notes
- Receive reminders about upcoming rehearsals

---

## Database Schema

### Tables to Create

#### 1. `recital_rehearsals`
Main rehearsal schedule table.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recital_id | uuid | FK to recitals |
| rehearsal_type | varchar(50) | 'tech', 'dress', 'stage', 'class', 'full' |
| name | varchar(255) | Rehearsal name (e.g., "Tech Rehearsal - Show A") |
| description | text | Additional details |
| rehearsal_date | date | Date of rehearsal |
| start_time | time | Start time |
| end_time | time | End time |
| location | varchar(255) | Venue name |
| room_id | uuid | FK to studio_rooms (optional) |
| notes | text | General notes |
| requires_costumes | boolean | Do students need costumes? |
| requires_props | boolean | Do students need props? |
| requires_tech | boolean | Is technical crew needed? |
| parents_allowed | boolean | Can parents watch? |
| status | varchar(50) | 'scheduled', 'in_progress', 'completed', 'cancelled' |
| created_by | uuid | FK to profiles |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

**Indexes:**
- recital_id
- rehearsal_date
- status

---

#### 2. `rehearsal_participants`
Links specific classes or performances to rehearsals.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| rehearsal_id | uuid | FK to recital_rehearsals |
| class_instance_id | uuid | FK to class_instances (nullable) |
| recital_performance_id | uuid | FK to recital_performances (nullable) |
| call_time | time | When to arrive |
| expected_duration | integer | Minutes allocated |
| performance_order | integer | Order in rehearsal |
| notes | text | Participant-specific notes |

**Constraint:** At least one of class_instance_id OR recital_performance_id must be set.

**Indexes:**
- rehearsal_id
- class_instance_id
- recital_performance_id

---

#### 3. `rehearsal_attendance`
Tracks individual student attendance.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| rehearsal_id | uuid | FK to recital_rehearsals |
| student_id | uuid | FK to students |
| status | varchar(50) | 'expected', 'present', 'absent', 'excused', 'late' |
| check_in_time | timestamptz | When student checked in |
| check_out_time | timestamptz | When student left |
| notes | text | Attendance notes |
| teacher_feedback | text | Performance feedback |

**Unique Constraint:** (rehearsal_id, student_id)

**Indexes:**
- rehearsal_id
- student_id

---

#### 4. `rehearsal_resources`
Videos, audio files, documents for rehearsals.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| rehearsal_id | uuid | FK to recital_rehearsals |
| resource_type | varchar(50) | 'video', 'audio', 'document', 'image', 'link' |
| title | varchar(255) | Resource title |
| description | text | Description |
| file_path | varchar(500) | Supabase storage path |
| file_url | text | External URL (for links) |
| file_size | integer | Size in bytes |
| file_type | varchar(100) | MIME type |
| is_public | boolean | Public visibility |
| visible_to_parents | boolean | Parent access |
| uploaded_by | uuid | FK to profiles |
| uploaded_at | timestamptz | Upload time |

**Indexes:**
- rehearsal_id

---

## API Endpoints

### Admin/Staff Endpoints

#### `POST /api/recitals/[id]/rehearsals`
Create a new rehearsal.

**Request Body:**
```json
{
  "rehearsal_type": "dress",
  "name": "Dress Rehearsal - Show A",
  "description": "Full run with costumes",
  "rehearsal_date": "2025-05-15",
  "start_time": "09:00",
  "end_time": "14:00",
  "location": "Main Theater",
  "requires_costumes": true,
  "requires_props": true,
  "requires_tech": true,
  "parents_allowed": false,
  "participants": [
    {
      "class_instance_id": "uuid",
      "call_time": "09:30",
      "expected_duration": 15,
      "performance_order": 1
    }
  ]
}
```

---

#### `GET /api/recitals/[id]/rehearsals`
List all rehearsals for a recital.

**Query Params:**
- `type` - Filter by rehearsal_type
- `date_from` - Filter start date
- `date_to` - Filter end date
- `status` - Filter by status

**Response:**
```json
{
  "rehearsals": [
    {
      "id": "uuid",
      "name": "Dress Rehearsal - Show A",
      "rehearsal_type": "dress",
      "rehearsal_date": "2025-05-15",
      "start_time": "09:00",
      "end_time": "14:00",
      "location": "Main Theater",
      "participant_count": 12,
      "expected_attendance": 45,
      "actual_attendance": 42,
      "status": "completed"
    }
  ]
}
```

---

#### `PUT /api/rehearsals/[id]`
Update rehearsal details.

---

#### `DELETE /api/rehearsals/[id]`
Cancel/delete a rehearsal.

---

#### `POST /api/rehearsals/[id]/participants`
Add participants to rehearsal.

---

#### `GET /api/rehearsals/[id]/attendance`
Get attendance list for rehearsal.

**Response:**
```json
{
  "rehearsal": {
    "id": "uuid",
    "name": "Dress Rehearsal",
    "date": "2025-05-15",
    "start_time": "09:00"
  },
  "attendance": [
    {
      "student_id": "uuid",
      "student_name": "Emma Smith",
      "class_name": "Ballet 3",
      "call_time": "09:30",
      "status": "present",
      "check_in_time": "2025-05-15T09:28:00Z",
      "teacher_feedback": "Great energy!"
    }
  ],
  "summary": {
    "expected": 45,
    "present": 42,
    "absent": 2,
    "excused": 1,
    "late": 3
  }
}
```

---

#### `POST /api/rehearsals/[id]/attendance/check-in`
Record student check-in.

**Request:**
```json
{
  "student_id": "uuid",
  "check_in_time": "2025-05-15T09:28:00Z",
  "notes": "Arrived on time"
}
```

---

#### `POST /api/rehearsals/[id]/attendance/bulk`
Bulk update attendance (mark all present, etc.)

---

#### `POST /api/rehearsals/[id]/resources`
Upload rehearsal resource.

---

#### `GET /api/rehearsals/[id]/resources`
Get all resources for rehearsal.

---

### Parent Endpoints

#### `GET /api/parent/students/[id]/rehearsals`
Get rehearsal schedule for a student.

**Response:**
```json
{
  "upcoming_rehearsals": [
    {
      "id": "uuid",
      "name": "Dress Rehearsal",
      "rehearsal_type": "dress",
      "date": "2025-05-15",
      "call_time": "09:30",
      "location": "Main Theater",
      "requires_costumes": true,
      "parents_allowed": false,
      "notes": "Please arrive 15 minutes early"
    }
  ],
  "past_rehearsals": [
    {
      "id": "uuid",
      "name": "Class Rehearsal",
      "date": "2025-05-01",
      "attendance_status": "present",
      "teacher_feedback": "Excellent performance!"
    }
  ]
}
```

---

#### `GET /api/parent/rehearsals/[id]`
Get rehearsal details visible to parents.

---

#### `GET /api/parent/rehearsals/[id]/resources`
Get parent-visible resources.

---

## UI Components & Pages

### Admin Pages

#### `/recitals/[id]/rehearsals`
Main rehearsal management page.

**Features:**
- Calendar view of all rehearsals
- List view with filters
- Create new rehearsal button
- Quick stats (total rehearsals, completed, upcoming)

**Components:**
- `RehearsalCalendar.vue` - Full calendar display
- `RehearsalList.vue` - Table view
- `RehearsalFilters.vue` - Filter controls

---

#### `/recitals/[id]/rehearsals/create`
Create rehearsal wizard.

**Steps:**
1. Basic Info (type, name, date, time, location)
2. Logistics (costumes, props, tech, parents allowed)
3. Add Participants (select classes/performances, set call times)
4. Review & Create

**Component:**
- `CreateRehearsalWizard.vue`

---

#### `/rehearsals/[id]`
Rehearsal detail page.

**Sections:**
- Header with rehearsal info and status
- Participant list with call times
- Attendance tracker
- Notes section
- Resources section
- Action buttons (Edit, Cancel, Mark Complete)

**Components:**
- `RehearsalDetailPage.vue`
- `RehearsalParticipantsList.vue`
- `RehearsalAttendanceTracker.vue`
- `RehearsalNotesEditor.vue`
- `RehearsalResourcesManager.vue`

---

#### `/rehearsals/[id]/attendance`
Dedicated attendance tracking page (mobile-friendly).

**Features:**
- Large check-in buttons
- Quick search by student name
- Barcode scanner support (future)
- Bulk actions (mark all present, etc.)
- Real-time attendance count

**Component:**
- `RehearsalCheckInPage.vue` - Mobile-optimized

---

### Parent Pages

#### `/parent/students/[id]/rehearsals`
Student-specific rehearsal schedule.

**Features:**
- Upcoming rehearsals with countdown
- Call time prominently displayed
- Costume/prop requirements
- Past rehearsal attendance
- Teacher feedback
- Access to rehearsal videos

**Component:**
- `ParentRehearsalSchedule.vue`

---

#### `/parent/rehearsals/[id]`
Rehearsal detail for parents.

**Shows:**
- Date, time, location
- What to bring
- Call time
- Parking info
- Contact information
- Resources (if visible to parents)

**Component:**
- `ParentRehearsalDetail.vue`

---

## User Flows

### Flow 1: Admin Creates Dress Rehearsal

1. Admin navigates to `/recitals/[id]/rehearsals`
2. Clicks "Create Rehearsal" button
3. Selects rehearsal type: "Dress Rehearsal"
4. Fills in:
   - Name: "Dress Rehearsal - Show A"
   - Date: May 15, 2025
   - Time: 9:00 AM - 2:00 PM
   - Location: Main Theater
   - Checkboxes: Requires costumes ✓, Requires props ✓
5. Clicks "Next" to add participants
6. Selects classes from list:
   - Ballet 3 (call time 9:30, 15 min duration)
   - Jazz 2 (call time 9:45, 12 min duration)
   - Tap 4 (call time 10:00, 15 min duration)
7. Reviews and clicks "Create Rehearsal"
8. System:
   - Creates rehearsal record
   - Creates participant records
   - Auto-generates attendance records for all enrolled students
   - Sends notification to parents (future)
9. Admin sees success message and new rehearsal in calendar

---

### Flow 2: Teacher Takes Attendance

1. Teacher navigates to `/rehearsals/[id]/attendance`
2. Sees list of expected students grouped by class
3. As students arrive, teacher taps student name or scans barcode
4. System records check-in time and marks status "present"
5. Real-time counter updates (42/45 present)
6. Teacher can add notes for individual students
7. At end, teacher reviews:
   - 2 absent (marks as "excused" with reason)
   - 3 late arrivals
8. Teacher clicks "Complete Attendance"
9. System saves all records and calculates final stats

---

### Flow 3: Parent Views Rehearsal Schedule

1. Parent logs in to portal
2. Navigates to "My Dancers" → Emma's profile
3. Clicks "Rehearsals" tab
4. Sees upcoming rehearsal card:
   - **Dress Rehearsal - Show A**
   - May 15, 2025 (4 days away)
   - Call Time: 9:30 AM
   - Location: Main Theater
   - 🎭 Bring costumes
   - 🚫 Parents not allowed backstage
5. Clicks on rehearsal for full details
6. Views:
   - Arrival instructions
   - What to bring checklist
   - Parking information
   - Contact person
7. Adds to calendar via button
8. Receives SMS reminder 24 hours before (future)

---

## Implementation Steps

### Phase 1: Database & API (Week 1)

1. ✅ Create database migration
   - Run migration to create all 4 tables
   - Add indexes and constraints
   - Test RLS policies

2. ✅ Create TypeScript types
   - File: `/types/rehearsals.ts`
   - Define all interfaces

3. ✅ Build API endpoints
   - Start with CRUD for rehearsals
   - Add participant management
   - Add attendance tracking
   - Add resources upload

4. ✅ Test API with Postman/curl

---

### Phase 2: Admin UI (Week 2)

1. Create rehearsal list page
   - Calendar view
   - List view with filters
   - Stats cards

2. Build create rehearsal wizard
   - Multi-step form
   - Validation
   - Participant selection

3. Build rehearsal detail page
   - All sections
   - Edit capability
   - Status management

4. Build attendance tracker
   - Mobile-friendly check-in
   - Bulk operations
   - Notes and feedback

5. Build resource manager
   - File upload
   - Video playback
   - Access controls

---

### Phase 3: Parent UI (Week 3)

1. Parent rehearsal schedule
   - Upcoming rehearsals
   - Past rehearsals with feedback
   - Attendance history

2. Rehearsal detail for parents
   - Read-only view
   - Resource access
   - Add to calendar

3. Integration with parent dashboard
   - Show upcoming rehearsals
   - Alert for missing attendance

---

### Phase 4: Enhancements (Week 4)

1. Email notifications
   - Rehearsal created
   - 24-hour reminder
   - Attendance feedback shared

2. SMS notifications (optional)
   - Urgent reminders
   - Late arrival alerts

3. Barcode/QR scanning
   - Generate student QR codes
   - Scanner component
   - Quick check-in

4. Analytics dashboard
   - Attendance trends
   - Student participation rates
   - Rehearsal completion stats

---

## Dependencies

### Existing Features/Tables
- `recitals` - Parent recital record
- `class_instances` - Classes performing
- `recital_performances` - Individual performances
- `students` - Student records
- `studio_rooms` - Venue/room data
- `profiles` - User accounts

### External Services
- Supabase Storage - For video/file uploads
- Email service (Mailgun) - Notifications
- SMS service (optional) - Urgent alerts

### New Packages Needed
- None (all existing packages sufficient)

---

## Testing Checklist

### Database
- [ ] All tables created successfully
- [ ] Indexes improve query performance
- [ ] RLS policies work correctly for each role
- [ ] Triggers update timestamps
- [ ] Unique constraints prevent duplicates

### API
- [ ] Create rehearsal returns 201
- [ ] List rehearsals filters correctly
- [ ] Update rehearsal works
- [ ] Delete rehearsal cascades properly
- [ ] Attendance check-in updates status
- [ ] Resource upload works
- [ ] Parent endpoints return filtered data

### UI - Admin
- [ ] Calendar displays rehearsals
- [ ] Create wizard validates input
- [ ] Participant selection works
- [ ] Attendance tracker updates real-time
- [ ] Resource upload succeeds
- [ ] Edit rehearsal saves changes

### UI - Parent
- [ ] Rehearsal list shows correct data
- [ ] Detail page displays all info
- [ ] Resources are viewable
- [ ] Add to calendar works
- [ ] Attendance history accurate

### Permissions
- [ ] Admin can create/edit/delete rehearsals
- [ ] Staff can create/edit/delete rehearsals
- [ ] Teachers can view and take attendance
- [ ] Parents can only view their children's info
- [ ] Students cannot access rehearsal management

---

## Success Metrics

- **Admin Efficiency:** Reduce rehearsal setup time by 60%
- **Attendance Accuracy:** 95%+ accurate attendance tracking
- **Parent Satisfaction:** 80%+ parents report improved communication
- **Teacher Adoption:** 90%+ teachers use attendance tracker
- **Resource Usage:** 50%+ rehearsals have video resources

---

## Future Enhancements

1. **Automatic Rehearsal Scheduling**
   - AI suggests optimal rehearsal times
   - Conflict detection
   - Resource availability check

2. **Rehearsal Templates**
   - Save common rehearsal setups
   - One-click create from template

3. **Performance Metrics**
   - Track improvement over rehearsals
   - Identify students needing extra help

4. **Live Rehearsal Updates**
   - Real-time progress updates for parents
   - "Now rehearsing: Ballet 3"

5. **Video Analysis**
   - Side-by-side comparison of rehearsals
   - Annotate videos with feedback

6. **Integration with Google Calendar**
   - Auto-sync rehearsals
   - Two-way sync

---

## Questions for Stakeholders

1. Do we need to track technical crew separately (lighting, sound)?
2. Should parents receive automatic reminders? How many days before?
3. Do we need to track rehearsal space conflicts?
4. Should there be a maximum file size for video uploads?
5. Do we need to track costume/prop inventory check-out for rehearsals?
6. Should teachers be able to create their own class rehearsals?
7. Do we need emergency contact quick-dial during rehearsals?

---

## Estimated Effort

- **Database & API:** 16 hours
- **Admin UI:** 32 hours
- **Parent UI:** 16 hours
- **Testing & Bug Fixes:** 16 hours
- **Documentation:** 8 hours

**Total:** ~88 hours (~11 days for one developer)

---

## Related Features

- **Task Management** - Create tasks for "Schedule dress rehearsal"
- **Email System** - Send rehearsal reminders
- **Parent Portal** - Display rehearsal info
- **Calendar Integration** - Show rehearsals on studio calendar
