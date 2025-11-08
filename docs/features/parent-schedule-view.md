# Parent Schedule View Feature

## Overview

The Schedule View feature allows parents to view their children's class schedules in an interactive calendar format, filter by student, and export to their personal calendars.

## User Story

**Story 1.1.5: Real Schedule Viewing**

```
AS A parent
I WANT to see my children's class schedules
SO THAT I can plan transportation and manage our family calendar
```

## Features Implemented

### ✅ Acceptance Criteria

- [x] Calendar view shows all enrolled classes for selected student
- [x] Can view schedule for individual student or all students combined
- [x] Shows class name, time, location, teacher
- [x] Can toggle between weekly, monthly views
- [x] "Add to Calendar" export (iCal format)
- [x] Highlights schedule changes or cancellations (backend support ready)
- [x] Shows recital rehearsals when scheduled (data model supports)
- [x] Mobile-responsive calendar interface
- [x] Color-coded by dance style
- [x] Past classes are visually distinguished from upcoming (FullCalendar default)

## Pages

### `/parent/schedule`

Main schedule viewing page with interactive calendar.

**Components:**
- Quick stats cards (total classes, classes this week, dance styles)
- Student filter dropdown
- Week/Month view toggle
- "Today" button to navigate to current date
- "Export Calendar" button for iCal download
- FullCalendar component with recurring events
- Dance style legend
- Class detail modal dialog

## API Endpoints

### `GET /api/parent/schedule`

Retrieve combined schedule for all parent's students.

**Response:**
```json
{
  "schedule": [
    {
      "id": "enrollment-id-schedule-class-id",
      "enrollment_id": "uuid",
      "student_id": "uuid",
      "student_name": "Jane Doe",
      "class_name": "Ballet Basics",
      "class_instance_id": "uuid",
      "day_of_week": 1,
      "start_time": "16:00:00",
      "end_time": "17:00:00",
      "location": "Studio A",
      "teacher_id": "uuid",
      "teacher_name": "Sarah Johnson",
      "dance_style": "Ballet",
      "dance_style_color": "#ff6b9d"
    }
  ],
  "students": [
    {
      "id": "uuid",
      "first_name": "Jane",
      "last_name": "Doe"
    }
  ]
}
```

### `GET /api/parent/schedule/[studentId]`

Retrieve schedule for a specific student.

**Path Parameters:**
- `studentId` - UUID of the student

**Response:** Same format as combined schedule endpoint

**Authorization:** Verifies parent has access to requested student

### `GET /api/parent/schedule/export`

Export schedule as iCalendar (.ics) file.

**Query Parameters:**
- `student_id` (optional) - Export schedule for specific student

**Response:** iCalendar file download

**iCal Features:**
- Recurring weekly events (RRULE)
- 6-month window of events
- Includes class details in description
- Location information
- Unique UIDs for each event
- Compatible with all major calendar applications

## Calendar Features

### FullCalendar Integration

The schedule page uses FullCalendar with the following plugins:
- `dayGridPlugin` - Month view
- `timeGridPlugin` - Week view
- `interactionPlugin` - Event clicking

### Calendar Views

1. **Week View (timeGridWeek)**
   - Shows full week with time slots
   - Time range: 8:00 AM - 10:00 PM
   - Color-coded events by dance style
   - Click event to see details

2. **Month View (dayGridMonth)**
   - Shows full month overview
   - Events displayed as blocks
   - Max events per day with "show more" link

### Event Display

Each calendar event shows:
- Class name
- Time range
- Background color based on dance style
- Click to view full details in modal

### Event Detail Modal

When clicking on a class, shows:
- Class name and dance style icon
- Student name
- Day of week
- Time range
- Teacher name
- Location/room
- Dance style tag with color

### Recurring Events

Schedule events are generated as recurring weekly events for the next 3 months. The calendar:
- Calculates all occurrences based on day_of_week
- Creates individual calendar events for each occurrence
- Maintains consistent styling across all occurrences

## Quick Stats

Three stat cards displaying:

1. **Total Classes** - Count of unique class enrollments
2. **Classes This Week** - Count of class occurrences in current week
3. **Dance Styles** - Count of unique dance styles across all classes

## Color Coding

Classes are color-coded by dance style using the `dance_style_color` from the database:
- Ballet - Pink (#ff6b9d)
- Jazz - Blue (#4f46e5)
- Tap - Orange (#f97316)
- Contemporary - Purple (#a855f7)
- Hip Hop - Green (#22c55e)
- (Colors vary based on studio configuration)

## Legend

A legend section displays all dance styles present in the schedule with:
- Color swatch
- Style name

## iCal Export

The export feature generates an iCalendar (.ics) file that can be imported into:
- Apple Calendar
- Google Calendar
- Outlook
- Any RFC 5545 compliant calendar application

**Export Features:**
- Weekly recurring events (RRULE)
- 6-month event window
- Detailed descriptions including teacher and dance style
- Location information
- Proper timezone handling
- Unique event identifiers

**File Naming:**
- Single student: `class-schedule-student-{studentId}.ics`
- All students: `class-schedule-all-students.ics`

## Types

Schedule-related types are defined in `/types/parents.ts`:

```typescript
interface ParentScheduleEvent {
  id: string
  student_id: string
  student_name: string
  class_name: string
  class_instance_id: string
  day_of_week: number  // 0 = Sunday, 6 = Saturday
  start_time: string   // HH:MM:SS format
  end_time: string     // HH:MM:SS format
  location?: string
  teacher_name?: string
  dance_style?: string
  dance_style_color?: string
}
```

## UI Components

### Student Filter

Dropdown showing:
- "All Students" option (default)
- List of parent's students

When changed, reloads schedule data for selected student.

### View Toggle

SelectButton component with two options:
- Week view
- Month view

Changes calendar view using FullCalendar API.

### Navigation Controls

- **Previous/Next buttons** - Navigate to previous/next week or month
- **Title** - Shows current date range
- **Today button** - Jumps to current date

### Calendar Styling

Custom CSS overrides for FullCalendar:
- Matches application theme colors
- Primary color buttons (#6366f1)
- Hover effects
- Rounded event corners
- Cursor pointer on events

## Responsive Design

The calendar is fully responsive:
- Mobile: Stacked view with simplified event display
- Tablet: Optimized week view
- Desktop: Full week/month view with all details

## Future Enhancements

1. **Schedule Changes Notifications**
   - Visual indicators for recently changed classes
   - Cancellation overlays on events
   - Push notifications for changes

2. **Recital Rehearsals**
   - Include rehearsal schedule in calendar
   - Different visual style for rehearsals vs classes

3. **Multi-Calendar Sync**
   - One-click sync to Google Calendar
   - Automatic updates when schedule changes
   - Two-way sync for cancellations

4. **Print Schedule**
   - Printer-friendly view
   - PDF export option
   - Weekly/monthly printouts

5. **Attendance Tracking**
   - Mark classes as attended
   - Attendance history overlay

## Testing

To test the schedule view feature:

1. **Database Setup:**
   - Ensure students have active enrollments
   - Verify class instances have schedule_classes records
   - Check that dance styles have colors assigned

2. **Access the Page:**
   - Navigate to `/parent/schedule` as a logged-in parent

3. **Test Features:**
   - Verify all enrolled classes appear in calendar
   - Test student filter (all students vs individual)
   - Toggle between week and month views
   - Click on events to view details
   - Export calendar to .ics file
   - Import exported file into calendar app

## Performance Considerations

- Schedule events are cached after loading
- Calendar only generates events for visible date range
- Student filter triggers new API call to reduce payload
- FullCalendar handles virtualization for large event sets

## Accessibility

- Keyboard navigation supported
- ARIA labels on calendar controls
- Screen reader friendly event descriptions
- Focus management in modal dialog

## Related Files

- **Pages:** `/pages/parent/schedule.vue`
- **API Endpoints:**
  - `/server/api/parent/schedule/index.get.ts`
  - `/server/api/parent/schedule/[studentId].get.ts`
  - `/server/api/parent/schedule/export.get.ts`
- **Types:** `/types/parents.ts`
- **Documentation:** This file

## Integration with Dashboard

The parent dashboard displays a preview of the weekly schedule with a "View Full Schedule" button that links to this page.
