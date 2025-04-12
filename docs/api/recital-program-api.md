# Recital Program Management API Documentation

This document provides detailed information about the Recital Program Management API endpoints. These endpoints enable studio administrators to create, manage, and generate professional recital programs.

## Table of Contents

1. [General Information](#general-information)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [API Endpoints](#api-endpoints)
   - [Recital Series Management](#recital-series-management)
     - [Get All Recital Series](#get-all-recital-series)
     - [Get Recital Series By ID](#get-recital-series-by-id)
     - [Create Recital Series](#create-recital-series)
     - [Update Recital Series](#update-recital-series)
     - [Delete Recital Series](#delete-recital-series)
   - [Recital Show Management](#recital-show-management)
     - [Get Shows for Series](#get-shows-for-series)
     - [Get Show By ID](#get-show-by-id)
     - [Create Recital Show](#create-recital-show)
     - [Update Recital Show](#update-recital-show)
     - [Delete Recital Show](#delete-recital-show)
   - [Program Management](#program-management)
     - [Get Program Details](#get-program-details)
     - [Create/Update Program](#createupdate-program)
     - [Upload Cover Image](#upload-cover-image)
     - [Save Artistic Director's Note](#save-artistic-directors-note)
     - [Save Acknowledgments](#save-acknowledgments)
   - [Advertisement Management](#advertisement-management)
     - [Add Advertisement](#add-advertisement)
     - [Delete Advertisement](#delete-advertisement)
     - [Update Advertisement Position](#update-advertisement-position)
   - [Performance Management](#performance-management)
     - [Update Performance Order](#update-performance-order)
     - [Update Performance Details](#update-performance-details)
   - [Seating and Ticket Management](#seating-and-ticket-management)
     - [Generate Seats for Show](#generate-seats-for-show)
     - [Get Available Seats](#get-available-seats)
     - [Reserve Seats](#reserve-seats)
     - [Create Ticket Order](#create-ticket-order)
   - [Export](#export)
     - [Generate Program PDF](#generate-program-pdf)

## General Information

- Base URL: `/api`
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

### Recital Series Management

#### Get All Recital Series

Retrieves a paginated list of recital series.

**Endpoint:** `GET /api/recital-series`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 10)

**Response:**

```json
{
  "series": [
    {
      "id": "uuid",
      "name": "Spring Recital 2025",
      "description": "Annual spring showcase",
      "theme": "Dancing Through the Decades",
      "year": 2025,
      "season": "Spring",
      "created_at": "2025-04-07T12:34:56.789Z",
      "updated_at": "2025-04-07T12:34:56.789Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 25,
    "totalPages": 3
  }
}
```

#### Get Recital Series By ID

Retrieves a specific recital series by ID.

**Endpoint:** `GET /api/recital-series/:id`

**URL Parameters:**
- `id` (required): UUID of the recital series

**Response:**

```json
{
  "series": {
    "id": "uuid",
    "name": "Spring Recital 2025",
    "description": "Annual spring showcase",
    "theme": "Dancing Through the Decades",
    "year": 2025,
    "season": "Spring",
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

#### Create Recital Series

Creates a new recital series.

**Endpoint:** `POST /api/recital-series/add`

**Request Body:**

```json
{
  "name": "Spring Recital 2025",
  "description": "Annual spring showcase",
  "theme": "Dancing Through the Decades",
  "year": 2025,
  "season": "Spring"
}
```

**Response:**

```json
{
  "message": "Recital series created successfully",
  "series": {
    "id": "uuid",
    "name": "Spring Recital 2025",
    "description": "Annual spring showcase",
    "theme": "Dancing Through the Decades",
    "year": 2025,
    "season": "Spring",
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

#### Update Recital Series

Updates an existing recital series.

**Endpoint:** `PUT /api/recital-series/:id`

**URL Parameters:**
- `id` (required): UUID of the recital series

**Request Body:**

```json
{
  "name": "Spring Recital 2025",
  "description": "Updated description",
  "theme": "Updated theme",
  "year": 2025,
  "season": "Spring"
}
```

**Response:**

```json
{
  "message": "Recital series updated successfully",
  "series": {
    "id": "uuid",
    "name": "Spring Recital 2025",
    "description": "Updated description",
    "theme": "Updated theme",
    "year": 2025,
    "season": "Spring",
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

#### Delete Recital Series

Deletes a recital series.

**Endpoint:** `DELETE /api/recital-series/:id`

**URL Parameters:**
- `id` (required): UUID of the recital series

**Response:**

```json
{
  "message": "Recital series deleted successfully"
}
```

**Notes:**
- This will delete all associated shows, programs, and performances
- Use with caution as this action cannot be undone

### Recital Show Management

#### Get Shows for Series

Retrieves all shows (performances) for a specific recital series.

**Endpoint:** `GET /api/recital-series/:id/shows`

**URL Parameters:**
- `id` (required): UUID of the recital series

**Response:**

```json
{
  "shows": [
    {
      "id": "uuid",
      "name": "Morning Show",
      "date": "2025-05-15",
      "start_time": "10:00:00",
      "end_time": "12:00:00",
      "location": "Main Theater",
      "status": "planning",
      "advance_ticket_sale_start": "2025-04-01T12:00:00.000Z",
      "ticket_sale_start": "2025-04-10T12:00:00.000Z",
      "program": {
        "id": "uuid"
      }
    }
  ]
}
```

#### Get Show By ID

Retrieves a specific recital show by ID.

**Endpoint:** `GET /api/recital-shows/:id`

**URL Parameters:**
- `id` (required): UUID of the recital show

**Response:**

```json
{
  "show": {
    "id": "uuid",
    "series_id": "uuid",
    "name": "Morning Show",
    "description": "Morning performance",
    "date": "2025-05-15",
    "start_time": "10:00:00",
    "end_time": "12:00:00",
    "location": "Main Theater",
    "status": "planning",
    "ticket_price_in_cents": 1500,
    "ticket_sale_start": "2025-04-10T12:00:00.000Z",
    "ticket_sale_end": "2025-05-14T23:59:59.000Z",
    "advance_ticket_sale_start": "2025-04-01T12:00:00.000Z",
    "is_pre_sale_active": true,
    "pre_sale_start": "2025-03-25T12:00:00.000Z",
    "pre_sale_end": "2025-03-31T23:59:59.000Z",
    "can_sell_tickets": true,
    "series": {
      "id": "uuid",
      "name": "Spring Recital 2025",
      "theme": "Dancing Through the Decades"
    }
  }
}
```

#### Create Recital Show

Creates a new recital show.

**Endpoint:** `POST /api/recital-shows/add`

**Request Body:**

```json
{
  "series_id": "uuid",
  "name": "Morning Show",
  "description": "Morning performance",
  "date": "2025-05-15",
  "start_time": "10:00:00",
  "end_time": "12:00:00",
  "location": "Main Theater",
  "status": "planning",
  "ticket_price_in_cents": 1500,
  "ticket_sale_start": "2025-04-10T12:00:00.000Z",
  "ticket_sale_end": "2025-05-14T23:59:59.000Z",
  "advance_ticket_sale_start": "2025-04-01T12:00:00.000Z",
  "is_pre_sale_active": true,
  "pre_sale_start": "2025-03-25T12:00:00.000Z",
  "pre_sale_end": "2025-03-31T23:59:59.000Z",
  "can_sell_tickets": true
}
```

**Response:**

```json
{
  "message": "Recital show created successfully",
  "show": {
    "id": "uuid",
    "series_id": "uuid",
    "name": "Morning Show",
    "description": "Morning performance",
    "date": "2025-05-15",
    "start_time": "10:00:00",
    "end_time": "12:00:00",
    "location": "Main Theater",
    "status": "planning",
    "ticket_price_in_cents": 1500,
    "ticket_sale_start": "2025-04-10T12:00:00.000Z",
    "ticket_sale_end": "2025-05-14T23:59:59.000Z",
    "advance_ticket_sale_start": "2025-04-01T12:00:00.000Z",
    "is_pre_sale_active": true,
    "pre_sale_start": "2025-03-25T12:00:00.000Z",
    "pre_sale_end": "2025-03-31T23:59:59.000Z",
    "can_sell_tickets": true,
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

#### Update Recital Show

Updates an existing recital show.

**Endpoint:** `PUT /api/recital-shows/:id`

**URL Parameters:**
- `id` (required): UUID of the recital show

**Request Body:**

```json
{
  "name": "Morning Show",
  "description": "Updated description",
  "date": "2025-05-15",
  "start_time": "10:00:00",
  "end_time": "12:00:00",
  "location": "Main Theater",
  "status": "rehearsal",
  "ticket_price_in_cents": 2000
}
```

**Response:**

```json
{
  "message": "Recital show updated successfully",
  "show": {
    "id": "uuid",
    "series_id": "uuid",
    "name": "Morning Show",
    "description": "Updated description",
    "date": "2025-05-15",
    "start_time": "10:00:00",
    "end_time": "12:00:00",
    "location": "Main Theater",
    "status": "rehearsal",
    "ticket_price_in_cents": 2000,
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

#### Delete Recital Show

Deletes a recital show.

**Endpoint:** `DELETE /api/recital-shows/:id`

**URL Parameters:**
- `id` (required): UUID of the recital show

**Response:**

```json
{
  "message": "Recital show deleted successfully"
}
```

**Notes:**
- This will also delete the associated program, performances, and tickets
- Use with caution as this action cannot be undone

### Program Management

#### Get Program Details

Retrieves all program details for a specific recital show.

**Endpoint:** `GET /api/recital-shows/:id/program`

**URL Parameters:**
- `id` (required): UUID of the recital show

**Response:**

```json
{
  "show": {
    "id": "uuid",
    "name": "Morning Show",
    "description": "Morning performance",
    "date": "2025-05-15",
    "start_time": "10:00:00",
    "location": "Main Theater",
    "series_id": "uuid",
    "series": {
      "name": "Spring Recital 2025",
      "theme": "Dancing Through the Decades"
    }
  },
  "program": {
    "id": "uuid",
    "recital_id": "uuid",
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
- If the show does not have a program yet, the `program` field will be `null`
- If no advertisements are found, the `advertisements` array will be empty
- If no performances are found, the `performances` array will be empty

#### Create/Update Program

Creates a new program or updates an existing one for a specific recital show.

**Endpoint:** `POST /api/recital-shows/:id/program`

**URL Parameters:**
- `id` (required): UUID of the recital show

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

#### Upload Cover Image

Uploads a cover image for the recital program.

**Endpoint:** `PUT /api/recital-shows/:id/program/cover`

**URL Parameters:**
- `id` (required): UUID of the recital show

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
- If a program does not exist for this show, one will be created
- Supported image formats: JPEG, PNG, GIF
- Maximum file size: 5MB
- The previous image (if any) will be automatically deleted from storage

#### Save Artistic Director's Note

Updates the artistic director's note in the recital program.

**Endpoint:** `PUT /api/recital-shows/:id/program/artistic-note`

**URL Parameters:**
- `id` (required): UUID of the recital show

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
- If a program does not exist for this show, one will be created
- The note can include HTML formatting for rich text support
- The response will include either `created: true` or `updated: true` to indicate which action was taken

#### Save Acknowledgments

Updates the acknowledgments section in the recital program.

**Endpoint:** `PUT /api/recital-shows/:id/program/acknowledgments`

**URL Parameters:**
- `id` (required): UUID of the recital show

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
- If a program does not exist for this show, one will be created
- The acknowledgments can include HTML formatting for rich text support
- The response will include either `created: true` or `updated: true` to indicate which action was taken

### Advertisement Management

#### Add Advertisement

Adds a new advertisement to the recital program.

**Endpoint:** `POST /api/recital-shows/:id/program/advertisements`

**URL Parameters:**
- `id` (required): UUID of the recital show

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
- If a program does not exist for this show, one will be created
- Supported image formats: JPEG, PNG, GIF
- Maximum file size: 5MB
- The advertisement will be added at the end of the current advertisement list

#### Delete Advertisement

Deletes an advertisement from the recital program.

**Endpoint:** `DELETE /api/recital-shows/:id/program/advertisements/:adId`

**URL Parameters:**
- `id` (required): UUID of the recital show
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

#### Update Advertisement Position

Updates the position of an advertisement within the recital program.

**Endpoint:** `PUT /api/recital-shows/:id/program/advertisements/:adId/position`

**URL Parameters:**
- `id` (required): UUID of the recital show
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

### Performance Management

#### Update Performance Order

Updates the order of performances in the recital program.

**Endpoint:** `PUT /api/recital-shows/:id/performances/reorder`

**URL Parameters:**
- `id` (required): UUID of the recital show

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
    // Additional performances...
  ]
}
```

**Notes:**
- The `performanceOrder` array must contain all performance IDs for the show
- The order of IDs in the array determines the new order of performances
- The `performance_order` field for each performance will be updated to match their position in the array

#### Update Performance Details

Updates the details of a specific performance in the recital program.

**Endpoint:** `PUT /api/recital-shows/:id/performances/:performanceId`

**URL Parameters:**
- `id` (required): UUID of the recital show
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
- The performance must already exist and belong to the specified recital show

### Seating and Ticket Management

#### Generate Seats for Show

Generates seats for a recital show based on a layout template.

**Endpoint:** `POST /api/recital-shows/:id/seats/generate`

**URL Parameters:**
- `id` (required): UUID of the recital show

**Request Body:**

```json
{
  "layout_id": "uuid"
}
```

**Response:**

```json
{
  "message": "Seats generated successfully",
  "seat_count": 500
}
```

**Notes:**
- This will generate seats based on the specified layout template
- Existing seats for this show will be deleted before generating new ones
- The layout template must exist and be valid

#### Get Available Seats

Retrieves available seats for a recital show.

**Endpoint:** `GET /api/recital-shows/:id/seats/available`

**URL Parameters:**
- `id` (required): UUID of the recital show

**Query Parameters:**
- `section` (optional): Filter by section
- `handicap_access` (optional): Filter for handicap accessible seats (true/false)

**Response:**

```json
{
  "available_seats": [
    {
      "id": "uuid",
      "row_name": "A",
      "seat_number": "1",
      "section": "Center Orchestra",
      "section_type": "center-main",
      "seat_type": "regular",
      "handicap_access": false
    }
    // Additional seats...
  ],
  "sections": [
    {
      "name": "Center Orchestra",
      "section_type": "center-main",
      "available_count": 120
    }
    // Additional sections...
  ]
}
```

**Notes:**
- This endpoint returns only seats with `is_available = true`
- The response includes a summary of available seats by section
- Results can be filtered by section and accessibility requirements

#### Reserve Seats

Temporarily reserves seats for a potential purchase.

**Endpoint:** `POST /api/recital-shows/:id/seats/reserve`

**URL Parameters:**
- `id` (required): UUID of the recital show

**Request Body:**

```json
{
  "seat_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "email": "customer@example.com"
}
```

**Response:**

```json
{
  "message": "Seats reserved successfully",
  "reservation": {
    "id": "uuid",
    "seat_ids": ["uuid-1", "uuid-2", "uuid-3"],
    "expires_at": "2025-04-07T13:04:56.789Z", // 30 minutes from now
    "email": "customer@example.com"
  }
}
```

**Notes:**
- Seat reservations are temporary and will expire after 30 minutes
- The seats will be marked as `is_reserved = true` during the reservation period
- If the reservation expires without purchase, the seats will become available again

#### Create Ticket Order

Creates a new order with tickets for reserved seats.

**Endpoint:** `POST /api/orders`

**Request Body:**

```json
{
  "recital_show_id": "uuid",
  "seat_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "customer_name": "John Doe",
  "email": "customer@example.com",
  "payment_method": "stripe",
  "payment_intent_id": "pi_1234567890"
}
```

**Response:**

```json
{
  "message": "Order created successfully",
  "order": {
    "id": "uuid",
    "total_amount_in_cents": 6000,
    "customer_name": "John Doe",
    "email": "customer@example.com",
    "payment_status": "completed",
    "tickets": [
      {
        "id": "uuid",
        "seat": {
          "id": "uuid-1",
          "row_name": "A",
          "seat_number": "1",
          "section": "Center Orchestra"
        },
        "code": "ABC123"
      }
      // Additional tickets...
    ]
  }
}
```

**Notes:**
- This endpoint creates tickets for the specified seats and associates them with a new order
- The seats must be previously reserved for the same email address
- A unique ticket code is generated for each ticket
- The total amount is calculated based on the show's ticket price
- Payment processing is handled separately, but the payment intent ID can be stored for reference

### Export

#### Generate Program PDF

Generates and downloads a PDF of the recital program.

**Endpoint:** `GET /api/recital-shows/:id/program/export`

**URL Parameters:**
- `id` (required): UUID of the recital show

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="recital-program-{show-name}.pdf"`
- The PDF file content in the response body

**Notes:**
- The PDF will include:
  - Cover page with recital show information
  - Table of contents listing all performances
  - Performance details pages with song information and performers
  - Artistic director's note (if available)
  - Acknowledgments (if available)
- If the recital program has not been fully configured, the PDF will still be generated with the available information

### Media Management

#### Add Video Recording

Adds a video recording for a recital show.

**Endpoint:** `POST /api/recital-shows/:id/videos`

**URL Parameters:**
- `id` (required): UUID of the recital show

**Request Body:**

```json
{
  "title": "Spring Recital 2025 - Morning Show",
  "url": "https://example.com/videos/12345",
  "format": "digital",
  "is_public": false,
  "access_start_date": "2025-05-20T00:00:00.000Z"
}
```

**Response:**

```json
{
  "message": "Video added successfully",
  "video": {
    "id": "uuid",
    "recital_show_id": "uuid",
    "title": "Spring Recital 2025 - Morning Show",
    "url": "https://example.com/videos/12345",
    "format": "digital",
    "is_public": false,
    "access_start_date": "2025-05-20T00:00:00.000Z",
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

**Notes:**
- This endpoint allows for tracking both digital and physical media formats
- The access_start_date determines when customers can access the digital content
- For physical media, set the format to "DVD" or "Blu-Ray"

#### Get Video Access

Retrieve access details for a specific video.

**Endpoint:** `GET /api/videos/:id/access`

**URL Parameters:**
- `id` (required): UUID of the video

**Query Parameters:**
- `code` (required): Access code provided to the customer

**Response:**

```json
{
  "access": true,
  "video": {
    "id": "uuid",
    "title": "Spring Recital 2025 - Morning Show",
    "url": "https://example.com/videos/12345",
    "format": "digital"
  }
}
```

**Notes:**
- This endpoint verifies the access code and returns the video details if valid
- For digital videos, this includes the URL to access the content
- Access can be restricted based on the access_start_date

#### Order Physical Media

Places an order for physical media copies of a recital recording.

**Endpoint:** `POST /api/orders/media`

**Request Body:**

```json
{
  "recital_show_id": "uuid",
  "customer_name": "John Doe",
  "email": "customer@example.com",
  "items": [
    {
      "format": "DVD",
      "quantity": 2,
      "price_in_cents": 2000
    },
    {
      "format": "Blu-Ray",
      "quantity": 1,
      "price_in_cents": 2500
    }
  ],
  "shipping_address": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zip": "12345"
  },
  "payment_method": "stripe",
  "payment_intent_id": "pi_1234567890"
}
```

**Response:**

```json
{
  "message": "Media order created successfully",
  "order": {
    "id": "uuid",
    "total_amount_in_cents": 6500,
    "customer_name": "John Doe",
    "email": "customer@example.com",
    "payment_status": "completed",
    "videos": [
      {
        "id": "uuid",
        "format": "DVD",
        "quantity": 2
      },
      {
        "id": "uuid",
        "format": "Blu-Ray",
        "quantity": 1
      }
    ]
  }
}
```

**Notes:**
- This endpoint creates an order for physical media without requiring seat selection
- The total amount is calculated based on the quantity and price of each item
- Physical media orders include shipping information
- Payment processing is handled separately, but the payment intent ID can be stored for reference

### Seat Layout Management

#### Get All Seat Layouts

Retrieves all available seat layout templates.

**Endpoint:** `GET /api/seat-layouts`

**Response:**

```json
{
  "layouts": [
    {
      "id": "uuid",
      "name": "Main Auditorium",
      "description": "Standard seating for main performances",
      "default_layout": true,
      "created_at": "2025-04-07T12:34:56.789Z",
      "updated_at": "2025-04-07T12:34:56.789Z"
    }
  ]
}
```

#### Get Seat Layout Details

Retrieves the details of a specific seat layout.

**Endpoint:** `GET /api/seat-layouts/:id`

**URL Parameters:**
- `id` (required): UUID of the seat layout

**Response:**

```json
{
  "layout": {
    "id": "uuid",
    "name": "Main Auditorium",
    "description": "Standard seating for main performances",
    "default_layout": true
  },
  "sections": [
    {
      "id": "uuid",
      "name": "Center Orchestra",
      "section_type": "center-main",
      "display_order": 0,
      "rows": [
        {
          "id": "uuid",
          "name": "A",
          "display_order": 0,
          "seats": [
            {
              "id": "uuid",
              "seat_number": "1",
              "seat_type": "regular",
              "handicap_access": false,
              "display_order": 0
            }
            // Additional seats...
          ]
        }
        // Additional rows...
      ]
    }
    // Additional sections...
  ]
}
```

#### Create Seat Layout

Creates a new seat layout template.

**Endpoint:** `POST /api/seat-layouts`

**Request Body:**

```json
{
  "name": "Main Auditorium",
  "description": "Standard seating for main performances",
  "default_layout": false
}
```

**Response:**

```json
{
  "message": "Seat layout created successfully",
  "layout": {
    "id": "uuid",
    "name": "Main Auditorium",
    "description": "Standard seating for main performances",
    "default_layout": false,
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

#### Add Section to Layout

Adds a new section to a seat layout.

**Endpoint:** `POST /api/seat-layouts/:id/sections`

**URL Parameters:**
- `id` (required): UUID of the seat layout

**Request Body:**

```json
{
  "name": "Center Orchestra",
  "section_type": "center-main",
  "display_order": 0
}
```

**Response:**

```json
{
  "message": "Section added successfully",
  "section": {
    "id": "uuid",
    "layout_id": "uuid",
    "name": "Center Orchestra",
    "section_type": "center-main",
    "display_order": 0,
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z"
  }
}
```

#### Add Row to Section

Adds a new row to a section.

**Endpoint:** `POST /api/seat-layouts/sections/:id/rows`

**URL Parameters:**
- `id` (required): UUID of the section

**Request Body:**

```json
{
  "name": "A",
  "display_order": 0,
  "seats": [
    { "seat_number": "1", "seat_type": "regular", "handicap_access": false },
    { "seat_number": "2", "seat_type": "regular", "handicap_access": false },
    { "seat_number": "3", "seat_type": "handicap", "handicap_access": true }
  ]
}
```

**Response:**

```json
{
  "message": "Row and seats added successfully",
  "row": {
    "id": "uuid",
    "section_id": "uuid",
    "name": "A",
    "display_order": 0,
    "created_at": "2025-04-07T12:34:56.789Z",
    "updated_at": "2025-04-07T12:34:56.789Z",
    "seats": [
      {
        "id": "uuid",
        "row_id": "uuid",
        "seat_number": "1",
        "seat_type": "regular",
        "handicap_access": false,
        "display_order": 0
      }
      // Additional seats...
    ]
  }
}
```

## Migrating from Previous API

The new API structure maintains backward compatibility with existing client code through the following mapping:

1. For clients using `/api/recitals/:id/...` endpoints:
   - These will continue to work for existing recital IDs
   - New recital shows can be accessed via `/api/recital-shows/:id/...`

2. Previous endpoint to current endpoint mapping:
   - `GET /api/recitals/:id/program` → `GET /api/recital-shows/:id/program`
   - `POST /api/recitals/:id/program` → `POST /api/recital-shows/:id/program`
   - `PUT /api/recitals/:id/program/cover` → `PUT /api/recital-shows/:id/program/cover`
   - `POST /api/recitals/:id/program/advertisements` → `POST /api/recital-shows/:id/program/advertisements`
   - `PUT /api/recitals/:id/performances/reorder` → `PUT /api/recital-shows/:id/performances/reorder`
   - `GET /api/recitals/:id/performances/export` → `GET /api/recital-shows/:id/program/export`

3. When using series management, be aware that:
   - Recital series provide a higher-level grouping that didn't exist before
   - Each series contains one or more recital shows (formerly just "recitals")
   - Previous "recitals" are migrated to "recital shows" within series

## Conclusion

This API provides comprehensive functionality for managing recital series, shows, programs, and ticket sales. The design supports multiple performances of the same recital series while maintaining separate programs and ticket sales for each show.