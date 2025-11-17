# Rehearsal Management - Setup Guide

Complete setup instructions for the Rehearsal Management feature (Tier 1, Feature #1).

## ✅ What's Already Complete

The following have been implemented and committed:

1. **Database Schema** ✅
   - Tables: `recital_rehearsals`, `rehearsal_participants`, `rehearsal_attendance`, `rehearsal_resources`
   - Migrations applied to Supabase (see IMPLEMENTATION-COMPLETION-REPORT.md)
   - 23 RLS policies configured
   - 9 triggers for automatic updates

2. **TypeScript Types** ✅
   - `types/tier1-features.ts` - All rehearsal-related interfaces
   - Exported from `types/index.ts`

3. **Design System** ✅
   - `lib/design-system.ts` - Typography, colors, components
   - Reusable UI components in `components/common/`

4. **UI Components** ✅
   - `components/rehearsal/RehearsalListPage.vue` - List view with filtering
   - `components/rehearsal/CreateRehearsalModal.vue` - Create/edit form
   - `components/rehearsal/RehearsalDetailPage.vue` - Detail view with tabs
   - `components/rehearsal/RehearsalAttendanceTracker.vue` - Attendance management
   - `components/rehearsal/RehearsalResourceManager.vue` - File/link management

5. **API Endpoints** ✅
   - 13 endpoints for CRUD, attendance, resources, participants
   - See `server/api/rehearsals/README.md` for complete documentation

6. **Nuxt Pages** ✅
   - `/pages/recitals/[id]/rehearsals/index.vue` - List page
   - `/pages/recitals/[id]/rehearsals/[rehearsalId].vue` - Detail page

7. **Navigation** ✅
   - Added "Rehearsals" link to RecitalQuickLinks component

---

## ⚙️ Required Setup Steps

### 1. Create Supabase Storage Bucket

The resource upload feature requires a Supabase storage bucket.

**Steps:**

1. Go to Supabase Dashboard → Storage
2. Click "Create new bucket"
3. Configure:
   - **Name:** `rehearsal-resources`
   - **Public:** ❌ No (we'll use RLS)
   - **File size limit:** 500 MB (or as needed)
   - **Allowed MIME types:** (leave empty for all, or specify: video/*, application/pdf, image/*)

4. Click "Create bucket"

### 2. Set Storage RLS Policies

Apply Row Level Security policies to control file access.

**Navigate to:** Storage → rehearsal-resources → Policies

**Policy 1: Staff Can Upload**
```sql
-- Name: Staff can upload rehearsal resources
-- Operation: INSERT

CREATE POLICY "Staff can upload rehearsal resources"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rehearsal-resources' AND
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  )
);
```

**Policy 2: Staff Can Delete**
```sql
-- Name: Staff can delete rehearsal resources
-- Operation: DELETE

CREATE POLICY "Staff can delete rehearsal resources"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'rehearsal-resources' AND
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  )
);
```

**Policy 3: Authenticated Users Can View Public Resources**
```sql
-- Name: Authenticated users can view public resources
-- Operation: SELECT

CREATE POLICY "Authenticated users can view public resources"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'rehearsal-resources' AND
  (
    -- Staff can see all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff', 'teacher')
    )
    OR
    -- Parents/students can see public resources
    EXISTS (
      SELECT 1 FROM rehearsal_resources
      WHERE rehearsal_resources.file_url LIKE '%' || name || '%'
      AND rehearsal_resources.is_public = true
    )
  )
);
```

### 3. Update Environment Variables (if needed)

Verify your `.env` file has the required Supabase keys:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

These should already be configured if you have other Supabase features working.

### 4. Restart Development Server

After creating the storage bucket:

```bash
npm run dev
```

---

## 🧪 Testing the Implementation

### Test Checklist

**1. Navigation**
- [ ] Navigate to `/recitals/[id]/hub`
- [ ] Click "Rehearsals" in Quick Actions
- [ ] Should load rehearsals list page

**2. Create Rehearsal**
- [ ] Click "Create Rehearsal" button
- [ ] Fill in required fields (name, type, date, times)
- [ ] Set requirements (costumes, props, tech)
- [ ] Click "Create Rehearsal"
- [ ] Should see success and new rehearsal in list

**3. Filter Rehearsals**
- [ ] Use type filter (tech, dress, stage, full)
- [ ] Use status filter (scheduled, completed, etc.)
- [ ] Use date range filters
- [ ] Click "Apply Filters" - results should update

**4. View Details**
- [ ] Click on a rehearsal card
- [ ] Should see detail page with tabs
- [ ] Verify Details tab shows all info
- [ ] Verify Requirements checklist displays correctly

**5. Attendance Tracking**
- [ ] Go to Attendance tab
- [ ] Change student status (present, absent, excused, late)
- [ ] Set check-in times
- [ ] Add notes
- [ ] Click "Save Attendance"
- [ ] Should see success message

**6. Resource Management**
- [ ] Go to Resources tab
- [ ] Click "Add Resource"
- [ ] Upload a video file (test with small file)
- [ ] Should see upload progress
- [ ] Should see resource in list
- [ ] Click "Download" - should open/download file
- [ ] Delete resource - should be removed

**7. External Links**
- [ ] Click "Add Resource"
- [ ] Select type "External Link"
- [ ] Add YouTube or Google Drive URL
- [ ] Click "Add Link"
- [ ] Should appear in resources
- [ ] Click "Open" - should open in new tab

**8. Edit Rehearsal**
- [ ] From detail page, click "Edit Rehearsal"
- [ ] Update name or time
- [ ] Click "Update Rehearsal"
- [ ] Changes should be saved

**9. Delete Rehearsal**
- [ ] From detail page, click "Delete"
- [ ] Should see confirmation modal
- [ ] Click "Delete Rehearsal"
- [ ] Should redirect to list
- [ ] Rehearsal should be removed

**10. Permissions**
- [ ] Test as parent user (should see children's rehearsals only)
- [ ] Test as teacher (should see and manage)
- [ ] Test as staff/admin (full access)

---

## 🔍 Troubleshooting

### "Failed to upload file" Error

**Cause:** Storage bucket not created or RLS policies not applied

**Fix:**
1. Verify bucket exists: Supabase Dashboard → Storage
2. Check RLS policies are enabled
3. Check browser console for detailed error

### "Failed to fetch rehearsals" Error

**Cause:** API endpoint issue or database connection problem

**Fix:**
1. Check server console for errors
2. Verify database tables exist (run verification queries from DATABASE-IMPLEMENTATION-GUIDE.md)
3. Check Supabase connection in `.env`

### Rehearsals List is Empty

**Cause:** No rehearsals created yet, or RLS filtering

**Fix:**
1. Create a test rehearsal
2. Check your user role in profiles table
3. Verify RLS policies allow your role to view rehearsals

### Images/Videos Not Loading

**Cause:** Storage bucket permissions or incorrect URLs

**Fix:**
1. Check storage RLS policies
2. Verify `is_public` flag is set correctly
3. Check browser network tab for 403 errors

### Attendance Not Saving

**Cause:** No attendance records initialized

**Fix:**
1. First create attendance records using the "Initialize Attendance" endpoint
2. Or manually insert records via SQL
3. Check that student_ids match existing students

---

## 📊 Database Verification

Run these queries to verify everything is set up:

```sql
-- Check rehearsals table exists
SELECT COUNT(*) FROM recital_rehearsals;

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('recital_rehearsals', 'rehearsal_attendance', 'rehearsal_resources')
ORDER BY tablename, policyname;

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table LIKE 'rehearsal%';

-- View sample data
SELECT
  id,
  name,
  type,
  date,
  status
FROM recital_rehearsals
ORDER BY date DESC
LIMIT 5;
```

---

## 🚀 Next Steps

Once Rehearsal Management is working:

1. **Test with Real Data**
   - Create rehearsals for an actual recital
   - Track real attendance
   - Upload actual rehearsal videos

2. **Train Users**
   - Show staff how to create rehearsals
   - Train teachers on attendance tracking
   - Show parents how to view schedules

3. **Monitor Usage**
   - Check for any errors in logs
   - Gather user feedback
   - Make UX improvements as needed

4. **Implement Tier 1 Feature #2**
   - Move on to Recital Fees & Payment Tracking
   - Similar database → API → UI flow

---

## 📚 Related Documentation

- [DATABASE-IMPLEMENTATION-GUIDE.md](./DATABASE-IMPLEMENTATION-GUIDE.md) - Database schema and verification
- [IMPLEMENTATION-COMPLETION-REPORT.md](./IMPLEMENTATION-COMPLETION-REPORT.md) - What's been completed
- [server/api/rehearsals/README.md](../../server/api/rehearsals/README.md) - API documentation
- [UX-UI-REVIEW-AND-RECOMMENDATIONS.md](./UX-UI-REVIEW-AND-RECOMMENDATIONS.md) - UX guidelines

---

## 🆘 Support

If you encounter issues:

1. Check this setup guide
2. Review API documentation in `server/api/rehearsals/README.md`
3. Check Supabase Dashboard for errors
4. Review browser console and server logs
5. Verify database tables and RLS policies

**Common issues are documented in the Troubleshooting section above.**
