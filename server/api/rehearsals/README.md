# Rehearsal Management API Endpoints

Complete REST API for managing rehearsals, attendance, and resources.

## Overview

All endpoints require authentication. Permission requirements are noted for each endpoint.

**Base URL:** `/api`

---

## Rehearsals

### Create Rehearsal

**POST** `/api/recitals/[id]/rehearsals`

Create a new rehearsal for a recital show.

**Permissions:** `canManageRehearsals` (admin, staff)

**Request Body:**
```json
{
  "name": "Dress Rehearsal - Show A",
  "type": "dress",
  "date": "2025-05-15",
  "start_time": "09:00",
  "end_time": "14:00",
  "location": "Main Theater",
  "description": "Full run with costumes",
  "call_time": "08:45",
  "notes": "Bring all props",
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

**Response:**
```json
{
  "message": "Rehearsal created successfully",
  "rehearsal": { /* rehearsal object */ }
}
```

---

### List Rehearsals

**GET** `/api/recitals/[id]/rehearsals`

Get all rehearsals for a recital with optional filtering.

**Permissions:** Authenticated users (visibility controlled by RLS)

**Query Parameters:**
- `type` (optional): Filter by type (tech, dress, stage, full, other)
- `status` (optional): Filter by status (scheduled, in-progress, completed, cancelled)
- `date_from` (optional): Filter by start date (YYYY-MM-DD)
- `date_to` (optional): Filter by end date (YYYY-MM-DD)

**Example:**
```
GET /api/recitals/abc123/rehearsals?type=dress&status=scheduled
```

**Response:**
```json
{
  "rehearsals": [
    {
      "id": "uuid",
      "name": "Dress Rehearsal - Show A",
      "type": "dress",
      "date": "2025-05-15",
      "start_time": "09:00",
      "end_time": "14:00",
      "location": "Main Theater",
      "participant_count": 12,
      "attendance_count": 10,
      "status": "scheduled",
      ...
    }
  ]
}
```

---

### Get Rehearsal Details

**GET** `/api/rehearsals/[id]`

Get detailed information about a single rehearsal.

**Permissions:** Authenticated users (visibility controlled by RLS)

**Response:**
```json
{
  "id": "uuid",
  "recital_show_id": "uuid",
  "name": "Dress Rehearsal - Show A",
  "type": "dress",
  "date": "2025-05-15",
  "start_time": "09:00",
  "end_time": "14:00",
  "location": "Main Theater",
  "description": "Full run with costumes",
  "call_time": "08:45",
  "notes": "Bring all props",
  "requires_costumes": true,
  "requires_props": true,
  "requires_tech": true,
  "parents_allowed": false,
  "status": "scheduled",
  "participant_count": 12,
  "attendance_count": 10,
  "resource_count": 3,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

---

### Update Rehearsal

**PUT** `/api/rehearsals/[id]`

Update an existing rehearsal. Only provided fields will be updated.

**Permissions:** `canManageRehearsals` (admin, staff)

**Request Body:**
```json
{
  "name": "Updated Rehearsal Name",
  "status": "in-progress",
  "notes": "Updated notes"
}
```

**Response:**
```json
{
  "message": "Rehearsal updated successfully",
  "rehearsal": { /* updated rehearsal object */ }
}
```

---

### Delete Rehearsal

**DELETE** `/api/rehearsals/[id]`

Delete a rehearsal and all related data (participants, attendance, resources).

**Permissions:** `canManageRehearsals` (admin, staff)

**Response:**
```json
{
  "message": "Rehearsal deleted successfully"
}
```

---

## Participants

### Get Participants

**GET** `/api/rehearsals/[id]/participants`

Get all participants (classes/performances) for a rehearsal.

**Permissions:** Authenticated users (visibility controlled by RLS)

**Response:**
```json
{
  "participants": [
    {
      "id": "uuid",
      "rehearsal_id": "uuid",
      "class_instance_id": "uuid",
      "performance_id": null,
      "call_time": "09:30",
      "expected_duration": 15,
      "performance_order": 1,
      "notes": "First group",
      "class_instance": {
        "id": "uuid",
        "name": "Ballet 101",
        "class_definition": {
          "id": "uuid",
          "name": "Ballet - Beginner"
        }
      }
    }
  ]
}
```

---

## Attendance

### Get Attendance Records

**GET** `/api/rehearsals/[id]/attendance`

Get all attendance records for a rehearsal.

**Permissions:**
- Staff/admin: View all records
- Teachers: View records for their classes
- Parents: View records for their children

**Response:**
```json
{
  "attendance": [
    {
      "id": "uuid",
      "rehearsal_id": "uuid",
      "student_id": "uuid",
      "status": "present",
      "check_in_time": "2025-01-15T09:32:00Z",
      "check_out_time": null,
      "notes": "On time",
      "student": {
        "id": "uuid",
        "first_name": "Emma",
        "last_name": "Smith",
        "email": "emma@example.com"
      },
      "created_at": "2025-01-15T09:00:00Z",
      "updated_at": "2025-01-15T09:32:00Z"
    }
  ]
}
```

---

### Create Attendance Records

**POST** `/api/rehearsals/[id]/attendance`

Initialize attendance records for students participating in a rehearsal.

**Permissions:** `canManageRehearsals` (admin, staff)

**Request Body:**
```json
{
  "student_ids": [
    "uuid1",
    "uuid2",
    "uuid3"
  ]
}
```

**Response:**
```json
{
  "message": "Attendance records created successfully",
  "count": 3
}
```

---

### Update Attendance (Bulk)

**PUT** `/api/rehearsals/[id]/attendance`

Update multiple attendance records at once.

**Permissions:** `canManageRehearsals` (admin, staff, teachers)

**Request Body:**
```json
{
  "attendance": [
    {
      "id": "uuid1",
      "status": "present",
      "check_in_time": "09:32",
      "notes": "On time"
    },
    {
      "id": "uuid2",
      "status": "absent",
      "notes": "Sick"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Attendance records updated successfully",
  "updated_count": 2
}
```

---

## Resources

### Get Resources

**GET** `/api/rehearsals/[id]/resources`

Get all resources (videos, documents, links) for a rehearsal.

**Permissions:**
- All resources: Staff/admin
- Public resources only: Parents, students

**Response:**
```json
{
  "resources": [
    {
      "id": "uuid",
      "rehearsal_id": "uuid",
      "title": "Choreography Video - Act 1",
      "description": "Reference video for opening number",
      "resource_type": "video",
      "file_url": "https://storage.supabase.co/...",
      "external_url": null,
      "file_size": 52428800,
      "file_type": "video/mp4",
      "is_public": true,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### Upload Resource (File)

**POST** `/api/rehearsals/[id]/resources`

Upload a file resource (video, document, image).

**Permissions:** `canManageRehearsals` (admin, staff)

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` (required): The file to upload
- `title` (required): Resource title
- `description` (optional): Resource description
- `type` (required): Resource type (video, document, image)
- `is_public` (optional): Boolean, default false

**Example (using FormData):**
```javascript
const formData = new FormData()
formData.append('file', fileBlob)
formData.append('title', 'Choreography Video')
formData.append('description', 'Act 1 opening')
formData.append('type', 'video')
formData.append('is_public', 'true')

fetch('/api/rehearsals/abc123/resources', {
  method: 'POST',
  body: formData
})
```

**Response:**
```json
{
  "message": "Resource uploaded successfully",
  "resource": { /* resource object */ }
}
```

---

### Add External Link

**POST** `/api/rehearsals/[id]/resources`

Add an external link resource (YouTube, Google Drive, etc.).

**Permissions:** `canManageRehearsals` (admin, staff)

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "title": "YouTube Choreography Video",
  "description": "Reference performance",
  "type": "link",
  "external_url": "https://youtube.com/watch?v=...",
  "is_public": true
}
```

**Response:**
```json
{
  "message": "Resource uploaded successfully",
  "resource": { /* resource object */ }
}
```

---

### Delete Resource

**DELETE** `/api/rehearsals/resources/[id]`

Delete a resource (removes both database record and file from storage).

**Permissions:** `canManageRehearsals` (admin, staff)

**Response:**
```json
{
  "message": "Resource deleted successfully"
}
```

---

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "statusMessage": "Validation error message"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "statusMessage": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "statusCode": 500,
  "statusMessage": "Error description"
}
```

---

## Database Schema

The API interacts with the following tables:

- `recital_rehearsals` - Main rehearsal records
- `rehearsal_participants` - Classes/performances in rehearsal
- `rehearsal_attendance` - Student attendance tracking
- `rehearsal_resources` - Files and links

See `/docs/tier1/DATABASE-IMPLEMENTATION-GUIDE.md` for complete schema.

---

## Storage Buckets

**Bucket:** `rehearsal-resources`

**Structure:** `rehearsals/[rehearsal_id]/[timestamp]_[filename]`

**Access:** Controlled by RLS policies based on `is_public` flag

---

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. All IDs are UUIDs
3. File uploads support up to 500MB (configurable)
4. Supported file types: videos (mp4, mov, avi), documents (pdf, doc, docx), images (jpg, png, gif)
5. RLS policies automatically filter results based on user role and permissions
