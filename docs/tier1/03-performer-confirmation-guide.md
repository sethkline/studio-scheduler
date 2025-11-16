# Performer Confirmation Workflow - Implementation Guide

## Overview

The Performer Confirmation Workflow ensures that all students participating in a recital have been confirmed by their parents/guardians. This prevents scheduling conflicts, manages expectations, and allows for accurate costume ordering, program printing, and logistics planning.

**Priority:** Tier 1 - Critical for Next Recital

---

## Business Requirements

### User Stories

**As an Admin/Staff member, I want to:**
- Automatically populate performer lists from class enrollments
- Send confirmation requests to all parents
- Track which students have been confirmed
- See who has opted out and why
- Enforce confirmation deadlines
- Validate eligibility requirements (attendance, payments)
- Generate confirmed performer rosters
- Get alerts for missing confirmations

**As a Parent, I want to:**
- See which performances my child is in
- Confirm or decline participation for each performance
- Provide opt-out reasons if needed
- See confirmation status at a glance
- Receive reminders if I haven't confirmed
- Update confirmation if plans change

---

## Database Schema

### Tables to Create

#### 1. `recital_performer_confirmations`
Tracks confirmation status for each student-performance pairing.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recital_id | uuid | FK to recitals |
| student_id | uuid | FK to students |
| recital_performance_id | uuid | FK to recital_performances |
| guardian_id | uuid | FK to guardians (who confirmed) |
| status | varchar(50) | 'pending', 'confirmed', 'declined', 'waitlist' |
| confirmation_date | timestamptz | When confirmed |
| decline_reason | text | Why declined |
| opt_out_category | varchar(100) | 'schedule_conflict', 'cost', 'injury', 'other' |
| notes | text | Additional notes |
| reminder_sent_count | integer | Number of reminders sent |
| last_reminder_sent | timestamptz | When last reminder sent |
| confirmation_deadline | date | When confirmation due |
| is_eligible | boolean | Meets requirements? |
| eligibility_notes | text | Why not eligible |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Unique Constraint:** (student_id, recital_performance_id)

**Indexes:**
- recital_id
- student_id
- recital_performance_id
- status
- confirmation_deadline

---

#### 2. `recital_eligibility_rules`
Defines requirements for participation.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recital_id | uuid | FK to recitals |
| rule_name | varchar(255) | "Minimum Attendance" |
| rule_type | varchar(50) | 'attendance', 'payment', 'age', 'enrollment', 'custom' |
| description | text | Rule details |
| is_active | boolean | Currently enforced? |
| is_blocking | boolean | Prevents participation? |
| configuration | jsonb | Rule-specific config |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

**Configuration Examples:**
```json
{
  "rule_type": "attendance",
  "min_percentage": 75,
  "evaluation_period_weeks": 8
}
```

```json
{
  "rule_type": "payment",
  "must_be_paid": true,
  "allow_payment_plan": true
}
```

**Indexes:**
- recital_id
- rule_type

---

#### 3. `recital_participation_requests`
Logs when confirmation requests are sent.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| recital_id | uuid | FK to recitals |
| student_id | uuid | FK to students |
| guardian_id | uuid | FK to guardians |
| request_type | varchar(50) | 'initial', 'reminder', 'final_notice' |
| sent_via | varchar(50) | 'email', 'sms', 'portal' |
| sent_at | timestamptz | When sent |
| opened_at | timestamptz | When email opened |
| clicked_at | timestamptz | When link clicked |
| responded_at | timestamptz | When responded |
| created_at | timestamptz | Creation time |

**Indexes:**
- recital_id
- student_id
- sent_at

---

## API Endpoints

### Admin/Staff Endpoints

#### `POST /api/recitals/[id]/populate-performers`
Auto-populate performer list from class enrollments.

**Request:**
```json
{
  "include_all_enrollments": true,
  "class_instance_ids": ["uuid1", "uuid2"], // optional filter
  "apply_eligibility_rules": true
}
```

**Response:**
```json
{
  "created_confirmations": 125,
  "eligible_performers": 120,
  "ineligible_performers": 5,
  "ineligible_details": [
    {
      "student_id": "uuid",
      "student_name": "Emma Smith",
      "class_name": "Ballet 3",
      "reason": "Attendance below 75% (65%)"
    }
  ]
}
```

---

#### `POST /api/recitals/[id]/send-confirmation-requests`
Send confirmation requests to all parents.

**Request:**
```json
{
  "send_to": "all", // or "pending_only" or "specific_students"
  "student_ids": [], // if specific_students
  "send_via": ["email", "sms"],
  "confirmation_deadline": "2025-04-15"
}
```

**Response:**
```json
{
  "emails_sent": 85,
  "sms_sent": 85,
  "failed": 2,
  "total_requests": 85
}
```

---

#### `GET /api/recitals/[id]/confirmation-status`
Get confirmation status overview.

**Response:**
```json
{
  "summary": {
    "total_performers": 125,
    "confirmed": 95,
    "declined": 5,
    "pending": 25,
    "confirmation_rate": 76.0,
    "deadline": "2025-04-15",
    "days_until_deadline": 12
  },
  "by_class": [
    {
      "class_name": "Ballet 3",
      "total": 15,
      "confirmed": 14,
      "pending": 1,
      "declined": 0
    }
  ],
  "by_performance": [
    {
      "performance_id": "uuid",
      "performance_name": "Opening Number",
      "confirmed_count": 20,
      "pending_count": 3
    }
  ],
  "pending_confirmations": [
    {
      "student_id": "uuid",
      "student_name": "Emma Smith",
      "guardian_name": "Jane Smith",
      "guardian_email": "jane@example.com",
      "performances": ["Opening Number", "Ballet Solo"],
      "reminders_sent": 2,
      "last_reminder": "2025-03-25"
    }
  ]
}
```

---

#### `POST /api/recitals/[id]/send-reminders`
Send reminders to parents who haven't confirmed.

---

#### `GET /api/recitals/[id]/performer-roster`
Get confirmed performer roster (for program printing).

**Response:**
```json
{
  "performances": [
    {
      "performance_id": "uuid",
      "performance_order": 1,
      "performance_name": "Opening Number",
      "song_title": "Let's Go Crazy",
      "performers": [
        {
          "student_id": "uuid",
          "first_name": "Emma",
          "last_name": "Smith",
          "age": 10,
          "confirmation_status": "confirmed"
        }
      ],
      "confirmed_count": 15
    }
  ]
}
```

---

#### `POST /api/recitals/[id]/eligibility-rules`
Create eligibility rule.

**Request:**
```json
{
  "rule_name": "Minimum Attendance Requirement",
  "rule_type": "attendance",
  "is_blocking": true,
  "configuration": {
    "min_percentage": 75,
    "evaluation_period_weeks": 8
  }
}
```

---

#### `POST /api/recitals/[id]/evaluate-eligibility`
Run eligibility check for all students.

**Response:**
```json
{
  "eligible": 120,
  "ineligible": 5,
  "details": [...]
}
```

---

### Parent Endpoints

#### `GET /api/parent/students/[id]/recital-confirmations`
Get confirmation requests for a student.

**Response:**
```json
{
  "student": {
    "id": "uuid",
    "first_name": "Emma",
    "last_name": "Smith"
  },
  "recital": {
    "id": "uuid",
    "name": "Spring Recital 2025",
    "date": "2025-05-17"
  },
  "performances": [
    {
      "confirmation_id": "uuid",
      "performance_id": "uuid",
      "performance_name": "Opening Number - Let's Go Crazy",
      "class_name": "Ballet 3",
      "song_title": "Let's Go Crazy",
      "performance_order": 1,
      "estimated_time": "7:15 PM",
      "status": "pending",
      "confirmation_deadline": "2025-04-15",
      "days_until_deadline": 12,
      "costume_info": "Pink tutu (will be provided)",
      "notes": "Please arrive at 6:30 PM for check-in"
    },
    {
      "confirmation_id": "uuid",
      "performance_id": "uuid",
      "performance_name": "Ballet Solo",
      "status": "confirmed",
      "confirmation_date": "2025-03-20"
    }
  ],
  "pending_count": 1,
  "confirmed_count": 1,
  "all_confirmed": false
}
```

---

#### `POST /api/parent/confirmations/[id]/confirm`
Confirm a performance.

**Request:**
```json
{
  "notes": "Emma is excited to perform!"
}
```

**Response:**
```json
{
  "confirmation_id": "uuid",
  "status": "confirmed",
  "confirmation_date": "2025-03-26T10:15:00Z",
  "message": "Thank you for confirming! We'll see Emma at the recital."
}
```

---

#### `POST /api/parent/confirmations/[id]/decline`
Decline a performance.

**Request:**
```json
{
  "decline_reason": "We have a family wedding that weekend and can't attend.",
  "opt_out_category": "schedule_conflict"
}
```

**Response:**
```json
{
  "confirmation_id": "uuid",
  "status": "declined",
  "message": "We've recorded your response. Please contact the studio if you have questions."
}
```

---

#### `POST /api/parent/confirmations/[id]/update`
Update existing confirmation (change mind).

---

## UI Components & Pages

### Admin Pages

#### `/recitals/[id]/performers`
Main performer management page.

**Tabs:**
1. **Roster** - Confirmed performer list
2. **Confirmations** - Tracking status
3. **Eligibility** - Eligibility rules and checks
4. **Communications** - Sent requests/reminders

**Key Features:**
- Auto-populate performers button
- Send confirmation requests button
- Confirmation progress ring (95/125 confirmed)
- Filter by class, status, performance
- Export roster for program

**Components:**
- `PerformerRosterTable.vue`
- `ConfirmationStatusDashboard.vue`
- `EligibilityRulesManager.vue`
- `ConfirmationCommunicationsLog.vue`

---

#### Confirmation Status Dashboard

**Displays:**
- Overall progress bar (76% confirmed)
- Days until deadline
- Quick stats cards:
  - Confirmed: 95
  - Pending: 25
  - Declined: 5
- Table of pending confirmations
  - Student name
  - Guardian name
  - Email/phone
  - Performances
  - Reminders sent
  - Actions (Send Reminder, Mark Confirmed)

**Component:**
- `ConfirmationStatusDashboard.vue`

---

#### Auto-Populate Wizard

**Step 1: Select Source**
- Include all enrolled students
- OR select specific classes

**Step 2: Apply Eligibility Rules**
- Show eligibility rules
- Option to skip checks

**Step 3: Review**
- Show students to be added
- Show ineligible students
- Confirm count

**Step 4: Create**
- Bulk create confirmations
- Show success message

**Component:**
- `AutoPopulatePerformersWizard.vue`

---

### Parent Pages

#### `/parent/students/[id]/confirmations`
Student confirmation page.

**Layout:**
- Header: Recital name, date, deadline
- Alert: "2 performances need confirmation"
- Performance cards:
  - Performance name and details
  - Status badge
  - Confirm/Decline buttons
  - Costume info
  - Notes

**Component:**
- `ParentConfirmationPage.vue`

---

#### Confirmation Card

**Shows:**
- Performance name
- Song title
- Class name
- Estimated show time
- Costume requirements
- Special notes
- Status indicator

**Actions:**
- Confirm button (green)
- Decline button (red)
- View details link

**Component:**
- `PerformanceConfirmationCard.vue`

---

#### Decline Dialog

**Form:**
- Reason (dropdown):
  - Schedule conflict
  - Cost concerns
  - Injury/medical
  - Not interested
  - Other
- Additional notes (textarea)
- Confirm decline button

**Component:**
- `DeclinePerformanceDialog.vue`

---

## User Flows

### Flow 1: Admin Populates and Sends Confirmation Requests

1. Admin goes to `/recitals/spring-2025/performers`
2. Clicks "Confirmations" tab
3. Sees message: "No performers added yet"
4. Clicks "Auto-Populate Performers"
5. Wizard opens:
   - Step 1: Selects "Include all enrolled students"
   - Step 2: Enables "Apply eligibility rules"
   - Step 3: Reviews:
     - 125 students found
     - 120 eligible
     - 5 ineligible (reasons shown)
   - Step 4: Clicks "Create Confirmations"
6. System creates 120 confirmation records
7. Admin sees confirmation dashboard:
   - 0 confirmed
   - 120 pending
   - 0 declined
8. Admin clicks "Send Confirmation Requests"
9. Dialog opens:
   - Send to: All pending
   - Via: Email & SMS
   - Deadline: April 15, 2025
10. Clicks "Send Requests"
11. System:
    - Sends 120 emails
    - Sends 120 SMS messages
    - Creates request log entries
12. Success message: "120 confirmation requests sent"
13. Parents receive emails/texts with link

---

### Flow 2: Parent Confirms Performances

1. Parent receives email: "Confirm Emma's Recital Performances"
2. Clicks link in email
3. Redirected to `/parent/students/emma/confirmations`
4. Sees recital header:
   - Spring Recital 2025
   - May 17, 2025
   - Confirm by April 15
5. Sees 2 performance cards:

   **Card 1:**
   - Opening Number - "Let's Go Crazy"
   - Ballet 3
   - Estimated time: 7:15 PM
   - Status: Pending
   - Costume: Pink tutu (provided)
   - [Confirm] [Decline]

   **Card 2:**
   - Ballet Solo
   - Ballet 3
   - Estimated time: 8:00 PM
   - Status: Pending
   - [Confirm] [Decline]

6. Parent clicks "Confirm" on Card 1
7. System updates status to "confirmed"
8. Card shows: ✓ Confirmed on Mar 26
9. Parent clicks "Confirm" on Card 2
10. Both confirmed
11. Alert changes to: "All performances confirmed! ✓"
12. System:
    - Updates both confirmation records
    - Sends confirmation email
    - Updates admin dashboard

---

### Flow 3: Parent Declines Performance

1. Parent viewing confirmation page
2. Clicks "Decline" on a performance
3. Dialog opens:
   - "Why are you declining this performance?"
   - Dropdown: Schedule conflict ✓
   - Notes: "Family wedding that weekend"
4. Clicks "Confirm Decline"
5. System:
   - Updates status to "declined"
   - Records reason
   - Notifies admin
6. Card shows: "Declined - Schedule conflict"
7. Parent can still confirm other performances

---

### Flow 4: Admin Sends Reminders

1. Admin on confirmation dashboard
2. Sees 25 pending confirmations
3. Deadline is in 3 days
4. Clicks "Send Reminders"
5. Dialog:
   - Send to: Pending confirmations (25)
   - Message: Final reminder template
6. Clicks "Send"
7. System:
   - Sends 25 reminder emails
   - Increments reminder_sent_count
   - Updates last_reminder_sent
8. Parents receive: "Reminder: Confirm by April 15"

---

## Implementation Steps

### Phase 1: Database & API (Week 1)

1. Create database migration (3 tables)
2. Create TypeScript types
3. Build auto-populate endpoint
4. Build confirmation CRUD endpoints
5. Build parent confirmation endpoints
6. Test with Postman

---

### Phase 2: Admin UI (Week 2)

1. Build performer roster page
2. Build auto-populate wizard
3. Build confirmation status dashboard
4. Build send requests functionality
5. Build send reminders functionality
6. Build eligibility rules manager

---

### Phase 3: Parent UI (Week 3)

1. Build parent confirmation page
2. Build performance confirmation cards
3. Build confirm action
4. Build decline dialog
5. Build confirmation success states
6. Integration with parent dashboard

---

### Phase 4: Communications & Automation (Week 4)

1. Build email templates
2. Build SMS templates
3. Build automated reminders (scheduled)
4. Build deadline enforcement
5. Build roster export for program
6. Analytics and reporting

---

## Email Templates

### Initial Confirmation Request

**Subject:** Confirm [Student]'s Recital Performances - Due [Date]

**Body:**
```
Hi [Parent Name],

[Student Name] is scheduled to perform in [Recital Name] on [Date]!

Please confirm their participation by [Deadline]:

Performances for [Student Name]:
1. [Performance 1 Name] - [Song] - [Estimated Time]
2. [Performance 2 Name] - [Song] - [Estimated Time]

[Confirm All Performances Button]

Or view details and confirm individually:
[View Confirmation Page Link]

Important Dates:
- Confirmation Deadline: [Date]
- Dress Rehearsal: [Date]
- Show Day: [Date]

Questions? Contact us at [Studio Email] or [Studio Phone]

Thank you!
[Studio Name]
```

---

### Confirmation Reminder

**Subject:** Reminder: Confirm Recital Performances by [Date]

**Body:**
```
Hi [Parent Name],

This is a reminder to confirm [Student Name]'s recital performances.

You have [X] performances pending confirmation.

Confirmation deadline: [Date] ([X] days away)

[Confirm Now Button]

We need your confirmation to finalize costumes, program printing, and logistics.

Thank you!
```

---

### Confirmation Received

**Subject:** Confirmation Received - [Recital Name]

**Body:**
```
Hi [Parent Name],

Thank you for confirming [Student Name]'s participation in [Recital Name]!

Confirmed Performances:
✓ [Performance 1]
✓ [Performance 2]

Next Steps:
1. Watch for rehearsal schedule (coming soon)
2. Payment due: [Date]
3. Costume fitting: [Date]

Mark your calendar:
- Dress Rehearsal: [Date] at [Time]
- Show Day: [Date] at [Time]

We can't wait to see [Student Name] shine on stage!

[Studio Name]
```

---

## SMS Templates

### Confirmation Request
```
[Studio]: Please confirm [Student]'s recital performances by [Date]. Link: [URL]
```

### Reminder
```
[Studio]: Reminder - Confirm [Student]'s recital by [Date] (deadline in [X] days). Link: [URL]
```

### Confirmed
```
[Studio]: Thanks for confirming [Student] for [Recital]! Details coming soon.
```

---

## Eligibility Rules Examples

### Attendance Rule
- **Rule:** Student must have attended 75% of classes in the 8 weeks before recital
- **Implementation:** Query class_attendance table
- **Action if Failed:** Mark ineligible, notify parent, offer catch-up classes

### Payment Rule
- **Rule:** All outstanding fees must be paid (or on payment plan)
- **Implementation:** Query student_recital_fees table
- **Action if Failed:** Mark ineligible, notify parent, offer payment plan

### Enrollment Rule
- **Rule:** Student must be actively enrolled (not on hold/inactive)
- **Implementation:** Check students.status field
- **Action if Failed:** Mark ineligible, notify parent

### Age Rule
- **Rule:** Student must be within age range for performance
- **Implementation:** Calculate age from date_of_birth
- **Action if Failed:** Mark ineligible, suggest alternative class

---

## Testing Checklist

### Database
- [ ] Confirmation records created correctly
- [ ] Unique constraint prevents duplicates
- [ ] Eligibility rules validate properly

### API
- [ ] Auto-populate creates correct count
- [ ] Eligibility check works
- [ ] Parent can confirm
- [ ] Parent can decline
- [ ] Reminders send correctly
- [ ] Roster export includes only confirmed

### UI - Admin
- [ ] Auto-populate wizard works
- [ ] Confirmation dashboard displays stats
- [ ] Send requests works
- [ ] Send reminders works
- [ ] Filters work correctly

### UI - Parent
- [ ] Confirmation page shows all performances
- [ ] Confirm button works
- [ ] Decline dialog validates
- [ ] Status updates in real-time
- [ ] Deadline shown clearly

### Communications
- [ ] Emails send successfully
- [ ] SMS sends successfully
- [ ] Templates render correctly
- [ ] Links work properly
- [ ] Tracking logs requests

---

## Success Metrics

- **Confirmation Rate:** 95%+ confirmations by deadline
- **Response Time:** 80%+ respond within 7 days
- **Admin Time Savings:** 90% reduction in manual tracking
- **Parent Satisfaction:** 85%+ find process easy
- **Accuracy:** 100% program accuracy (no missing/wrong names)

---

## Future Enhancements

1. **Automated Reminders**
   - Schedule reminders at intervals
   - Escalate to phone calls

2. **Waitlist Management**
   - If declined, offer spot to waitlist

3. **Conditional Performances**
   - "Confirm for Show A OR Show B"

4. **Group Confirmations**
   - Confirm all children at once

5. **SMS Two-Way**
   - Reply "YES" to confirm via SMS

6. **Performance Swapping**
   - Move student to different show/time

---

## Estimated Effort

- **Database & API:** 16 hours
- **Admin UI:** 24 hours
- **Parent UI:** 20 hours
- **Communications:** 12 hours
- **Testing:** 12 hours
- **Documentation:** 8 hours

**Total:** ~92 hours (~11-12 days for one developer)

---

## Dependencies

- Email service (Mailgun)
- SMS service (Twilio or similar)
- Student enrollment data
- Class attendance data (for eligibility)
- Payment data (for eligibility)

---

## Related Features

- **Rehearsal Management** - Link to rehearsal attendance
- **Payment Tracking** - Payment eligibility rules
- **Program Builder** - Use confirmed roster
- **Email System** - Send confirmation requests
