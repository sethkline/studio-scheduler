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
| teacher_id | uuid | FK → users/teachers | Assigned teacher |
| studio_id | uuid | FK → studios | Assigned studio room |
| status | varchar | default 'active' | Class status |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `enrollments`
Tracks student enrollments in class instances.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| student_id | uuid | NOT NULL, FK → students | Enrolled student |
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
| teacher_id | uuid | FK → users/teachers | Teacher override |
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

#### `recitals`
Defines recital events.

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
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `recital_performances`
Individual performances within a recital.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| recital_id | uuid | NOT NULL, FK → recitals(id) | Associated recital |
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
| recital_id | uuid | NOT NULL, FK → recitals(id), UNIQUE | Associated recital |
| cover_image_url | text | | URL to program cover image |
| artistic_director_note | text | | Note from artistic director |
| acknowledgments | text | | Acknowledgments section |
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
| recital_id | uuid | NOT NULL, FK → recitals(id) | Associated recital |
| class1_id | uuid | NOT NULL, FK → class_instances(id) | First class |
| class2_id | uuid | NOT NULL, FK → class_instances(id) | Second class |
| min_spacing | integer | NOT NULL | Minimum positions between classes |
| created_at | timestamp with timezone | default now() | Creation timestamp |

## Key Relationships

### Recital Program Structure
- A `recital` has exactly one `recital_program` (one-to-one relationship)
- A `recital_program` can have multiple `recital_program_advertisements` (one-to-many relationship)
- A `recital` has multiple `recital_performances` (one-to-many relationship)

### Class Hierarchy
- `dance_styles` and `class_levels` categorize `class_definitions`
- `class_definitions` serve as templates for `class_instances`
- `class_instances` are scheduled in `schedule_classes` and perform in `recital_performances`

### Student Enrollment
- Students connect to classes through the `enrollments` table
- The list of dancers for a performance is determined by active enrollments in the associated `class_instance`

## Indexes

The following indexes improve query performance:

- `idx_recital_performances_recital_id` on `recital_performances(recital_id)`
- `idx_recital_program_advertisements_program_id` on `recital_program_advertisements(recital_program_id)`

## Automatic Timestamps

Triggers are implemented to automatically update the `updated_at` timestamp when records are modified:

- `update_recital_programs_updated_at` on `recital_programs`
- `update_recital_program_advertisements_updated_at` on `recital_program_advertisements`

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
                                                                          |
                                                                          v
                                                                  +---------------+
                                                                  |    recitals   |
                                                                  +---------------+
                                                                          |
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

## Future Database Enhancements

Potential future enhancements to the database schema include:

1. Adding a `program_templates` table for reusable program layouts
2. Implementing a `quick_changes` table to track students who need to change quickly between performances
3. Adding a `program_sections` table to group performances into program segments
4. Creating a `digital_assets` table for managing program-related media files
5. Adding a `program_feedback` table for collecting audience feedback

## SQL Migration Script

Below is the SQL migration script to create and configure the recital program-related tables:

```sql
-- Create recital_programs table
CREATE TABLE IF NOT EXISTS public.recital_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recital_id UUID NOT NULL REFERENCES public.recitals(id) ON DELETE CASCADE,
    cover_image_url TEXT,
    artistic_director_note TEXT,
    acknowledgments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(recital_id)
);

-- Create recital_program_advertisements table
CREATE TABLE IF NOT EXISTS public.recital_program_advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recital_program_id UUID NOT NULL REFERENCES public.recital_programs(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    image_url TEXT,
    order_position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add choreographer column to recital_performances if it doesn't exist
ALTER TABLE public.recital_performances 
ADD COLUMN IF NOT EXISTS choreographer VARCHAR;

-- Add notes column to recital_performances if it doesn't exist
ALTER TABLE public.recital_performances 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recital_performances_recital_id 
ON public.recital_performances(recital_id);

CREATE INDEX IF NOT EXISTS idx_recital_program_advertisements_program_id 
ON public.recital_program_advertisements(recital_program_id);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to relevant tables
DROP TRIGGER IF EXISTS update_recital_programs_updated_at ON public.recital_programs;
CREATE TRIGGER update_recital_programs_updated_at
BEFORE UPDATE ON public.recital_programs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recital_program_advertisements_updated_at ON public.recital_program_advertisements;
CREATE TRIGGER update_recital_program_advertisements_updated_at
BEFORE UPDATE ON public.recital_program_advertisements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add column to recital table for theme if it doesn't exist
ALTER TABLE public.recitals
ADD COLUMN IF NOT EXISTS theme VARCHAR;

-- Add column to recital table for program_notes if it doesn't exist
ALTER TABLE public.recitals
ADD COLUMN IF NOT EXISTS program_notes TEXT;
```
