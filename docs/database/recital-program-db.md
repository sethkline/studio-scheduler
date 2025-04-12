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

## Automatic Timestamps

Triggers are implemented to automatically update the `updated_at` timestamp when records are modified:

- `update_recital_programs_updated_at` on `recital_programs`
- `update_recital_program_advertisements_updated_at` on `recital_program_advertisements`
- `update_recital_series_updated_at` on `recital_series`
- `update_recital_shows_updated_at` on `recital_shows`
- `update_profiles_updated_at` on `profiles`

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
                                                                         v
                                                                +------------------+
                                                                | recital_programs |
                                                                +------------------+
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