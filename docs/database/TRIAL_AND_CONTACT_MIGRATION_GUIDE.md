# Trial Registrations and Contact Inquiries Migration Guide

This guide explains how to set up the database tables for the trial registration and contact inquiry features.

## Overview

Two new tables are added to support public-facing forms:

1. **trial_registrations** - Stores trial class registration submissions
2. **contact_inquiries** - Stores contact form submissions

## Running the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Open the file `docs/database/trial-and-contact-tables.sql`
4. Copy all the SQL content
5. Paste it into the SQL Editor
6. Click "Run" to execute the migration

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

Or run the SQL file directly:

```bash
supabase db execute -f docs/database/trial-and-contact-tables.sql
```

## What Gets Created

### trial_registrations Table

Stores information about trial class registration requests:

- Student information (name, DOB, gender, experience)
- Parent/Guardian contact details
- Preferred class and date
- Agreement checkboxes (terms, waiver, marketing)
- Status tracking (pending, confirmed, scheduled, completed, cancelled, no_show)

### contact_inquiries Table

Stores contact form submissions:

- Contact information (name, email, phone)
- Inquiry type (enrollment, trial, schedule, pricing, recitals, general, feedback)
- Message content
- Status tracking (new, in_progress, resolved, closed)
- Assignment and response tracking

### Row Level Security (RLS)

Both tables have RLS enabled with the following policies:

- **Public INSERT** - Anyone can submit forms (unauthenticated users)
- **Admin/Staff SELECT** - Only admin and staff can view submissions
- **Admin/Staff UPDATE** - Only admin and staff can update records

This ensures:
- Public users can submit forms without authentication
- Sensitive data is only accessible to authorized staff
- Proper audit trail for all changes

## API Endpoints

### POST /api/register/trial

Handles trial class registration submissions.

**Request Body:**
```json
{
  "studentFirstName": "John",
  "studentLastName": "Doe",
  "dateOfBirth": "2015-03-15",
  "gender": "male",
  "experience": "none",
  "parentFirstName": "Jane",
  "parentLastName": "Doe",
  "email": "jane@example.com",
  "phone": "555-0123",
  "address": "123 Main St",
  "city": "Anytown",
  "state": "CA",
  "zipCode": "12345",
  "classId": "uuid-of-class",
  "preferredDate": "2024-01-15",
  "referralSource": "google",
  "comments": "Looking forward to trying ballet!",
  "agreeTerms": true,
  "agreeWaiver": true,
  "agreeMarketing": false
}
```

**Response:**
```json
{
  "success": true,
  "registrationId": "uuid-of-registration",
  "message": "Trial class registration successful"
}
```

**Features:**
- Validates all required fields
- Sends confirmation email to parent
- Creates audit log entry
- Returns registration ID for tracking

### POST /api/contact

Handles contact form submissions.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "555-0123",
  "inquiryType": "enrollment",
  "message": "I'd like to learn more about your ballet classes."
}
```

**Response:**
```json
{
  "success": true,
  "inquiryId": "uuid-of-inquiry",
  "message": "Contact inquiry submitted successfully"
}
```

**Features:**
- Validates all required fields
- Sends confirmation email to sender
- Sends notification email to studio staff
- Creates audit log entry
- Returns inquiry ID for tracking

## Email Notifications

Both endpoints send automated emails:

### Trial Registration
- **To Parent:** Confirmation email with trial class details and what to expect
- **To Staff:** (Future enhancement) Notification of new trial registration

### Contact Form
- **To Sender:** Confirmation that message was received
- **To Staff:** Notification email with inquiry details and contact info

## Testing

See the parent README for instructions on testing both flows manually.

## Database Schema

### trial_registrations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| student_first_name | TEXT | Student's first name |
| student_last_name | TEXT | Student's last name |
| date_of_birth | DATE | Student's date of birth |
| gender | TEXT | Student's gender (optional) |
| experience_level | TEXT | Dance experience level |
| parent_first_name | TEXT | Parent/guardian first name |
| parent_last_name | TEXT | Parent/guardian last name |
| email | TEXT | Parent email address |
| phone | TEXT | Parent phone number |
| address | TEXT | Street address |
| city | TEXT | City |
| state | TEXT | State |
| zip_code | TEXT | ZIP/Postal code |
| class_id | UUID | Reference to class_definitions |
| preferred_date | DATE | Preferred trial date |
| referral_source | TEXT | How they heard about studio |
| comments | TEXT | Additional comments |
| agreed_to_terms | BOOLEAN | Agreed to terms |
| agreed_to_waiver | BOOLEAN | Agreed to waiver |
| marketing_consent | BOOLEAN | Opted in for marketing |
| status | TEXT | Registration status |
| scheduled_time | TIMESTAMPTZ | Scheduled trial time |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| processed_by | UUID | Staff member who processed |
| processed_at | TIMESTAMPTZ | When it was processed |
| notes | TEXT | Internal staff notes |

### contact_inquiries

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| first_name | TEXT | Sender's first name |
| last_name | TEXT | Sender's last name |
| email | TEXT | Sender's email |
| phone | TEXT | Sender's phone (optional) |
| inquiry_type | TEXT | Type of inquiry |
| message | TEXT | Inquiry message |
| status | TEXT | Inquiry status |
| assigned_to | UUID | Staff member assigned |
| responded_at | TIMESTAMPTZ | When responded |
| responded_by | UUID | Who responded |
| response | TEXT | Response message |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| notes | TEXT | Internal staff notes |

## Future Enhancements

Potential improvements:

1. **Admin Dashboard** - Create admin pages to view and manage trial registrations and contact inquiries
2. **Automated Scheduling** - Automatically schedule trial classes based on availability
3. **Follow-up System** - Automated follow-up emails after trial classes
4. **CRM Integration** - Integrate with a CRM system for lead management
5. **Analytics** - Track conversion rates from trial to enrollment
6. **SMS Notifications** - Send SMS confirmations and reminders
7. **Calendar Integration** - Add trial classes to staff calendars automatically

## Troubleshooting

### Migration Fails with "table already exists"

If the tables already exist, you can drop them first:

```sql
DROP TABLE IF EXISTS trial_registrations CASCADE;
DROP TABLE IF EXISTS contact_inquiries CASCADE;
```

Then run the migration again.

### RLS Policy Errors

If you get RLS policy errors, ensure:
1. The `profiles` table exists
2. The `user_role` column exists on `profiles`
3. User roles match the expected values ('admin', 'staff')

### Email Not Sending

Check:
1. Mailgun credentials are set in environment variables
2. `enhancedEmailService` is properly configured
3. Check server logs for email errors
4. Verify email addresses are valid

## Support

For questions or issues, refer to the main project documentation or contact the development team.
