# Student Photos Storage Setup

This document explains how to properly configure the Supabase Storage bucket for student profile photos to ensure privacy and security.

## Overview

Student photos are sensitive data (children's images) and **MUST be stored in a private bucket** with proper access controls. The application stores file paths in the database and generates signed URLs on-demand when photos are accessed.

## Bucket Configuration

### 1. Create Private Bucket

In Supabase Dashboard:

1. Go to **Storage** > **Buckets**
2. Click **New bucket**
3. Bucket name: `student-photos`
4. **IMPORTANT**: Set bucket to **Private** (not public)
5. File size limit: 5 MB (enforced in code as well)
6. Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`

### 2. Configure Storage Policies

Set up Row Level Security (RLS) policies to control access:

```sql
-- Policy 1: Allow parents to upload photos for their own students
CREATE POLICY "Parents can upload student photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-photos'
  AND auth.uid() IN (
    SELECT g.user_id
    FROM guardians g
    JOIN student_guardian_relationships sgr ON sgr.guardian_id = g.id
    JOIN students s ON s.id = sgr.student_id
    WHERE storage.foldername(name)[1] = s.id::text
  )
);

-- Policy 2: Allow parents to view photos of their own students
CREATE POLICY "Parents can view their students' photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-photos'
  AND auth.uid() IN (
    SELECT g.user_id
    FROM guardians g
    JOIN student_guardian_relationships sgr ON sgr.guardian_id = g.id
    JOIN students s ON s.id = sgr.student_id
    WHERE storage.foldername(name)[1] = s.id::text
  )
);

-- Policy 3: Allow parents to delete photos of their own students
CREATE POLICY "Parents can delete their students' photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-photos'
  AND auth.uid() IN (
    SELECT g.user_id
    FROM guardians g
    JOIN student_guardian_relationships sgr ON sgr.guardian_id = g.id
    JOIN students s ON s.id = sgr.student_id
    WHERE storage.foldername(name)[1] = s.id::text
  )
);

-- Policy 4: Allow staff and admin full access
CREATE POLICY "Staff can manage all student photos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'student-photos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);
```

## How It Works

### 1. File Storage Pattern

- **Naming Convention**: `student-{studentId}-{timestamp}.jpg`
- **Thumbnails**: `student-{studentId}-{timestamp}-thumb.jpg`
- **Location**: All files stored in root of `student-photos` bucket

### 2. Database Storage

The `students` table stores **file paths** (not URLs):

```sql
ALTER TABLE students
ADD COLUMN photo_url TEXT,           -- Stores: "student-abc123-1234567890.jpg"
ADD COLUMN photo_thumbnail_url TEXT; -- Stores: "student-abc123-1234567890-thumb.jpg"
```

### 3. Signed URL Generation

When students are fetched via API, the server:

1. Retrieves student records with file paths from database
2. Generates temporary signed URLs (valid for 1 hour) using `createSignedUrl()`
3. Returns students with signed URLs to client
4. Client displays photos using signed URLs

**Benefits:**
- File paths don't expire (stable database records)
- Signed URLs provide time-limited access
- Each request gets fresh URLs
- No need to update database when URLs expire

### 4. Upload Process

```typescript
// 1. Optimize and create thumbnail with Sharp
const optimized = await sharp(file).resize(800, 800).jpeg({ quality: 85 }).toBuffer()
const thumbnail = await sharp(file).resize(150, 150).jpeg({ quality: 80 }).toBuffer()

// 2. Upload both files (atomic - both must succeed)
await Promise.all([
  storage.upload('student-123-timestamp.jpg', optimized),
  storage.upload('student-123-timestamp-thumb.jpg', thumbnail)
])

// 3. Store file paths in database
await db.students.update({
  photo_url: 'student-123-timestamp.jpg',
  photo_thumbnail_url: 'student-123-timestamp-thumb.jpg'
})

// 4. Return signed URLs for immediate display
const signedUrl = await storage.createSignedUrl(path, 3600) // 1 hour
```

## Security Features

### ✅ Privacy Protection

- **Private bucket**: Photos not accessible via public URLs
- **Signed URLs**: Time-limited access (1 hour expiration)
- **RLS policies**: Parents can only access their own students' photos
- **Server-side validation**: User authentication and relationship verification

### ✅ Data Integrity

- **Atomic uploads**: Both photo and thumbnail must succeed or operation fails
- **Cleanup on failure**: Uploaded files deleted if database update fails
- **File path validation**: Only valid file names stored in database

### ✅ Performance Optimization

- **Image optimization**: Photos resized to max 800x800, 85% quality
- **Thumbnails**: 150x150 thumbnails for grid views (95% bandwidth savings)
- **Efficient storage**: JPEG format with optimized quality settings
- **Lazy URL generation**: Signed URLs created only when needed

## Testing Checklist

- [ ] Bucket is set to **Private** (not public)
- [ ] RLS policies are enabled on storage.objects
- [ ] Parents can upload photos for their own students
- [ ] Parents **cannot** upload photos for other students
- [ ] Parents can view photos of their own students
- [ ] Parents **cannot** view photos of other students
- [ ] Staff/admin can view all student photos
- [ ] Signed URLs expire after 1 hour
- [ ] Old photos are deleted when new photos uploaded
- [ ] Upload fails atomically if thumbnail generation fails

## Troubleshooting

### Photos not displaying

1. Check bucket is configured as **Private**
2. Verify RLS policies are enabled
3. Check signed URL hasn't expired (regenerated on each API call)
4. Verify file paths stored in database are correct

### Upload failures

1. Check file size is under 5MB
2. Verify file type is allowed (JPEG, PNG, WEBP, GIF)
3. Check Supabase Storage quotas
4. Verify bucket permissions allow uploads

### Access denied errors

1. Verify user is authenticated
2. Check guardian-student relationship exists in database
3. Verify RLS policies match current schema
4. Check user role has appropriate permissions

## Migration Notes

If you previously used public URLs, you'll need to:

1. Set bucket to private
2. Update existing records: URLs → file paths
3. Apply RLS policies
4. Restart application to use new signed URL flow

```sql
-- Extract file names from existing URLs
UPDATE students
SET
  photo_url = substring(photo_url from '[^/]+$'),
  photo_thumbnail_url = substring(photo_thumbnail_url from '[^/]+$')
WHERE
  photo_url LIKE '%supabase%'
  OR photo_thumbnail_url LIKE '%supabase%';
```

## Maintenance

### URL Expiration

- Signed URLs expire after 1 hour
- New URLs generated automatically on each API request
- No manual refresh needed
- No database updates required

### Storage Cleanup

Old photos are automatically deleted when:
- New photo is uploaded (replaces old)
- Student is deleted (cascade delete)
- Photo is explicitly removed by parent

### Monitoring

Monitor:
- Storage bucket size
- Number of signed URL generations
- Failed upload attempts
- Access denied errors

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Signed URLs Documentation](https://supabase.com/docs/guides/storage/uploads/signed-urls)
