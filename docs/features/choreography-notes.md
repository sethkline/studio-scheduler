# Choreography Notes Feature

**Story 5.3.4: Choreography Notes**
**User Story:** AS A teacher, I WANT to document choreography SO THAT I can remember and recreate routines

## Overview

The Choreography Notes feature allows teachers to document, organize, and manage choreography for their classes. This comprehensive system includes text notes with counts, video uploads, music links, dancer formations with stage positioning, and automatic version history tracking.

## Features Implemented

### ✅ Acceptance Criteria Met

1. **Text notes with counts** - Rich text editor for detailed choreography documentation with counts notation
2. **Video upload of routine** - Upload and playback of routine videos via Supabase Storage
3. **Link to music** - Music title, artist, and external links (Spotify, YouTube, etc.)
4. **Dancer formations** - Visual formation editor with stage positioning and dancer management
5. **Version history** - Automatic version tracking with change history

## Database Schema

### Tables Created

#### `choreography_notes`
Main table for choreography documentation:
- `id` - UUID primary key
- `class_instance_id` - Links to specific class instance
- `teacher_id` - Links to teacher who created it
- `title` - Choreography title
- `description` - Brief description
- `notes` - Detailed choreography notes with counts
- `music_title`, `music_artist`, `music_link` - Music information
- `video_url` - Supabase Storage URL for uploaded video
- `counts_notation` - Structured counts (e.g., "8-count intro, 16-count verse")
- `version` - Current version number (auto-incremented)
- `is_active` - Soft delete flag
- Timestamps and audit fields

#### `choreography_formations`
Stores dancer formations and positions:
- `id` - UUID primary key
- `choreography_note_id` - Links to choreography note
- `formation_name` - Name of formation (e.g., "Opening Formation")
- `formation_order` - Order in routine sequence
- `formation_data` - JSONB storing dancer positions and details
- `stage_diagram_url` - Optional uploaded diagram
- `notes` - Formation notes
- Timestamps

**Formation Data Structure:**
```json
{
  "dancers": [
    {
      "name": "Dancer Name",
      "position": {
        "x": 50,  // Stage position X (0-100)
        "y": 50   // Stage position Y (0-100)
      },
      "notes": "Center stage, facing audience"
    }
  ],
  "stageNotes": "Additional formation notes",
  "timing": "Measure 8-16"
}
```

#### `choreography_versions`
Automatic version history:
- `id` - UUID primary key
- `choreography_note_id` - Links to choreography note
- `version` - Version number
- Complete snapshot of previous version data
- `formations_snapshot` - JSONB snapshot of formations
- `change_summary` - Optional change description
- Timestamps

### Automatic Version History

A database trigger automatically creates version snapshots when significant content changes occur:
- Changes to notes, music, video URL, or counts notation trigger version creation
- Version number auto-increments
- Previous state is preserved in `choreography_versions` table
- Formation states are captured as JSONB snapshot

## Security & Permissions

### Row Level Security (RLS)

All tables have RLS policies enabled:

**Teachers can:**
- View their own choreography notes
- Create new choreography notes for their classes
- Update their own choreography notes
- Delete their own choreography notes (soft delete)
- Manage formations for their choreography notes

**Admin and Staff can:**
- View all choreography notes
- Create choreography notes for any teacher/class
- Update any choreography note
- Delete any choreography note (admin can hard delete)
- Manage all formations

**Students and Parents:**
- No access to choreography notes (teacher-only feature)

### Route Protection

Pages use the `teacher` middleware, which allows:
- Teachers
- Staff
- Admin

Parents and students are redirected if they attempt to access choreography pages.

## API Endpoints

### Choreography Notes

- `GET /api/choreography` - List choreography notes with filters
  - Query params: `class_instance_id`, `teacher_id`, `search`
- `GET /api/choreography/[id]` - Get single note with formations and versions
- `POST /api/choreography` - Create new choreography note
- `PUT /api/choreography/[id]` - Update choreography note (creates version)
- `DELETE /api/choreography/[id]` - Delete note (soft delete, or `?hard=true` for permanent)

### Formations

- `POST /api/choreography/formations` - Create formation
- `PUT /api/choreography/formations/[id]` - Update formation
- `DELETE /api/choreography/formations/[id]` - Delete formation

### Video Upload

- `POST /api/choreography/video-upload` - Upload video file
  - Uses multipart/form-data
  - Validates file type (mp4, mov, avi, webm)
  - Max size: 100MB
  - Stores in Supabase Storage bucket: `choreography-videos`

## Frontend Components

### Pages

- `/pages/choreography/index.vue` - List view of all choreography notes
- `/pages/choreography/[id].vue` - Detail view with formations and version history

### Components

- `ChoreographyNotesList.vue` - Grid display of choreography notes with search/filters
- `ChoreographyNoteEditor.vue` - Create/edit choreography note dialog
- `FormationEditor.vue` - Formation creator with visual stage positioning

### Composable

- `useChoreographyService.ts` - Service layer for all choreography operations
  - `fetchChoreographyNotes()` - Get list with filters
  - `fetchChoreographyNote()` - Get single note details
  - `createChoreographyNote()` - Create new note
  - `updateChoreographyNote()` - Update note
  - `deleteChoreographyNote()` - Delete note
  - `createFormation()` - Add formation
  - `updateFormation()` - Update formation
  - `deleteFormation()` - Delete formation
  - `uploadVideo()` - Upload video with progress tracking

## User Interface

### Choreography List Page

- Grid layout with cards showing:
  - Video thumbnail (if available) or default music icon
  - Choreography title and description
  - Class information with color-coded badge
  - Music information
  - Counts notation
  - Formation count
  - Version number
  - Last updated date
- Search and filters:
  - Text search (title, notes, music)
  - Filter by class instance
- Context menu for edit/delete actions

### Choreography Detail Page

**Left Column:**
- Video player (if uploaded)
- Music information with external link button
- Counts notation display

**Right Column:**
- Detailed choreography notes (monospace font for formatting)
- Formations list with add/edit/delete
- Each formation shows:
  - Formation name
  - Order in sequence
  - Notes
  - Dancer count

**Version History Panel:**
- Expandable list of previous versions
- Shows version number, date, and changes
- Preserves complete history of edits

### Formation Editor

- Formation name and order
- Notes field
- Dancer management:
  - Add/remove dancers
  - Name and position notes
  - Stage positioning with X/Y sliders
  - Visual stage preview showing dancer positions
- Stage diagram:
  - 0-100 scale for X (Stage Left to Stage Right)
  - 0-100 scale for Y (Upstage to Downstage)
  - Numbered dots representing dancers
  - Stage labels (SL, SR, Upstage, Downstage)

### Video Upload

- Drag-and-drop file selection
- Upload progress bar
- Video preview after upload
- Replace/remove video options
- File type validation
- Size limit enforcement (100MB)

## Usage Flow

### Creating Choreography Notes

1. Navigate to "Choreography Notes" from sidebar
2. Click "New Choreography Note"
3. Fill in:
   - Title (required)
   - Select class (required)
   - Description
   - Detailed notes with counts
   - Counts notation
   - Music information (title, artist, link)
4. Save to create note
5. After saving, upload video if desired
6. Add formations as needed

### Managing Formations

1. Open choreography note detail page
2. Click "Add Formation" in Formations section
3. Enter formation details:
   - Name (e.g., "Opening Formation")
   - Order in sequence
   - Notes
4. Add dancers:
   - Click "Add Dancer"
   - Enter dancer name
   - Set stage position using sliders
   - Add position notes
   - Preview on visual stage diagram
5. Save formation

### Version History

- Versions are created automatically on save if content changes
- View version history by clicking history icon
- Each version shows:
  - Version number
  - Date/time created
  - Previous title and content
  - Formation snapshot at that time

## Technical Notes

### Storage

- Videos stored in Supabase Storage bucket: `choreography-videos`
- File naming: `{choreography_id}-{timestamp}.{extension}`
- Public URLs generated for playback

### Performance

- Database indexes on:
  - `choreography_notes.class_instance_id`
  - `choreography_notes.teacher_id`
  - `choreography_formations.choreography_note_id`
  - `choreography_versions.choreography_note_id` and `version`

### Soft Deletes

- Default delete is soft (sets `is_active = false`)
- Hard delete available via API with `?hard=true` parameter
- Only admin can perform hard deletes

### Formation Data

- Stored as JSONB for flexibility
- Allows complex formation structures
- Easily extensible for future enhancements (e.g., dancer paths, transitions)

## Future Enhancements

Potential additions for future iterations:

1. **Animation/Transitions** - Add dancer movement paths between formations
2. **Stage Templates** - Pre-defined stage layouts (proscenium, thrust, arena)
3. **Dancer Photos** - Link dancers to student profiles with photos
4. **Print/Export** - PDF export of choreography notes
5. **Sharing** - Share choreography with other teachers or guest choreographers
6. **Music Upload** - Store music files instead of just links
7. **Rehearsal Notes** - Add rehearsal-specific notes and progress tracking
8. **Choreography Templates** - Save and reuse common formations/sequences

## Testing

To test this feature:

1. **Database Setup:**
   ```bash
   # Run migration in Supabase SQL editor
   # Execute the contents of docs/database/choreography-migration.sql
   ```

2. **Create Test Data:**
   - Login as a teacher
   - Navigate to Choreography Notes
   - Create sample choreography notes
   - Add formations with dancers
   - Upload a test video

3. **Test Scenarios:**
   - Create, edit, delete choreography notes
   - Add, edit, delete formations
   - Upload and remove videos
   - View version history
   - Test search and filters
   - Verify permissions (teacher can only see their own, admin sees all)

## Files Modified/Created

### Database
- `docs/database/choreography-migration.sql` - Database schema and migrations

### Types
- `types/choreography.ts` - TypeScript interfaces
- `types/index.ts` - Export choreography types

### API
- `server/api/choreography/index.get.ts` - List choreography notes
- `server/api/choreography/index.post.ts` - Create choreography note
- `server/api/choreography/[id].get.ts` - Get single note
- `server/api/choreography/[id].put.ts` - Update note
- `server/api/choreography/[id].delete.ts` - Delete note
- `server/api/choreography/formations/index.post.ts` - Create formation
- `server/api/choreography/formations/[id].put.ts` - Update formation
- `server/api/choreography/formations/[id].delete.ts` - Delete formation
- `server/api/choreography/video-upload.post.ts` - Video upload

### Composables
- `composables/useChoreographyService.ts` - Service layer

### Components
- `components/choreography/ChoreographyNotesList.vue` - List view
- `components/choreography/ChoreographyNoteEditor.vue` - Note editor
- `components/choreography/FormationEditor.vue` - Formation editor
- `components/AppSidebar.vue` - Added navigation link

### Pages
- `pages/choreography/index.vue` - Choreography notes list page
- `pages/choreography/[id].vue` - Choreography note detail page

### Documentation
- `docs/features/choreography-notes.md` - This file

## Migration Instructions

1. **Run Database Migration:**
   - Open Supabase SQL Editor
   - Copy and paste contents of `docs/database/choreography-migration.sql`
   - Execute to create tables, indexes, RLS policies, and triggers

2. **Create Storage Bucket:**
   ```sql
   -- In Supabase Storage, create bucket
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('choreography-videos', 'choreography-videos', true);
   ```

3. **Deploy Code:**
   - All code is ready to deploy
   - No additional configuration needed
   - Feature is behind `teacher` middleware

## Support

For questions or issues with the Choreography Notes feature, contact the development team or create an issue in the project repository.
