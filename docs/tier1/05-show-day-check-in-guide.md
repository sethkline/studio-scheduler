# Show-Day Check-In System - Implementation Guide

## Overview

The Show-Day Check-In System provides a streamlined, mobile-friendly interface for tracking student arrivals, managing dressing room assignments, coordinating quick changes, and maintaining a real-time dashboard of performer status on the day of the recital.

**Priority:** Tier 1 - Critical for Next Recital

---

## Business Requirements

### User Stories

**As a Staff Member on Show Day, I want to:**
- Quickly check in students as they arrive
- See which students have arrived vs. who's missing
- Assign students to dressing rooms
- Track costume changes and quick-change needs
- See the lineup for who's on-stage, on-deck, and coming up
- Send alerts to parents if students haven't arrived
- Access emergency contact info quickly
- View the show timeline in real-time

**As a Stage Manager, I want to:**
- See which performances are coming up next
- Know which students are ready backstage
- Track costume quick-changes
- Coordinate performer flow
- Alert staff of any issues

**As a Parent, I want to:**
- Get confirmation when my child checks in
- Know where to drop off my child
- Be notified if there's an issue

---

## Database Schema

### Tables to Create

#### 1. `show_day_check_ins`
Main check-in tracking table.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recital_show_id | uuid | FK to recital_shows |
| student_id | uuid | FK to students |
| check_in_time | timestamptz | When student arrived |
| checked_in_by | uuid | FK to profiles (staff member) |
| check_in_method | varchar(50) | 'manual', 'qr_code', 'barcode', 'name_search' |
| dressing_room_id | uuid | FK to dressing_rooms |
| arrival_status | varchar(50) | 'on_time', 'early', 'late', 'very_late' |
| has_all_costumes | boolean | Brought all costumes? |
| missing_items | text | What's missing |
| guardian_present | boolean | Parent still here? |
| guardian_contact | varchar(255) | Contact if needed |
| notes | text | Check-in notes |
| is_ready | boolean | Ready for performance |
| check_out_time | timestamptz | When student left |
| checked_out_by | uuid | FK to profiles |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Unique Constraint:** (recital_show_id, student_id)

**Indexes:**
- recital_show_id
- student_id
- check_in_time
- dressing_room_id

---

#### 2. `dressing_rooms`
Dressing room configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recital_show_id | uuid | FK to recital_shows |
| room_name | varchar(255) | "Room A", "Girls Dressing Room 1" |
| room_number | varchar(50) | Room number/identifier |
| capacity | integer | Max students |
| age_group | varchar(50) | 'young', 'middle', 'teen', 'adult', 'all' |
| notes | text | Special instructions |
| assigned_staff | uuid[] | Array of profile IDs |
| is_active | boolean | Currently in use |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Indexes:**
- recital_show_id

---

#### 3. `performer_lineup`
Real-time performance lineup tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recital_show_id | uuid | FK to recital_shows |
| recital_performance_id | uuid | FK to recital_performances |
| performance_order | integer | Order in show |
| performance_status | varchar(50) | 'upcoming', 'on_deck', 'on_stage', 'completed' |
| scheduled_time | time | Scheduled performance time |
| actual_start_time | timestamptz | When performance started |
| actual_end_time | timestamptz | When performance ended |
| all_performers_ready | boolean | All students accounted for |
| missing_performers | uuid[] | Array of student IDs not ready |
| notes | text | Lineup notes |
| updated_by | uuid | FK to profiles |
| updated_at | timestamptz | Last update |

**Indexes:**
- recital_show_id
- performance_order
- performance_status

---

#### 4. `quick_change_alerts`
Tracks costume quick-changes.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recital_show_id | uuid | FK to recital_shows |
| student_id | uuid | FK to students |
| from_performance_id | uuid | FK to recital_performances |
| to_performance_id | uuid | FK to recital_performances |
| time_between_minutes | integer | Minutes between performances |
| is_critical | boolean | Very tight timing |
| assigned_helper | uuid | FK to profiles (who helps) |
| quick_change_location | varchar(255) | Where to change |
| status | varchar(50) | 'planned', 'in_progress', 'completed', 'issue' |
| notes | text | Quick change notes |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Indexes:**
- recital_show_id
- student_id
- is_critical

---

#### 5. `show_day_alerts`
Urgent alerts and notifications.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recital_show_id | uuid | FK to recital_shows |
| alert_type | varchar(50) | 'missing_student', 'missing_costume', 'injury', 'equipment', 'delay', 'other' |
| severity | varchar(50) | 'low', 'medium', 'high', 'critical' |
| title | varchar(255) | Alert title |
| description | text | Alert details |
| affected_students | uuid[] | Array of student IDs |
| affected_performances | uuid[] | Array of performance IDs |
| is_resolved | boolean | Has been resolved |
| created_by | uuid | FK to profiles |
| resolved_by | uuid | FK to profiles |
| resolved_at | timestamptz | When resolved |
| resolution_notes | text | How resolved |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Indexes:**
- recital_show_id
- alert_type
- is_resolved
- created_at

---

## API Endpoints

### Check-In Endpoints

#### `POST /api/shows/[id]/check-in`
Check in a student.

**Request:**
```json
{
  "student_id": "uuid",
  "check_in_method": "qr_code",
  "dressing_room_id": "uuid",
  "has_all_costumes": true,
  "missing_items": null,
  "guardian_contact": "555-1234",
  "notes": "Student arrived on time and ready"
}
```

**Response:**
```json
{
  "check_in": {
    "id": "uuid",
    "student_name": "Emma Smith",
    "check_in_time": "2025-05-17T17:45:00Z",
    "dressing_room": "Girls Room 1",
    "arrival_status": "on_time",
    "performances": [
      {
        "performance_name": "Opening Number",
        "scheduled_time": "19:15",
        "time_until": "1 hour 30 minutes"
      }
    ]
  },
  "show_status": {
    "checked_in_count": 45,
    "total_expected": 52,
    "percentage": 86.5
  }
}
```

---

#### `GET /api/shows/[id]/check-in-status`
Get overall check-in status.

**Response:**
```json
{
  "show": {
    "id": "uuid",
    "name": "Spring Recital - Show A",
    "date": "2025-05-17",
    "start_time": "19:00"
  },
  "summary": {
    "total_performers": 52,
    "checked_in": 45,
    "not_checked_in": 7,
    "checked_in_percentage": 86.5,
    "time_until_show": "1 hour 15 minutes"
  },
  "checked_in_students": [
    {
      "student_id": "uuid",
      "student_name": "Emma Smith",
      "check_in_time": "17:45",
      "dressing_room": "Girls Room 1",
      "is_ready": true
    }
  ],
  "not_checked_in_students": [
    {
      "student_id": "uuid",
      "student_name": "Sophia Johnson",
      "guardian_name": "Jane Johnson",
      "guardian_phone": "555-9999",
      "performances": ["Opening Number", "Ballet Solo"],
      "first_performance_time": "19:15",
      "should_arrive_by": "18:30"
    }
  ],
  "by_dressing_room": [
    {
      "room_name": "Girls Room 1",
      "capacity": 20,
      "current_count": 15,
      "students": [...]
    }
  ]
}
```

---

#### `POST /api/shows/[id]/check-out`
Check out a student (when leaving).

---

#### `GET /api/shows/[id]/missing-students`
Get list of students who haven't checked in.

---

#### `POST /api/shows/[id]/send-missing-alerts`
Send SMS/call to parents of missing students.

---

### Dressing Room Endpoints

#### `POST /api/shows/[id]/dressing-rooms`
Create dressing room configuration.

**Request:**
```json
{
  "room_name": "Girls Dressing Room 1",
  "room_number": "A-101",
  "capacity": 20,
  "age_group": "young",
  "assigned_staff": ["uuid1", "uuid2"]
}
```

---

#### `GET /api/shows/[id]/dressing-rooms`
Get all dressing rooms with current occupancy.

**Response:**
```json
{
  "dressing_rooms": [
    {
      "id": "uuid",
      "room_name": "Girls Room 1",
      "capacity": 20,
      "current_count": 15,
      "availability": 5,
      "students": [
        {
          "student_name": "Emma Smith",
          "age": 10,
          "performances_count": 2,
          "next_performance_time": "19:15"
        }
      ],
      "assigned_staff": [
        {
          "name": "Ms. Johnson",
          "role": "staff"
        }
      ]
    }
  ]
}
```

---

### Lineup & Stage Management Endpoints

#### `GET /api/shows/[id]/lineup`
Get current performance lineup.

**Response:**
```json
{
  "current_time": "2025-05-17T19:10:00Z",
  "show_status": "in_progress",
  "on_stage": {
    "performance_id": "uuid",
    "performance_name": "Welcome Dance",
    "performance_order": 1,
    "started_at": "19:05",
    "estimated_end": "19:12",
    "performers_count": 12,
    "all_ready": true
  },
  "on_deck": {
    "performance_id": "uuid",
    "performance_name": "Opening Number",
    "performance_order": 2,
    "scheduled_time": "19:15",
    "performers_count": 15,
    "ready_count": 15,
    "all_ready": true
  },
  "coming_up": [
    {
      "performance_order": 3,
      "performance_name": "Ballet 3 - Waltz",
      "scheduled_time": "19:25",
      "performers_count": 10,
      "ready_count": 9,
      "missing_performers": [
        {
          "student_name": "Sophia Lee",
          "checked_in": true,
          "location": "Dressing Room 2"
        }
      ]
    }
  ],
  "upcoming_performances": [...]
}
```

---

#### `POST /api/shows/[id]/lineup/[performanceId]/update-status`
Update performance status (on-deck, on-stage, completed).

**Request:**
```json
{
  "status": "on_stage",
  "actual_start_time": "2025-05-17T19:15:00Z"
}
```

---

#### `GET /api/shows/[id]/quick-changes`
Get all quick-change alerts.

**Response:**
```json
{
  "quick_changes": [
    {
      "id": "uuid",
      "student_name": "Emma Smith",
      "from_performance": "Opening Number (ends ~7:30 PM)",
      "to_performance": "Ballet Solo (starts ~7:35 PM)",
      "time_between": 5,
      "is_critical": true,
      "assigned_helper": "Ms. Johnson",
      "quick_change_location": "Stage Left Wings",
      "status": "planned"
    }
  ],
  "critical_count": 3,
  "total_count": 12
}
```

---

### Alerts & Issues Endpoints

#### `POST /api/shows/[id]/alerts`
Create an alert.

**Request:**
```json
{
  "alert_type": "missing_student",
  "severity": "high",
  "title": "Student not checked in 30 min before show",
  "description": "Sophia Johnson has not checked in and is in the opening number.",
  "affected_students": ["uuid"],
  "affected_performances": ["uuid"]
}
```

---

#### `GET /api/shows/[id]/alerts`
Get all active alerts.

---

#### `POST /api/shows/[id]/alerts/[id]/resolve`
Resolve an alert.

---

## UI Components & Pages

### Mobile-First Pages (Tablet/Phone)

#### `/shows/[id]/check-in`
Main check-in page (mobile-optimized).

**Layout:**
- **Header:**
  - Show name and time
  - Countdown to showtime
  - Check-in progress ring (45/52 = 87%)

- **Search Bar:**
  - Large search input
  - Search by name
  - QR code scanner button

- **Quick Stats Cards:**
  - Checked In: 45
  - Missing: 7
  - Ready: 42

- **Student List:**
  - Searchable/filterable
  - Large touch targets
  - Visual status indicators:
    - ✅ Checked In (green)
    - ⏱️ Not Checked In (orange)
    - ⚠️ Late (red)

**Student Card (Not Checked In):**
- Large student name
- Photo (if available)
- Performances: "Opening Number, Ballet Solo"
- First performance: "7:15 PM (1h 30m)"
- [Check In] button (large, green)

**Student Card (Checked In):**
- Name with checkmark
- Check-in time: "5:45 PM"
- Dressing room: "Girls Room 1"
- Status: Ready ✅
- [View Details] button

**Component:**
- `ShowDayCheckInPage.vue` (mobile-first)

---

#### Check-In Dialog

**Large Modal (Full Screen on Mobile):**
- Student name and photo
- Performances list
- Form fields:
  - Dressing Room (dropdown)
  - Has all costumes? (toggle)
  - Missing items (text input, if needed)
  - Guardian contact (phone)
  - Notes (textarea)
- [Check In] button (large)
- [Cancel] button

**Component:**
- `CheckInDialog.vue`

---

#### QR Code Scanner

**Camera View:**
- Full-screen camera
- Scan frame overlay
- "Scan student QR code"
- Auto-check-in on scan
- Success animation

**Component:**
- `QRCodeScanner.vue`

---

#### `/shows/[id]/dressing-rooms`
Dressing room management.

**Room Cards:**
- Room name
- Occupancy: 15/20 (75%)
- Progress bar
- Student list (scrollable)
- Assigned staff names

**Actions:**
- Add student to room
- Move student between rooms
- View room details

**Component:**
- `DressingRoomsPage.vue`

---

### Stage Manager Dashboard

#### `/shows/[id]/stage-manager`
Real-time stage management dashboard (desktop/tablet).

**Layout (3 columns):**

**Left Column - Lineup:**
- **On Stage Now:**
  - Performance name
  - Timer showing duration
  - Performer count
  - [Mark Complete] button

- **On Deck:**
  - Next performance
  - Countdown to start
  - All performers ready? ✅
  - [Move to Stage] button

- **Coming Up (next 5):**
  - Performance list
  - Scheduled times
  - Ready status for each

**Center Column - Show Timeline:**
- Visual timeline of all performances
- Current time indicator
- Performance blocks
- Running ahead/behind indicator

**Right Column - Alerts:**
- Active alerts/issues
- Quick-change notifications
- Missing students
- Equipment issues

**Component:**
- `StageManagerDashboard.vue`

---

#### `/shows/[id]/quick-changes`
Quick-change coordination.

**Quick-Change Cards:**
- Student name and photo
- Performance transitions
- Time between (5 minutes)
- Critical badge if tight
- Assigned helper
- Change location
- Status toggle

**Filters:**
- Show only critical
- By student
- By time

**Component:**
- `QuickChangesManager.vue`

---

### Overview Dashboard

#### `/shows/[id]/overview`
High-level show status (for director/admin).

**Sections:**

**Show Info Card:**
- Show name, date, time
- Status: Pre-show / In Progress / Completed
- Countdown or elapsed time

**Check-In Summary:**
- Pie chart: Checked in vs. Not
- Total students
- On-time vs. late

**Performance Progress:**
- Progress bar: 5/20 performances complete
- Current performance
- Running on time? (+3 minutes ahead)

**Active Alerts:**
- List of current issues
- Severity indicators

**Dressing Rooms:**
- Occupancy overview
- Staff assignments

**Quick Links:**
- Check-In Page
- Stage Manager
- Dressing Rooms
- Quick Changes

**Component:**
- `ShowDayOverviewDashboard.vue`

---

## User Flows

### Flow 1: Staff Checks In Student

1. Staff member on iPad at check-in table
2. Opens `/shows/show-a/check-in`
3. Sees check-in progress: 45/52 (87%)
4. Sees countdown: "1 hour 30 min until showtime"
5. Student Emma arrives
6. Staff searches "Emma Smith"
7. Taps student card
8. Check-in dialog opens:
   - Emma Smith
   - Performances: Opening Number, Ballet Solo
9. Staff fills in:
   - Dressing Room: Girls Room 1
   - Has all costumes: Yes ✓
   - Guardian contact: 555-1234
10. Taps "Check In"
11. System:
    - Records check-in time (5:45 PM)
    - Assigns to dressing room
    - Updates student status to "ready"
    - Sends confirmation notification (future)
12. Success animation
13. Card updates to show ✅ Checked In
14. Progress updates: 46/52 (88%)

---

### Flow 2: Stage Manager Coordinates Show

1. Stage manager at side-stage laptop
2. Opens `/shows/show-a/stage-manager`
3. Sees dashboard:
   - **On Stage:** Welcome Dance (started 7:05 PM, timer at 4:32)
   - **On Deck:** Opening Number (scheduled 7:15 PM, all 15 ready ✅)
   - **Coming Up:** Ballet 3 - Waltz (7:25 PM, 9/10 ready ⚠️)
4. Welcome Dance ends
5. Stage manager clicks "Mark Complete"
6. System:
   - Updates Welcome Dance to "completed"
   - Moves Opening Number to "On Stage"
   - Starts timer for Opening Number
7. Dashboard updates:
   - **On Stage:** Opening Number (timer starts)
   - **On Deck:** Ballet 3 - Waltz (9/10 ready)
   - Alert: "Sophia Lee still in dressing room"
8. Stage manager radios: "Get Sophia Lee to stage left"
9. Sophia arrives
10. Assistant marks her ready
11. Alert clears: 10/10 ready ✅

---

### Flow 3: Handling Missing Student Alert

1. Show starting in 30 minutes
2. System automatically checks
3. Finds 2 students not checked in
4. Creates alert:
   - Type: Missing Student
   - Severity: High
   - Students: Sophia Johnson, Alex Lee
5. Alert appears on all dashboards
6. Staff calls Sophia's mom
7. Mom says: "Running 10 minutes late"
8. Staff updates alert with note
9. Sophia arrives, checks in
10. Staff resolves alert for Sophia
11. Alert updates: Only Alex Lee remaining
12. Staff contacts Alex's parents
13. Parents say: "Alex is sick, not coming"
14. Staff removes Alex from all performances
15. Marks alert as resolved
16. Notifies stage manager of change

---

### Flow 4: Quick-Change Coordination

1. Quick-change coordinator viewing `/shows/show-a/quick-changes`
2. Sees Emma Smith:
   - From: Opening Number (ends ~7:30 PM)
   - To: Ballet Solo (starts 7:35 PM)
   - Time: 5 minutes (CRITICAL ⚠️)
   - Location: Stage Left Wings
3. Coordinator assigns herself as helper
4. At 7:25 PM, coordinator positions at stage left
5. Opening Number ends 7:29 PM
6. Emma rushes off stage
7. Coordinator helps with costume change
8. Emma ready at 7:33 PM
9. Coordinator marks quick-change status: "Completed" ✅
10. Emma goes to stage for Ballet Solo at 7:35 PM

---

## Real-Time Updates

### Supabase Realtime Subscriptions

**Channels to Subscribe:**

1. **Check-Ins Channel:**
   - Table: `show_day_check_ins`
   - Events: INSERT, UPDATE
   - Updates check-in counts in real-time

2. **Lineup Channel:**
   - Table: `performer_lineup`
   - Events: UPDATE
   - Updates stage manager dashboard

3. **Alerts Channel:**
   - Table: `show_day_alerts`
   - Events: INSERT, UPDATE
   - Shows new alerts immediately

**Implementation:**
```typescript
const supabase = useSupabaseClient()

// Subscribe to check-ins
supabase
  .channel('check-ins')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'show_day_check_ins',
    filter: `recital_show_id=eq.${showId}`
  }, (payload) => {
    // Update UI
    refreshCheckInStatus()
  })
  .subscribe()
```

---

## QR Code System

### Student QR Codes

**Generate QR codes for each student:**
- Encode: `student_id` or unique check-in token
- Print on name tags or check-in cards
- Parents bring to check-in

**Scanning Process:**
1. Staff opens QR scanner
2. Scans student's code
3. System looks up student
4. Pre-fills check-in dialog
5. Staff confirms details
6. Checks in instantly

**QR Code Library:**
- Use `qrcode` npm package
- Generate codes in advance
- Print sheet of all student codes

---

## Emergency Contact Quick-Dial

**Feature:**
- One-tap call to guardian
- From student detail page
- Emergency contact highlighted

**UI:**
- [📞 Call Guardian] button
- Shows phone number
- Initiates call via `tel:` link (mobile)

---

## Implementation Steps

### Phase 1: Database & Core API (Week 1)

1. Create database migration (5 tables)
2. Create TypeScript types
3. Build check-in CRUD endpoints
4. Build dressing room endpoints
5. Build lineup endpoints
6. Test with Postman

---

### Phase 2: Check-In UI (Week 2)

1. Build mobile check-in page
2. Build check-in dialog
3. Build student search
4. Build QR scanner
5. Real-time updates
6. Test on tablets/phones

---

### Phase 3: Stage Manager Dashboard (Week 3)

1. Build stage manager view
2. Build lineup tracking
3. Build quick-change manager
4. Build alerts system
5. Real-time dashboard updates

---

### Phase 4: Supporting Features (Week 4)

1. Build dressing room management
2. Build overview dashboard
3. Build missing student alerts
4. Build QR code generation
5. Emergency contact integration
6. Testing and refinement

---

## Testing Checklist

### Database
- [ ] Check-in records created
- [ ] No duplicate check-ins
- [ ] Dressing room capacity enforced
- [ ] Real-time subscriptions work

### API
- [ ] Check-in creates record
- [ ] Status endpoints accurate
- [ ] Lineup updates correctly
- [ ] Alerts created and resolved
- [ ] Quick-changes tracked

### UI - Check-In
- [ ] Search works fast
- [ ] QR scanning works
- [ ] Check-in dialog validates
- [ ] Progress updates real-time
- [ ] Mobile-friendly

### UI - Stage Manager
- [ ] Lineup displays correctly
- [ ] Status updates in real-time
- [ ] Quick-changes shown
- [ ] Alerts visible
- [ ] Performance timing accurate

### Real-Time
- [ ] Check-ins update all screens
- [ ] Lineup changes broadcast
- [ ] Alerts appear immediately
- [ ] No lag or delay

---

## Success Metrics

- **Check-In Speed:** <30 seconds per student
- **Check-In Accuracy:** 100% accurate records
- **Missing Students:** Identified within 30 min of showtime
- **Quick-Change Success:** 95%+ successful transitions
- **Staff Satisfaction:** 90%+ find system helpful
- **Show Timing:** 80%+ shows run on schedule

---

## Future Enhancements

1. **Parent Self-Check-In**
   - Parent app or kiosk
   - Scan QR code
   - Answer questions
   - Print name tag

2. **Automated Announcements**
   - "Ballet 3, please report to stage left"
   - Integration with PA system

3. **Performer Tracking**
   - GPS/Bluetooth beacons
   - Know exactly where students are

4. **Live Parent Updates**
   - "Emma checked in ✓"
   - "Emma's performance in 10 minutes"

5. **Video Monitoring**
   - Cameras in dressing rooms (external)
   - Stage wings monitoring

6. **Post-Show Analytics**
   - Check-in timeliness
   - Performance timing accuracy
   - Identify bottlenecks

---

## Hardware Recommendations

**For Check-In:**
- iPad or Android tablets (2-3)
- Phone with good camera (for QR scanning)
- Portable WiFi hotspot (backup)

**For Stage Manager:**
- Laptop or large tablet
- External monitor (optional)
- Walkie-talkies for staff

**For Printing:**
- Label printer for name tags
- QR code sheets printed in advance

---

## Estimated Effort

- **Database & Core API:** 16 hours
- **Check-In UI:** 28 hours
- **Stage Manager Dashboard:** 24 hours
- **Supporting Features:** 20 hours
- **Testing:** 16 hours
- **Documentation:** 8 hours

**Total:** ~112 hours (~14 days for one developer)

---

## Dependencies

- QR code library (`qrcode`, `html5-qrcode`)
- Supabase Realtime
- Camera access (for QR scanning)
- Mobile/tablet devices

---

## Related Features

- **Rehearsal Management** - Similar attendance tracking
- **Performer Confirmation** - Know who's expected
- **Email System** - Send missing alerts
- **Parent Portal** - Show check-in status
