# Testing Guide for Trial Registration and Contact Form

This guide provides step-by-step instructions for testing the newly implemented trial registration and contact form features.

## Prerequisites

Before testing, ensure you have:

1. ✅ Supabase project set up
2. ✅ Database tables created (see Migration section below)
3. ✅ Environment variables configured in `.env`
4. ✅ Dependencies installed (`npm install`)
5. ✅ Development server running (`npm run dev`)

## Step 1: Run Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open `docs/database/trial-and-contact-tables.sql`
6. Copy all SQL content and paste into the SQL Editor
7. Click **Run** to execute
8. Verify tables were created:
   ```sql
   SELECT * FROM trial_registrations LIMIT 1;
   SELECT * FROM contact_inquiries LIMIT 1;
   ```

### Option B: Using the Migration Script

```bash
# Set environment variables (if not in .env)
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_KEY="your-service-key"

# Run the migration script
node scripts/run-trial-contact-migration.js
```

### Option C: Manual SQL Execution

If you prefer, you can run each table creation statement manually in the Supabase SQL Editor.

## Step 2: Configure Environment Variables

Ensure your `.env` file includes:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Email Configuration (for sending confirmation emails)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_REPLY_TO_ADDRESS=info@yourdomain.com

# Application URL
MARKETING_SITE_URL=http://localhost:3000
```

## Step 3: Start Development Server

```bash
npm run dev
```

The server should start on http://localhost:3000

## Step 4: Test Trial Registration Flow

### 4.1 Navigate to Trial Registration Page

Open your browser and navigate to:
```
http://localhost:3000/register/trial
```

### 4.2 Fill Out the Form

Complete all 4 steps of the trial registration form:

**Step 1: Student Information**
- Student First Name: `John`
- Student Last Name: `Doe`
- Date of Birth: `2015-03-15`
- Gender: `Male`
- Previous Dance Experience: `No experience`

**Step 2: Parent/Guardian Information**
- First Name: `Jane`
- Last Name: `Doe`
- Email: `jane.doe@example.com` (use a real email you can check)
- Phone: `555-0123`
- Address: `123 Main St`
- City: `Anytown`
- State: `CA`
- Zip Code: `12345`

**Step 3: Class Selection**
- Select a class from the dropdown
- Preferred Trial Date: Choose a future date
- How did you hear about us?: `Google Search`
- Additional Comments: `Looking forward to trying ballet!`

**Step 4: Agreement**
- ✅ Check "I have read and agree to the trial class terms and conditions"
- ✅ Check "I understand and accept the liability waiver for dance activities"
- ☐ Optionally check "I would like to receive updates and promotional emails"

### 4.3 Submit the Form

Click **Book Trial Class** button

### 4.4 Verify Success

1. **In Browser:**
   - You should see a success toast message: "Trial Class Booked!"
   - Page should redirect to `/register/confirmation` (create this page if it doesn't exist)

2. **In Database:**
   - Log in to Supabase Dashboard
   - Go to **Table Editor**
   - Select `trial_registrations` table
   - Verify a new row was created with your test data

3. **In Email:**
   - Check the email inbox for `jane.doe@example.com`
   - You should receive a confirmation email with trial class details
   - Subject: "Trial Class Confirmation - [Class Name]"

4. **In Audit Logs:**
   - Go to `audit_logs` table
   - Verify an entry was created with:
     - `action: 'trial_registration_created'`
     - `resource_type: 'trial_registration'`
     - Correct metadata

### 4.5 Test Error Scenarios

1. **Missing Required Fields:**
   - Try submitting without filling all required fields
   - Should see validation errors

2. **Invalid Email:**
   - Enter an invalid email (e.g., `notanemail`)
   - Should see "Invalid email address" error

3. **Past Date:**
   - Try selecting a past date for preferred trial date
   - Should see "Invalid preferred date" error

4. **Invalid Class:**
   - Try submitting with an invalid class ID (modify form data in DevTools)
   - Should see "Class not found" error

## Step 5: Test Contact Form Flow

### 5.1 Navigate to Contact Page

Open your browser and navigate to:
```
http://localhost:3000/contact
```

### 5.2 Fill Out the Form

**Contact Information:**
- First Name: `Jane`
- Last Name: `Smith`
- Email: `jane.smith@example.com` (use a real email you can check)
- Phone: `555-0456` (optional)

**Inquiry Details:**
- Inquiry Type: `Class Enrollment`
- Message: `I'm interested in enrolling my daughter in ballet classes. What are the available options for beginners?`

### 5.3 Submit the Form

Click **Send Message** button

### 5.4 Verify Success

1. **In Browser:**
   - You should see a success toast message: "Message Sent!"
   - Form should reset (all fields cleared)

2. **In Database:**
   - Log in to Supabase Dashboard
   - Go to **Table Editor**
   - Select `contact_inquiries` table
   - Verify a new row was created with your test data

3. **In Email (Sender Confirmation):**
   - Check the email inbox for `jane.smith@example.com`
   - You should receive a confirmation email
   - Subject: "We received your message"
   - Contains your inquiry details

4. **In Email (Staff Notification):**
   - Check the studio email inbox (configured in `studio_profile` table)
   - You should receive a notification email
   - Subject: "New Contact Inquiry: Class Enrollment"
   - Contains sender details and message

5. **In Audit Logs:**
   - Go to `audit_logs` table
   - Verify an entry was created with:
     - `action: 'contact_inquiry_created'`
     - `resource_type: 'contact_inquiry'`
     - Correct metadata

### 5.5 Test Error Scenarios

1. **Missing Required Fields:**
   - Try submitting without filling all required fields
   - Should see validation errors

2. **Invalid Email:**
   - Enter an invalid email (e.g., `notanemail`)
   - Should see "Invalid email address" error

3. **Invalid Inquiry Type:**
   - Try submitting with an invalid inquiry type (modify form data in DevTools)
   - Should see "Invalid inquiry type" error

## Step 6: API Testing with cURL

You can also test the API endpoints directly using cURL:

### Test Trial Registration Endpoint

```bash
curl -X POST http://localhost:3000/api/register/trial \
  -H "Content-Type: application/json" \
  -d '{
    "studentFirstName": "John",
    "studentLastName": "Doe",
    "dateOfBirth": "2015-03-15",
    "gender": "male",
    "experience": "none",
    "parentFirstName": "Jane",
    "parentLastName": "Doe",
    "email": "jane.doe@example.com",
    "phone": "555-0123",
    "address": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345",
    "classId": "your-class-uuid-here",
    "preferredDate": "2024-01-15",
    "referralSource": "google",
    "comments": "Looking forward to trying ballet!",
    "agreeTerms": true,
    "agreeWaiver": true,
    "agreeMarketing": false
  }'
```

Expected response:
```json
{
  "success": true,
  "registrationId": "uuid-here",
  "message": "Trial class registration successful"
}
```

### Test Contact Form Endpoint

```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@example.com",
    "phone": "555-0456",
    "inquiryType": "enrollment",
    "message": "I am interested in enrolling my daughter in ballet classes."
  }'
```

Expected response:
```json
{
  "success": true,
  "inquiryId": "uuid-here",
  "message": "Contact inquiry submitted successfully"
}
```

## Step 7: Verify RLS Policies

Test that Row Level Security is working correctly:

### Test Public Access (Should Work)

```bash
# This should succeed (using anon key)
curl -X POST http://localhost:3000/api/register/trial \
  -H "Content-Type: application/json" \
  -H "apikey: your-anon-key" \
  -d '{ ... trial data ... }'
```

### Test Unauthorized Access (Should Fail)

Try to SELECT from the tables directly without authentication:

```sql
-- In Supabase SQL Editor, run without authentication
SELECT * FROM trial_registrations;
-- Should return empty or error
```

### Test Admin Access (Should Work)

Log in as an admin user and verify you can view submissions in the database.

## Troubleshooting

### Issue: Email not sending

**Solution:**
1. Check Mailgun credentials in `.env`
2. Verify Mailgun domain is verified
3. Check server console for email errors
4. Test email service independently

### Issue: Database connection errors

**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
2. Check Supabase project is active (not paused)
3. Verify network connectivity to Supabase

### Issue: Tables not found

**Solution:**
1. Run the database migration (Step 1)
2. Verify tables exist in Supabase Table Editor
3. Check for migration errors in SQL Editor

### Issue: Validation errors

**Solution:**
1. Check browser console for detailed error messages
2. Verify all required fields are filled
3. Ensure date formats are correct
4. Check email format is valid

### Issue: CORS errors

**Solution:**
1. Ensure dev server is running on the same origin
2. Check Supabase CORS settings if using direct API calls
3. Verify API routes are properly configured

## Production Testing Checklist

Before deploying to production:

- [ ] All database tables created with correct schema
- [ ] RLS policies configured and tested
- [ ] Email templates tested with real email addresses
- [ ] Error handling tested for all edge cases
- [ ] Performance tested with multiple simultaneous submissions
- [ ] Audit logging verified
- [ ] Email deliverability tested (check spam folders)
- [ ] Mobile responsiveness verified
- [ ] Accessibility tested (keyboard navigation, screen readers)
- [ ] Analytics/tracking implemented (if required)
- [ ] Backup/recovery procedures documented

## Next Steps

After successful testing:

1. **Create Admin Dashboard**
   - Build pages to view trial registrations
   - Build pages to view contact inquiries
   - Add status management features

2. **Automated Follow-up**
   - Schedule follow-up emails for trial registrations
   - Send reminders before trial class date

3. **Analytics**
   - Track conversion rates
   - Monitor inquiry response times
   - Analyze referral sources

4. **Integration**
   - Integrate with CRM system
   - Add to staff notification system
   - Calendar integration for trial scheduling

## Support

For issues or questions:
- Check server logs: `npm run dev` console output
- Review Supabase logs in dashboard
- Consult API documentation in `/docs`
- Contact development team

---

**Happy Testing! 🎉**
