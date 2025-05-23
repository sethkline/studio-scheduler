# Dance Studio Application - Database Documentation

## Overview
This document provides a comprehensive overview of the database design for the Dance Studio Application, with a particular focus on the Recital Program Management feature. The database uses PostgreSQL and is designed to efficiently manage dance classes, students, teachers, recitals, and program materials.

## Database Schema

### Core Tables

#### `app_settings`
Stores application-wide configuration settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| key | varchar | NOT NULL | Setting key name |
| value | text | | Setting value |
| description | text | | Description of the setting |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `profiles`
Stores user profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, References auth.users(id) | Unique identifier linked to auth |
| first_name | varchar | | User's first name |
| last_name | varchar | | User's last name |
| user_role | varchar | NOT NULL, default 'student' | Role (admin, teacher, staff, student) |
| email | varchar | | Email address |
| phone | varchar | | Phone number |
| bio | text | | User biography |
| profile_image_url | text | | URL to profile image |
| status | varchar | default 'active' | Account status |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `dance_styles`
Defines different dance styles offered by the studio.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| name | varchar | NOT NULL | Name of the dance style |
| color | varchar | NOT NULL | Color code for visual representation |
| description | text | | Description of the dance style |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `class_levels`
Defines proficiency levels for dance classes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| name | varchar | NOT NULL | Level name (e.g., Beginner, Intermediate) |
| min_age | integer | | Minimum recommended age |
| max_age | integer | | Maximum recommended age |
| description | text | | Description of the level |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `class_definitions`
Defines class templates that can be instantiated.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| name | varchar | NOT NULL | Class name |
| dance_style_id | uuid | FK → dance_styles(id) | Associated dance style |
| class_level_id | uuid | FK → class_levels(id) | Associated skill level |
| min_age | integer | | Minimum age for students |
| max_age | integer | | Maximum age for students |
| description | text | | Class description |
| duration | integer | NOT NULL | Class duration in minutes |
| max_students | integer | | Maximum enrollment capacity |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `class_instances`
Represents actual classes being offered.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| class_definition_id | uuid | NOT NULL, FK → class_definitions(id) | Associated class definition |
| name | varchar | | Instance-specific name |
| teacher_id | uuid | FK → profiles(id) | Assigned teacher |
| studio_id | uuid | FK → studios | Assigned studio room |
| status | varchar | default 'active' | Class status |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `enrollments`
Tracks student enrollments in class instances.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| student_id | uuid | NOT NULL, FK → profiles(id) | Enrolled student |
| class_instance_id | uuid | NOT NULL, FK → class_instances(id) | Class instance |
| status | varchar | default 'active' | Enrollment status |
| enrollment_date | timestamp with timezone | default now() | Date of enrollment |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

### Scheduling Tables

#### `schedules`
Defines schedule periods (terms, seasons, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| name | varchar | NOT NULL | Schedule name |
| description | text | | Schedule description |
| start_date | date | NOT NULL | Period start date |
| end_date | date | NOT NULL | Period end date |
| is_active | boolean | default false | Active status |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `schedule_classes`
Places class instances into specific time slots.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| schedule_id | uuid | NOT NULL, FK → schedules(id) | Associated schedule |
| class_instance_id | uuid | NOT NULL, FK → class_instances(id) | Class instance |
| day_of_week | integer | NOT NULL | Day of week (0-6) |
| start_time | time | NOT NULL | Start time |
| end_time | time | NOT NULL | End time |
| studio_id | uuid | FK → studios | Studio assignment |
| teacher_id | uuid | FK → profiles(id) | Teacher override |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `scheduling_constraints`
Defines rules for valid scheduling.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| name | varchar | NOT NULL | Constraint name |
| constraint_type | varchar | NOT NULL | Type of constraint |
| min_age | integer | | Minimum age for constraint |
| max_age | integer | | Maximum age for constraint |
| earliest_start_time | time | | Earliest allowed start time |
| latest_end_time | time | | Latest allowed end time |
| min_break_duration | integer | | Minimum break between classes |
| description | text | | Description of constraint |
| is_active | boolean | default true | Active status |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

### Recital Management Tables

#### `recital_series`
Defines groups of related recital shows.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| name | varchar | NOT NULL | Series name |
| year | integer | NOT NULL | Year of the series |
| theme | varchar | | Theme for the series |
| season | varchar | | Season (Spring, Fall, etc.) |
| description | text | | Description of the series |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `recital_shows`
Defines individual recital performances/shows.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| series_id | uuid | FK → recital_series(id) | Associated series |
| name | varchar | NOT NULL | Show name |
| description | text | | Description of the show |
| date | date | NOT NULL | Show date |
| start_time | time | NOT NULL | Start time |
| end_time | time | | End time |
| location | text | | Venue location |
| notes | text | | Additional notes |
| status | varchar | default 'planning' | Show status |
| ticket_price_in_cents | integer | | Ticket price in cents |
| ticket_sale_start | timestamp with timezone | | When tickets go on sale |
| ticket_sale_end | timestamp with timezone | | When ticket sales end |
| advance_ticket_sale_start | timestamp with timezone | | Early access sale start |
| is_pre_sale_active | boolean | default false | Whether pre-sale is active |
| pre_sale_start | timestamp with timezone | | Pre-sale start time |
| pre_sale_end | timestamp with timezone | | Pre-sale end time |
| can_sell_tickets | boolean | default false | Whether tickets can be sold |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `show_seats`
Stores individual seats for a recital show.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| show_id | uuid | NOT NULL, FK → recital_shows(id) | Associated show |
| section | varchar | NOT NULL | Section name (e.g., left-wing, center-main) |
| section_type | varchar | NOT NULL | Type of section (wing, main, center) |
| row_name | varchar | NOT NULL | Row identifier (e.g., A, B, C) |
| seat_number | varchar | NOT NULL | Seat number |
| seat_type | varchar | NOT NULL, default 'regular' | Type of seat (regular, handicap) |
| handicap_access | boolean | NOT NULL, default false | Whether seat has handicap access |
| status | varchar | NOT NULL, default 'available' | Seat status (available, reserved, sold) |
| price_in_cents | integer | | Custom price for this seat (if different from show price) |
| reserved_until | timestamp with timezone | | Reservation expiration |
| created_at | timestamp with timezone | NOT NULL, default now() | Creation timestamp |
| updated_at | timestamp with timezone | NOT NULL, default now() | Last update timestamp |

#### `recitals` (Legacy Table)
Defines recital events (older implementation).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| name | varchar | NOT NULL | Recital name |
| description | text | | Description of the recital |
| date | date | NOT NULL | Recital date |
| location | text | | Venue location |
| notes | text | | Additional notes |
| status | varchar | default 'planning' | Recital status |
| theme | varchar | | Recital theme |
| program_notes | text | | Notes for program |
| series_id | uuid | FK → recital_series(id) | Associated series |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `recital_performances`
Individual performances within a recital.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| recital_id | uuid | NOT NULL, FK → recital_shows(id) | Associated recital/show |
| class_instance_id | uuid | NOT NULL, FK → class_instances(id) | Performing class |
| performance_order | integer | NOT NULL | Order in the program |
| song_title | varchar | | Performance song title |
| song_artist | varchar | | Song artist |
| duration | integer | | Performance duration in seconds |
| notes | text | | Performance notes |
| choreographer | varchar | | Choreographer name |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `recital_programs`
Program metadata for recitals.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| recital_id | uuid | NOT NULL, FK → recital_shows(id), UNIQUE | Associated recital |
| cover_image_url | text | | URL to program cover image |
| artistic_director_note | text | | Note from artistic director |
| acknowledgments | text | | Acknowledgments section |
| program_notes | text | | General program notes |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `recital_program_advertisements`
Advertisements in recital programs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| recital_program_id | uuid | NOT NULL, FK → recital_programs(id) | Associated program |
| title | varchar | NOT NULL | Advertisement title |
| description | text | | Advertisement description |
| image_url | text | | URL to advertisement image |
| order_position | integer | NOT NULL, default 0 | Display order |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `spacing_requirements`
Requirements for spacing performances.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| recital_id | uuid | NOT NULL, FK → recital_shows(id) | Associated recital |
| class1_id | uuid | NOT NULL, FK → class_instances(id) | First class |
| class2_id | uuid | NOT NULL, FK → class_instances(id) | Second class |
| min_spacing | integer | NOT NULL | Minimum positions between classes |
| created_at | timestamp with timezone | default now() | Creation timestamp |

## Key Relationships

### Recital Series and Shows Structure
- A `recital_series` has multiple `recital_shows` (one-to-many relationship)
- A `recital_shows` belongs to one `recital_series` (many-to-one relationship)

### Recital Program Structure
- A `recital_show` has exactly one `recital_program` (one-to-one relationship)
- A `recital_program` can have multiple `recital_program_advertisements` (one-to-many relationship)
- A `recital_show` has multiple `recital_performances` (one-to-many relationship)

### Seating Structure
- A `recital_show` has multiple `show_seats` (one-to-many relationship)
- Seats are organized by section, row, and seat number
- The `show_seats` table tracks the availability and status of each seat

### Class Hierarchy
- `dance_styles` and `class_levels` categorize `class_definitions`
- `class_definitions` serve as templates for `class_instances`
- `class_instances` are scheduled in `schedule_classes` and perform in `recital_performances`

### User Roles and Access
- The `profiles` table stores user information with different roles
- Teachers are linked to `class_instances` via `teacher_id`
- Students are connected to classes through the `enrollments` table

### Student Enrollment
- Students connect to classes through the `enrollments` table
- The list of dancers for a performance is determined by active enrollments in the associated `class_instance`

## Indexes

The following indexes improve query performance:

- `idx_recital_performances_recital_id` on `recital_performances(recital_id)`
- `idx_recital_program_advertisements_program_id` on `recital_program_advertisements(recital_program_id)`
- `idx_recital_shows_series_id` on `recital_shows(series_id)`
- `idx_profiles_user_role` on `profiles(user_role)`
- `idx_show_seats_show_id` on `show_seats(show_id)`
- `idx_show_seats_status` on `show_seats(status)`
- `idx_show_seats_section` on `show_seats(section)`
- `idx_unique_seat` on `show_seats(show_id, section, row_name, seat_number)` (UNIQUE)

## Automatic Timestamps

Triggers are implemented to automatically update the `updated_at` timestamp when records are modified:

- `update_recital_programs_updated_at` on `recital_programs`
- `update_recital_program_advertisements_updated_at` on `recital_program_advertisements`
- `update_recital_series_updated_at` on `recital_series`
- `update_recital_shows_updated_at` on `recital_shows`
- `update_profiles_updated_at` on `profiles`
- `update_show_seats_updated_at` on `show_seats`

## Database Diagrams

### Entity Relationship Diagram (ERD)

```
                             +----------------+
                             |  dance_styles  |
                             +----------------+
                                    |
                                    v
+----------------+          +------------------+          +----------------+
|  class_levels  |--------->| class_definitions|--------->| class_instances|
+----------------+          +------------------+          +----------------+
                                                                 |
                                                      +----------+----------+
                                                      |                     |
                                                      v                     v
                                             +----------------+   +------------------+
                                             |   enrollments  |   |recital_performances|
                                             +----------------+   +------------------+
                                                      ^                    |
                                                      |                    v
                                             +----------------+   +------------------+
                                             |    profiles    |   |  recital_shows   |
                                             +----------------+   +------------------+
                                                                         |
                                             +----------------+          |
                                             |recital_series  |<---------+
                                             +----------------+          |
                                                                         +-----------+
                                                                         |           |
                                                                         v           v
                                                                +------------------+ +---------------+
                                                                | recital_programs | |  show_seats   |
                                                                +------------------+ +---------------+
                                                                         |
                                                                         v
                                                       +--------------------------------+
                                                       |recital_program_advertisements |
                                                       +--------------------------------+
```

## Notes on Implementation

- All tables use UUID primary keys with automatic generation via `uuid_generate_v4()`
- Consistent timestamps (`created_at` and `updated_at`) are maintained across all tables
- Foreign key relationships enforce referential integrity
- Soft deletion is implemented via status fields where appropriate
- The `recital_programs` table has a unique constraint on `recital_id` to ensure only one program per recital
- The system has both newer `recital_shows` and legacy `recitals` tables for backward compatibility
- The `show_seats` table represents the seating chart for each recital show, with sections and rows matching the venue layout

## SQL Migration Scripts

### Create recital_series Table

```sql
CREATE TABLE IF NOT EXISTS public.recital_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    year INTEGER NOT NULL,
    theme VARCHAR,
    season VARCHAR,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recital_series_year 
ON public.recital_series(year);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_recital_series_updated_at ON public.recital_series;
CREATE TRIGGER update_recital_series_updated_at
BEFORE UPDATE ON public.recital_series
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Create recital_shows Table

```sql
CREATE TABLE IF NOT EXISTS public.recital_shows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id UUID REFERENCES public.recital_series(id),
    name VARCHAR NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    location TEXT,
    notes TEXT,
    status VARCHAR DEFAULT 'planning',
    ticket_price_in_cents INTEGER,
    ticket_sale_start TIMESTAMP WITH TIME ZONE,
    ticket_sale_end TIMESTAMP WITH TIME ZONE,
    advance_ticket_sale_start TIMESTAMP WITH TIME ZONE,
    is_pre_sale_active BOOLEAN DEFAULT false,
    pre_sale_start TIMESTAMP WITH TIME ZONE,
    pre_sale_end TIMESTAMP WITH TIME ZONE,
    can_sell_tickets BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recital_shows_series_id 
ON public.recital_shows(series_id);

CREATE INDEX IF NOT EXISTS idx_recital_shows_date 
ON public.recital_shows(date);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_recital_shows_updated_at ON public.recital_shows;
CREATE TRIGGER update_recital_shows_updated_at
BEFORE UPDATE ON public.recital_shows
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Create show_seats Table

```sql
CREATE TABLE IF NOT EXISTS public.show_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID NOT NULL REFERENCES public.recital_shows(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,
    section_type VARCHAR(20) NOT NULL,
    row_name VARCHAR(10) NOT NULL,
    seat_number VARCHAR(20) NOT NULL,
    seat_type VARCHAR(20) NOT NULL DEFAULT 'regular',
    handicap_access BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    price_in_cents INTEGER,
    reserved_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_show_seats_show_id ON public.show_seats(show_id);
CREATE INDEX IF NOT EXISTS idx_show_seats_status ON public.show_seats(status);
CREATE INDEX IF NOT EXISTS idx_show_seats_section ON public.show_seats(section);

-- Add a composite unique constraint to prevent duplicate seats
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_seat 
  ON public.show_seats(show_id, section, row_name, seat_number);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_show_seats_updated_at ON public.show_seats;
CREATE TRIGGER update_show_seats_updated_at
BEFORE UPDATE ON public.show_seats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.show_seats TO authenticated;
GRANT SELECT ON public.show_seats TO anon;
```

### Create profiles Table

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name VARCHAR,
    last_name VARCHAR,
    user_role VARCHAR NOT NULL DEFAULT 'student',
    email VARCHAR,
    phone VARCHAR,
    bio TEXT,
    profile_image_url TEXT,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_role 
ON public.profiles(user_role);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Update Foreign Keys in Existing Tables

```sql
-- Add foreign key to recitals table if it exists and doesn't have it already
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'recitals'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'recitals' 
        AND column_name = 'series_id'
    ) THEN
        ALTER TABLE public.recitals
        ADD COLUMN series_id UUID REFERENCES public.recital_series(id);
    END IF;
END $$;

-- Update foreign keys in recital_performances if needed
ALTER TABLE public.recital_performances
DROP CONSTRAINT IF EXISTS recital_performances_recital_id_fkey;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'recital_shows'
    ) THEN
        ALTER TABLE public.recital_performances
        ADD CONSTRAINT recital_performances_recital_id_fkey
        FOREIGN KEY (recital_id) REFERENCES public.recital_shows(id);
    END IF;
END $$;

-- Update foreign keys in recital_programs if needed
ALTER TABLE public.recital_programs
DROP CONSTRAINT IF EXISTS recital_programs_recital_id_fkey;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'recital_shows'
    ) THEN
        ALTER TABLE public.recital_programs
        ADD CONSTRAINT recital_programs_recital_id_fkey
        FOREIGN KEY (recital_id) REFERENCES public.recital_shows(id);
    END IF;
END $$;
```

## Future Database Enhancements

Potential future enhancements to the database schema include:

1. Adding a `program_templates` table for reusable program layouts
2. Implementing a `quick_changes` table to track students who need to change quickly between performances
3. Adding a `program_sections` table to group performances into program segments
4. Creating a `digital_assets` table for managing program-related media files
5. Adding a `program_feedback` table for collecting audience feedback
6. Consolidating `recitals` and `recital_shows` tables for a more streamlined schema
7. Adding ticket management and sales tracking capabilities
8. Enhancing the `show_seats` table with more advanced seat assignment features like multi-seat selection and group reservations
9. Adding a `seat_layouts` table to store reusable seating templates for different venues

# Public Ticket Purchasing System - Database Design

## Overview

This document outlines the database design for the Public Ticket Purchasing System. The schema supports the entire ticket purchasing lifecycle including browsing, seat selection, reservation, payment processing, and ticket management.

## Entity Relationship Diagram

```
+-------------------+       +------------------+       +------------------+
| recital_shows     |------>| show_seats       |<------| tickets          |
+-------------------+       +------------------+       +------------------+
        |                          ^                          |
        |                          |                          |
        v                          |                          v
+-------------------+       +------------------+       +------------------+
| seat_reservations |------>| reservation_seats|       | ticket_orders    |
+-------------------+       +------------------+       +------------------+
```

## Tables

### 1. ticket_orders

Stores information about customer orders, including payment details and order status.

**Key Fields:**
- `id` - Primary key (UUID)
- `recital_show_id` - Foreign key to recital_shows table
- `customer_name` - Customer's full name
- `email` - Customer's email address for ticket delivery
- `phone` - Optional phone number
- `total_amount_in_cents` - Total order amount in cents
- `payment_method` - Payment method used (e.g., "stripe", "paypal")
- `payment_intent_id` - Payment provider's reference ID
- `payment_status` - Status of payment ("pending", "completed", "failed", "refunded")
- `order_date` - When the order was placed
- `notes` - Optional order notes

**Relationships:**
- Each ticket_order belongs to one recital_show
- Each ticket_order can have multiple tickets

### 2. tickets

Represents individual tickets that are part of an order.

**Key Fields:**
- `id` - Primary key (UUID)
- `order_id` - Foreign key to ticket_orders table
- `seat_id` - Foreign key to show_seats table
- `ticket_code` - Unique ticket identifier/barcode
- `price_in_cents` - Price of this specific ticket
- `is_valid` - Whether the ticket is still valid
- `has_checked_in` - Whether the ticket has been used for entry
- `check_in_time` - When the ticket was used for entry
- `notes` - Optional ticket notes

**Relationships:**
- Each ticket belongs to one ticket_order
- Each ticket is associated with one specific seat

### 3. seat_reservations

Tracks temporary seat reservations during the checkout process.

**Key Fields:**
- `id` - Primary key (UUID)
- `recital_show_id` - Foreign key to recital_shows table
- `email` - Customer's email for reservation identification
- `phone` - Optional phone number
- `reservation_token` - Unique token for accessing this reservation
- `expires_at` - When this reservation expires
- `is_active` - Whether this reservation is still active

**Relationships:**
- Each seat_reservation belongs to one recital_show
- Each seat_reservation can include multiple seats through reservation_seats

### 4. reservation_seats

Junction table linking reservations to specific seats.

**Key Fields:**
- `id` - Primary key (UUID)
- `reservation_id` - Foreign key to seat_reservations table
- `seat_id` - Foreign key to show_seats table

**Relationships:**
- Links seats to reservations in a many-to-many relationship

### 5. show_seats (Modified)

Existing table that represents individual seats for a show, with added reservation tracking.

**Added Fields:**
- `reserved_until` - When the current reservation expires
- `reserved_by` - Foreign key to seat_reservations table

**Relationships:**
- Each show_seat belongs to one recital_show
- A show_seat can be temporarily reserved by one seat_reservation
- A show_seat can be permanently assigned to one ticket

### 6. ticket_audit_log (Optional)

Tracks changes to ticket-related records for auditing purposes.

**Key Fields:**
- `id` - Primary key (UUID)
- `action` - Type of action performed (create, update, delete)
- `table_name` - Table that was modified
- `record_id` - UUID of the modified record
- `changed_by` - User who made the change
- `old_values` - Previous values in JSON format
- `new_values` - New values in JSON format
- `created_at` - When the change occurred

## Key Design Decisions

1. **Separation of Reservations and Orders**
   - Reservations are temporary and automatically expire
   - Orders are permanent and represent completed purchases

2. **Seat Status Tracking**
   - Seats can be available, temporarily reserved, or sold
   - Reserved seats have an expiration time and a link to the reservation

3. **Unique Ticket Codes**
   - Each ticket has a unique code for validation at entry
   - Codes are indexed for quick lookup during check-in

4. **Payment Tracking**
   - Orders track payment details including method, status, and third-party references
   - This allows for payment reconciliation and refund processing

5. **Audit Trail**
   - Optional audit logging helps track changes for troubleshooting and security

## Database Indexes

Indexes have been created on frequently queried fields:

- Email addresses for retrieving customer orders and reservations
- Payment status for filtering orders
- Reservation tokens for quick lookup
- Expiration times for expired reservation cleanup
- Ticket codes for validation

## Automation

The database includes a trigger function to maintain `updated_at` timestamps automatically.

A commented-out cron job is included that would:
- Release expired seat reservations
- Mark expired reservations as inactive

This requires the pg_cron extension to be enabled.

## Security Considerations

- Permissions are granted to authenticated users only
- Personal information (name, email, phone) should be handled according to privacy policies
- Payment details are stored as references only, not actual payment information

## Image Storage and URL Handling

### Storage Buckets

The application uses Supabase Storage to store media files related to recital programs:

1. **recital-covers**: Stores program cover images
   - Organized by recital ID: `{recital_id}/{unique_id}.{extension}`
   - Maximum file size: 5MB
   - Supported formats: JPG, PNG, WEBP

2. **recital-ads**: Stores advertisement images
   - Organized by program ID: `{program_id}/{ad_id}.{extension}`
   - Maximum file size: 5MB
   - Supported formats: JPG, PNG, WEBP

### URL Transformation for CSP Compliance

To comply with Content Security Policy (CSP) restrictions, the application implements URL transformation for images:

1. **Original URLs**: Direct Supabase storage URLs (e.g., `https://[project-ref].supabase.co/storage/v1/object/public/recital-covers/...`)

2. **Proxied URLs**: Application domain URLs that proxy the images (e.g., `/api/images/...`)

This transformation happens automatically in API responses, where both the original URL and a proxied URL are provided:

```json
{
  "program": {
    "id": "uuid",
    "cover_image_url": "https://[project-ref].supabase.co/storage/v1/object/public/recital-covers/...",
    "proxied_cover_image_url": "/api/images/..."
  }
}