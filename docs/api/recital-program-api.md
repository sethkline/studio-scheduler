# Recital Program Management API Documentation

This document provides detailed information about the Recital Program Management API endpoints implemented as part of Epic 1. These endpoints enable studio administrators to create, manage, and generate professional recital programs.

## Table of Contents

1. [General Information](#general-information)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [API Endpoints](#api-endpoints)
   - [Get Program Details](#get-program-details)
   - [Create/Update Program](#createupdate-program)
   - [Upload Cover Image](#upload-cover-image)
   - [Add Advertisement](#add-advertisement)
   - [Delete Advertisement](#delete-advertisement)
   - [Update Advertisement Position](#update-advertisement-position)
   - [Save Artistic Director's Note](#save-artistic-directors-note)
   - [Save Acknowledgments](#save-acknowledgments)
   - [Update Performance Order](#update-performance-order)
   - [Update Performance Details](#update-performance-details)
   - [Generate Program PDF](#generate-program-pdf)

## General Information

- Base URL: `/api/recitals`
- All responses are in JSON format, except for the PDF export endpoint
- All timestamps are in ISO 8601 format
- All IDs are UUIDs

## Authentication

All API endpoints require authentication. The application uses Supabase authentication, and all API requests must include a valid JWT token in the `Authorization` header.

```
Authorization: Bearer <token>
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

- `200 OK`: The request was successful
- `400 Bad Request`: The request was invalid or missing required parameters
- `401 Unauthorized`: Authentication is required or failed
- `403 Forbidden`: The authenticated user does not have access to the requested resource
- `404 Not Found`: The requested resource was not found
- `500 Internal Server Error`: An error occurred on the server

Error responses have the following format:

```json
{
  "statusCode": 400,
  "statusMessage": "Missing required fields"
}
```

## API Endpoints

### Get Program Details

Retrieves all program details for a specific recital.

**Endpoint:** `GET /api/recitals/:id/program`

**URL Parameters:**
- `id` (required): UUID of the recital

**Response:**

```json
{
  "recital": {
    "id": "uuid",
    "name": "Spring Recital 2025",
    "description": "Annual spring showcase",
    "date": "2025-05-15",
    "location": "Main Theater",
    "theme": "Dancing Through the Decades",
    "program_notes": "Special event notes"
  },
  "program": {
    "id": "uuid",
    "cover_image_url": "https://example.com/cover.jpg",
    "artistic_director_note": "Director's note content",
    "acknowledgments": "Acknowledgments content"
  },
  "advertisements": [
    {
      "id": "uuid",
      "title": "Advertisement Title",
      "description": "Advertisement description",
      "image_url": "https://example.com/ad.jpg",
      "order_position": 0
    }
  ],
  "performances": [
    {
      "id": "uuid",
      "performance_order": 0,
      "song_title": "Dancing Queen",
      "song_artist": "ABBA",
      "duration": 180,
      "notes": "Performance notes",
      "choreographer": "Jane Smith",
      "class_instance": {
        "id": "uuid",
        "name": "Ballet Intermediate",
        "class_definition": {
          "id": "uuid",
          "name": "Ballet Level 2",
          "dance_style": {
            "id": "uuid",
            "name": "Ballet",
            "color": "#FF5733"
          }
        }
      }
    }
  ]
}
```

**Notes:**
- If the recital does not have a program yet, the `program` field will be `null`
- If no advertisements are found, the `advertisements` array will be empty
- If no performances are found, the `performances` array will be empty

### Create/Update Program

Creates a new program or updates an existing one for a specific recital.

**Endpoint:** `POST /api/recitals/:id/program`

**URL Parameters:**
- `id` (required): UUID of the recital

**Request Body:**

```json
{
  "artistic_director_note": "Director's note content",
  "acknowledgments": "Acknowledgments content"
}
```

**Response:**

```json
{
  "created": true,  // or "updated": true
  "program": {
    "id": "uuid",
    "recital_id": "uuid",
    "artistic_director_note": "Director's note content",
    "acknowledgments": "Acknowledgments content",
    "cover_image_url": null,
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

**Notes:**
- This endpoint will create a new program if one does not exist, or update an existing one
- The response will include either `created: true` or `updated: true` to indicate which action was taken
- The cover image is managed separately via the Upload Cover Image endpoint

### Upload Cover Image

Uploads a cover image for the recital program.

**Endpoint:** `PUT /api/recitals/:id/program/cover`

**URL Parameters:**
- `id` (required): UUID of the recital

**Request:**
- Content-Type: `multipart/form-data`
- Include the image file with field name `file`

**Response:**

```json
{
  "message": "Cover image uploaded successfully",
  "program": {
    "id": "uuid",
    "recital_id": "uuid",
    "cover_image_url": "https://example.com/cover.jpg",
    "artistic_director_note": "Director's note content",
    "acknowledgments": "Acknowledgments content",
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

**Notes:**
- If a program does not exist for this recital, one will be created
- Supported image formats: JPEG, PNG, GIF
- Maximum file size: 5MB
- The previous image (if any) will be automatically deleted from storage

### Add Advertisement

Adds a new advertisement to the recital program.

**Endpoint:** `POST /api/recitals/:id/program/advertisements`

**URL Parameters:**
- `id` (required): UUID of the recital

**Request:**
- Content-Type: `multipart/form-data`
- Include a JSON object with the advertisement details with field name `data`:
  ```json
  {
    "title": "Advertisement Title",
    "description": "Advertisement description"
  }
  ```
- Optionally include an image file with field name matching the content-type (e.g., `image/jpeg`, `image/png`)

**Response:**

```json
{
  "message": "Advertisement added successfully",
  "advertisement": {
    "id": "uuid",
    "recital_program_id": "uuid",
    "title": "Advertisement Title",
    "description": "Advertisement description",
    "image_url": "https://example.com/ad.jpg",
    "order_position": 1,
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

**Notes:**
- If a program does not exist for this recital, one will be created
- Supported image formats: JPEG, PNG, GIF
- Maximum file size: 5MB
- The advertisement will be added at the end of the current advertisement list

### Delete Advertisement

Deletes an advertisement from the recital program.

**Endpoint:** `DELETE /api/recitals/:id/program/advertisements/:adId`

**URL Parameters:**
- `id` (required): UUID of the recital
- `adId` (required): UUID of the advertisement to delete

**Response:**

```json
{
  "message": "Advertisement deleted successfully"
}
```

**Notes:**
- The advertisement's image file (if any) will be automatically deleted from storage
- After deletion, the remaining advertisements will be reordered to ensure sequential order_position values

### Update Advertisement Position

Updates the position of an advertisement within the recital program.

**Endpoint:** `PUT /api/recitals/:id/program/advertisements/:adId/position`

**URL Parameters:**
- `id` (required): UUID of the recital
- `adId` (required): UUID of the advertisement

**Request Body:**

```json
{
  "position": 2
}
```

**Response:**

```json
{
  "message": "Advertisement position updated successfully",
  "advertisement": {
    "id": "uuid",
    "recital_program_id": "uuid",
    "title": "Advertisement Title",
    "description": "Advertisement description",
    "image_url": "https://example.com/ad.jpg",
    "order_position": 2,
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

**Notes:**
- If the new position is the same as the current position, no changes will be made
- If the new position is less than 0, it will be set to 0
- If the new position is greater than the number of advertisements - 1, it will be set to the last position
- All affected advertisements will have their positions updated accordingly

### Save Artistic Director's Note

Updates the artistic director's note in the recital program.

**Endpoint:** `PUT /api/recitals/:id/program/artistic-note`

**URL Parameters:**
- `id` (required): UUID of the recital

**Request Body:**

```json
{
  "note": "The artistic director's note content with formatting..."
}
```

**Response:**

```json
{
  "message": "Artistic director note updated successfully",
  "created": true,  // or "updated": true
  "program": {
    "id": "uuid",
    "recital_id": "uuid",
    "artistic_director_note": "The artistic director's note content with formatting...",
    "acknowledgments": "Acknowledgments content",
    "cover_image_url": "https://example.com/cover.jpg",
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

**Notes:**
- If a program does not exist for this recital, one will be created
- The note can include HTML formatting for rich text support
- The response will include either `created: true` or `updated: true` to indicate which action was taken

### Save Acknowledgments

Updates the acknowledgments section in the recital program.

**Endpoint:** `PUT /api/recitals/:id/program/acknowledgments`

**URL Parameters:**
- `id` (required): UUID of the recital

**Request Body:**

```json
{
  "acknowledgments": "The acknowledgments content with formatting..."
}
```

**Response:**

```json
{
  "message": "Acknowledgments updated successfully",
  "created": true,  // or "updated": true
  "program": {
    "id": "uuid",
    "recital_id": "uuid",
    "artistic_director_note": "Director's note content",
    "acknowledgments": "The acknowledgments content with formatting...",
    "cover_image_url": "https://example.com/cover.jpg",
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

**Notes:**
- If a program does not exist for this recital, one will be created
- The acknowledgments can include HTML formatting for rich text support
- The response will include either `created: true` or `updated: true` to indicate which action was taken

### Update Performance Order

Updates the order of performances in the recital program.

**Endpoint:** `PUT /api/recitals/:id/performances/reorder`

**URL Parameters:**
- `id` (required): UUID of the recital

**Request Body:**

```json
{
  "performanceOrder": [
    "uuid-of-performance-3",
    "uuid-of-performance-1",
    "uuid-of-performance-2"
  ]
}
```

**Response:**

```json
{
  "message": "Performance order updated successfully",
  "performances": [
    {
      "id": "uuid-of-performance-3",
      "performance_order": 0,
      "song_title": "Third Song Title",
      "song_artist": "Third Artist",
      "duration": 180,
      "notes": "Performance notes",
      "choreographer": "Jane Smith",
      "class_instance": {
        "id": "uuid",
        "name": "Ballet Intermediate",
        "class_definition": {
          "id": "uuid",
          "name": "Ballet Level 2",
          "dance_style": {
            "id": "uuid",
            "name": "Ballet",
            "color": "#FF5733"
          }
        }
      }
    },
    {
      "id": "uuid-of-performance-1",
      "performance_order": 1,
      "song_title": "First Song Title",
      "song_artist": "First Artist",
      "class_instance": {
        // Class instance details...
      }
    },
    {
      "id": "uuid-of-performance-2",
      "performance_order": 2,
      "song_title": "Second Song Title",
      "song_artist": "Second Artist",
      "class_instance": {
        // Class instance details...
      }
    }
  ]
}
```

**Notes:**
- The `performanceOrder` array must contain all performance IDs for the recital
- The order of IDs in the array determines the new order of performances
- The `performance_order` field for each performance will be updated to match their position in the array

### Update Performance Details

Updates the details of a specific performance in the recital program.

**Endpoint:** `PUT /api/recitals/:id/performances/:performanceId`

**URL Parameters:**
- `id` (required): UUID of the recital
- `performanceId` (required): UUID of the performance to update

**Request Body:**

```json
{
  "song_title": "Updated Song Title",
  "song_artist": "Updated Artist",
  "choreographer": "Updated Choreographer",
  "duration": 240,
  "notes": "Updated performance notes"
}
```

**Response:**

```json
{
  "message": "Performance updated successfully",
  "performance": {
    "id": "uuid",
    "performance_order": 2,
    "song_title": "Updated Song Title",
    "song_artist": "Updated Artist",
    "duration": 240,
    "notes": "Updated performance notes",
    "choreographer": "Updated Choreographer",
    "class_instance": {
      "id": "uuid",
      "name": "Ballet Intermediate",
      "class_definition": {
        "id": "uuid",
        "name": "Ballet Level 2",
        "dance_style": {
          "id": "uuid",
          "name": "Ballet",
          "color": "#FF5733"
        }
      }
    }
  }
}
```

**Notes:**
- Only the fields included in the request body will be updated
- The performance must already exist and belong to the specified recital

### Generate Program PDF

Generates and downloads a PDF of the recital program.

**Endpoint:** `GET /api/recitals/:id/performances/export`

**URL Parameters:**
- `id` (required): UUID of the recital

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="recital-program-{recital-name}.pdf"`
- The PDF file content in the response body

**Notes:**
- The PDF will include:
  - Cover page with recital information
  - Table of contents listing all performances
  - Performance details pages with song information and performers
  - Artistic director's note (if available)
  - Acknowledgments (if available)
- If the recital program has not been fully configured, the PDF will still be generated with the available information