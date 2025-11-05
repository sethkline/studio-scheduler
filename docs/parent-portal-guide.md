# Parent Portal Guide

This guide documents the Parent Portal implementation for the Dance Studio Scheduler application.

## Overview

The Parent Portal allows parents and guardians to:
- Register and create accounts
- Manage their dancers (children)
- View class schedules
- Purchase tickets and media
- Sign up for volunteer shifts
- Track costume pickups
- Make payments

## Database Schema

### Tables

#### `guardians`
Stores parent/guardian information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| first_name | varchar | Guardian's first name |
| last_name | varchar | Guardian's last name |
| email | varchar | Email address |
| phone | varchar | Phone number |
| address | varchar | Street address |
| city | varchar | City |
| state | varchar | State (2-letter code) |
| zip_code | varchar | ZIP code |
| profile_image_url | text | Profile photo URL |
| emergency_contact | boolean | Can be used as emergency contact |
| status | varchar | 'active' or 'inactive' |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

#### `students` (Enhanced)
Extended student profile with medical and costume information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| first_name | varchar | Student's first name |
| last_name | varchar | Student's last name |
| date_of_birth | date | Birth date |
| gender | varchar | Gender identity |
| photo_url | text | Profile photo URL |
| email | varchar | Student email (optional) |
| phone | varchar | Student phone (optional) |
| allergies | text | List of allergies |
| medical_conditions | text | Medical conditions |
| medications | text | Current medications |
| doctor_name | varchar | Primary doctor name |
| doctor_phone | varchar | Doctor phone |
| emergency_contact_name | varchar | Emergency contact name |
| emergency_contact_phone | varchar | Emergency contact phone |
| emergency_contact_relationship | varchar | Relationship to student |
| costume_size_top | varchar | Top/shirt size |
| costume_size_bottom | varchar | Bottom/pants size |
| shoe_size | varchar | Shoe size |
| height_inches | integer | Height in inches |
| notes | text | Additional notes |
| status | varchar | 'active', 'inactive', or 'on_hold' |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

#### `student_guardian_relationships`
Links students to their guardians with specific permissions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| student_id | uuid | Foreign key to students |
| guardian_id | uuid | Foreign key to guardians |
| relationship | varchar | Type of relationship |
| relationship_custom | varchar | Custom relationship description |
| primary_contact | boolean | Is primary contact |
| authorized_pickup | boolean | Can pick up student |
| financial_responsibility | boolean | Responsible for payments |
| can_authorize_medical | boolean | Can authorize medical treatment |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

**Relationship Types:**
- `parent` - Biological or adoptive parent
- `legal_guardian` - Court-appointed guardian
- `grandparent` - Grandparent
- `aunt_uncle` - Aunt or uncle
- `sibling` - Brother or sister
- `other` - Other (requires custom description)

## User Flows

### Parent Registration Flow

**Multi-step registration wizard:**

1. **Account Creation**
   - First name, last name
   - Email address
   - Phone number
   - Password (with strength validation)

2. **Address Information**
   - Street address
   - City, State, ZIP code
   - (All optional but recommended)

3. **Add Dancers**
   - Add one or more children
   - For each dancer:
     - Basic info (name, date of birth, gender)
     - Emergency contact details
     - Medical information (optional)
     - Costume sizing (optional)
     - Relationship and permissions

4. **Review & Confirm**
   - Review all entered information
   - Accept terms and conditions
   - Submit registration

**After Registration:**
- Creates Supabase auth user
- Creates profile with `user_role='parent'`
- Creates guardian record
- Creates student records
- Creates guardian-student relationships
- Sends verification email
- Redirects to login

**File:** `/pages/register-parent.vue`

### Parent Dashboard

Centralized view of all parent information.

**Sections:**
1. **Welcome Header** - Personalized greeting
2. **Quick Stats** - Overview cards showing:
   - Total dancers
   - Active class enrollments
   - Upcoming recitals
   - Action items count

3. **Action Items** - Notifications requiring attention:
   - Pending payments
   - Costume pickups
   - Volunteer hours needed
   - Forms to complete

4. **My Dancers** - Grid of all children with:
   - Name and age
   - Profile photo
   - Number of current classes
   - Next upcoming class
   - Quick view details button

5. **This Week's Schedule** - Upcoming classes for all children
6. **Upcoming Recitals** - Recital events involving children

**File:** `/pages/parent/dashboard.vue`

## Components

### AddStudentForm
Comprehensive form for adding/editing dancer information.

**Features:**
- Basic information (name, DOB, gender)
- Relationship to guardian
- Emergency contact details
- Medical information (expandable section)
  - Allergies
  - Medical conditions
  - Current medications
  - Doctor information
- Costume sizing (expandable section)
  - Top size, bottom size
  - Shoe size
  - Height
- Permissions and authorizations
  - Primary contact checkbox
  - Authorized pickup checkbox
  - Financial responsibility checkbox
  - Medical authorization checkbox
- Additional notes field

**File:** `/components/parent/AddStudentForm.vue`

## Navigation

### Parent-Specific Sidebar

Parents see a custom sidebar section titled "My Family":
- Parent Dashboard
- My Dancers
- Schedule
- Payments
- Recitals & Tickets

This section is only visible when `user_role === 'parent'`

**Implementation:** Updated `/components/AppSidebar.vue`

## Types

All parent portal types are defined in `/types/parents.ts`:

- `Guardian` - Parent/guardian profile
- `StudentProfile` - Enhanced student information
- `StudentGuardianRelationship` - Relationship and permissions
- `StudentWithGuardians` - Student with linked guardians
- `GuardianWithStudents` - Guardian with linked students
- `AddStudentForm` - Form data structure
- `ParentDashboardStats` - Dashboard statistics
- `ParentScheduleEvent` - Schedule event for parent view
- `EnrollmentRequest` - Class enrollment request
- `ParentNotificationPreferences` - Email/SMS preferences

## Permissions

Parents have the following permissions (from RBAC system):

### Allowed:
- `canViewSchedule` - View class schedule
- `canViewOwnStudents` - View their children's information
- `canPurchaseTickets` - Purchase recital tickets
- `canSignUpVolunteer` - Sign up for volunteer shifts
- `canPurchaseMedia` - Buy recital videos/downloads
- `canViewOwnPurchases` - View purchase history
- `canViewOwnPayments` - View payment history
- `canViewRecitals` - View recital information
- `canViewCostumes` - View assigned costumes
- `canViewAllClasses` - Browse available classes

### Not Allowed:
- Cannot manage other students
- Cannot access admin features
- Cannot manage classes or schedules
- Cannot view financial reports
- Cannot manage studio settings

## API Endpoints (To Be Implemented)

### Parent Dashboard
```
GET /api/parent/dashboard
```
Returns:
- Dashboard statistics
- Students with relationships
- Weekly schedule
- Upcoming recitals
- Action items

### Students
```
GET /api/parent/students
GET /api/parent/students/:id
POST /api/parent/students
PUT /api/parent/students/:id
DELETE /api/parent/students/:id
```

### Schedule
```
GET /api/parent/schedule
GET /api/parent/schedule/:studentId
```

### Enrollments
```
GET /api/parent/enrollments
POST /api/parent/enrollments
DELETE /api/parent/enrollments/:id
```

### Payments
```
GET /api/parent/payments
GET /api/parent/payments/:id
POST /api/parent/payments
```

### Tickets & Media
```
GET /api/parent/tickets
GET /api/parent/media-purchases
```

## Usage Examples

### Registering as a Parent

1. User visits `/register-parent`
2. Completes 4-step registration wizard
3. Account is created with `user_role='parent'`
4. Guardian record created
5. Students added and linked
6. Email verification sent
7. Redirect to login

### Parent Logging In

1. Login with email/password
2. Auth plugin loads profile automatically
3. Profile has `user_role='parent'`
4. Sidebar shows parent-specific navigation
5. Redirected to `/parent/dashboard`

### Adding a Child

1. Parent clicks "Add Dancer" from dashboard
2. `AddStudentForm` component opens in dialog
3. Parent fills in required information
4. Form validates data
5. API creates student record
6. Creates guardian-student relationship
7. Child appears on dashboard

### Viewing Schedule

1. Parent navigates to "Schedule"
2. Sees combined schedule for all children
3. Color-coded by dance style
4. Filterable by child
5. Shows class details (time, location, teacher)

## Database Migrations

### Required Migrations

```sql
-- Create guardians table
CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR(2),
  zip_code VARCHAR(10),
  profile_image_url TEXT,
  emergency_contact BOOLEAN DEFAULT true,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS gender VARCHAR,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
ADD COLUMN IF NOT EXISTS medications TEXT,
ADD COLUMN IF NOT EXISTS doctor_name VARCHAR,
ADD COLUMN IF NOT EXISTS doctor_phone VARCHAR,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR,
ADD COLUMN IF NOT EXISTS costume_size_top VARCHAR,
ADD COLUMN IF NOT EXISTS costume_size_bottom VARCHAR,
ADD COLUMN IF NOT EXISTS shoe_size VARCHAR,
ADD COLUMN IF NOT EXISTS height_inches INTEGER;

-- Create student_guardian_relationships table
CREATE TABLE student_guardian_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  guardian_id UUID REFERENCES guardians(id) ON DELETE CASCADE NOT NULL,
  relationship VARCHAR NOT NULL CHECK (relationship IN (
    'parent', 'legal_guardian', 'grandparent', 'aunt_uncle', 'sibling', 'other'
  )),
  relationship_custom VARCHAR,
  primary_contact BOOLEAN DEFAULT false,
  authorized_pickup BOOLEAN DEFAULT true,
  financial_responsibility BOOLEAN DEFAULT false,
  can_authorize_medical BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, guardian_id)
);

-- Add indexes
CREATE INDEX idx_guardians_user_id ON guardians(user_id);
CREATE INDEX idx_student_guardian_student ON student_guardian_relationships(student_id);
CREATE INDEX idx_student_guardian_guardian ON student_guardian_relationships(guardian_id);

-- Enable RLS
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardian_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guardians
CREATE POLICY "Guardians can view own profile"
  ON guardians FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Guardians can update own profile"
  ON guardians FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for student_guardian_relationships
CREATE POLICY "Guardians can view own relationships"
  ON student_guardian_relationships FOR SELECT
  USING (
    guardian_id IN (
      SELECT id FROM guardians WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all relationships"
  ON student_guardian_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'staff')
    )
  );
```

## Security Considerations

1. **Row Level Security (RLS)**
   - Parents can only view/edit their own profile
   - Parents can only view their own children
   - Parents cannot see other families' information

2. **Permission Checks**
   - All parent routes use `parent` middleware
   - API endpoints verify parent-student relationships
   - Financial operations require additional verification

3. **Data Privacy**
   - Medical information only visible to guardians and staff
   - Contact information protected by RLS
   - Emergency contacts encrypted in transit

## Future Enhancements

1. **Family Management**
   - Multiple guardians per student
   - Shared access between parents
   - Custody arrangements support

2. **Communication**
   - Direct messaging with teachers
   - Announcement notifications
   - Class update alerts

3. **Mobile App**
   - Native iOS/Android apps
   - Push notifications
   - QR code check-in

4. **Advanced Features**
   - Automatic payment plans
   - Waitlist management
   - Attendance tracking
   - Progress reports

## Testing Checklist

- [ ] Parent can register successfully
- [ ] All form validations work
- [ ] Students are created and linked correctly
- [ ] Dashboard loads parent data
- [ ] Navigation shows parent sections only
- [ ] Parent cannot access admin routes
- [ ] Multiple children can be managed
- [ ] Medical information is properly stored
- [ ] Costume sizes are tracked
- [ ] Permissions are correctly applied
