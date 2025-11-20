# Multi-Tenant Architecture Implementation Guide

**Date:** 2025-11-19
**Status:** ✅ Database Infrastructure Complete | ⚠️ Application Layer In Progress
**Branch:** `claude/add-multi-tenant-studios-01829x7Qt5HmPEnJdoDq5mB5`

---

## Executive Summary

This guide documents the implementation of multi-tenant architecture for the Studio Scheduler application. The system now supports multiple dance studios on a single platform with complete data isolation enforced through Row Level Security (RLS).

### What Changed

**Before:** Single-tenant application where all data belonged to "the studio"
**After:** Multi-tenant SaaS platform where data is isolated by `studio_id` foreign keys

---

## Architecture Overview

### Core Concepts

1. **Studios Table:** Each dance studio is a separate tenant with its own subscription and settings
2. **Studio Members:** Users can be members of multiple studios with different roles
3. **Studio Isolation:** All business data has a `studio_id` foreign key
4. **RLS Enforcement:** PostgreSQL RLS policies enforce studio-level data access
5. **Studio Context:** Server middleware sets studio context for each request

### Database Schema

```
studios                    # Tenant table
├── id (PK)
├── slug (unique)          # URL-friendly identifier
├── subscription_tier
├── subscription_status
└── ...

studio_members             # User-Studio junction table
├── id (PK)
├── studio_id (FK → studios)
├── user_id (FK → auth.users)
├── role                   # admin, staff, teacher, parent, student
├── status                 # active, inactive, pending, suspended
└── ...

profiles                   # User profiles
├── id (PK)
├── primary_studio_id      # User's default studio
├── user_role              # Legacy - now per-studio via studio_members
└── ...

[All Business Tables]      # Students, teachers, classes, etc.
├── studio_id (FK → studios, NOT NULL)
└── ...
```

---

## Migration Files

### Phase 1: Create Studios Infrastructure
**File:** `20251119_001_create_studios_and_members.sql`

Creates:
- `studios` table with subscription management
- `studio_members` junction table
- Helper functions for RLS:
  - `get_user_studio_ids(user_id)` - Returns studio IDs user has access to
  - `user_has_studio_access(user_id, studio_id)` - Check studio access
  - `get_user_studio_role(user_id, studio_id)` - Get user's role in studio
  - `user_is_studio_admin_or_staff(user_id, studio_id)` - Check admin/staff status
- RLS policies for studios and studio_members tables

### Phase 2: Add studio_id to All Tables
**File:** `20251119_002_add_studio_id_to_tables.sql`

Adds `studio_id UUID REFERENCES studios(id)` to:
- **Core:** students, teachers, guardians, profiles (primary_studio_id)
- **Classes:** dance_styles, class_levels, class_definitions, class_instances, enrollments
- **Scheduling:** schedules, schedule_classes, teacher_availability, teacher_availability_exceptions
- **Recitals:** recitals, recital_series, recital_shows, recital_programs, recital_performances
- **Ticketing:** venues, venue_sections, price_zones, seats, show_seats, ticket_orders, tickets
- **Payments:** payment_transactions, payment_plans, payment_methods, refunds, studio_credits
- **Other:** attendance_records, email_campaigns, media, volunteers, tasks, costumes

**Note:** NOT NULL constraints are NOT added yet (added in Phase 4 after data migration)

### Phase 3: Update RLS Policies
**File:** `20251119_003_update_rls_policies_studio_isolation.sql`

Updates all RLS policies to check studio membership:

**Before:**
```sql
-- Old role-based check
CREATE POLICY "Admin can view all students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );
```

**After:**
```sql
-- New studio-scoped check
CREATE POLICY "Studio members can view their studio students"
  ON students FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage students"
  ON students FOR ALL
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );
```

### Phase 4: Migrate Existing Data
**File:** `20251119_004_migrate_existing_data_to_default_studio.sql`

Migration steps:
1. Creates default studio from existing `studio_profile` data
2. Creates `studio_member` records for all existing users
3. Sets `studio_id` on all existing records to default studio
4. Adds NOT NULL constraints after backfill

**IMPORTANT:** Review this migration carefully before running in production!

---

## Application Layer Updates

### Server Utilities
**File:** `server/utils/auth.ts`

New studio context helpers added:

```typescript
// Get current studio ID from context or user's primary studio
getCurrentStudioId(event): Promise<string | null>

// Require studio ID (throws if not available)
requireStudioId(event): Promise<string>

// Get user's membership in a studio
getUserStudioMembership(event, studioId)

// Get user's role within a studio
getUserStudioRole(event, studioId): Promise<string | null>

// Check if user has access to a studio
hasStudioAccess(event, studioId): Promise<boolean>

// Require studio access (throws if no access)
requireStudioAccess(event, studioId)

// Check if user is admin/staff in a studio
isStudioAdminOrStaff(event, studioId): Promise<boolean>

// Require admin/staff role in a studio
requireStudioAdmin(event, studioId)

// Get all studio IDs user has access to
getUserStudioIds(event): Promise<string[]>

// Require specific role in current studio
requireStudioRole(event, allowedRoles)
```

### Server Middleware
**File:** `server/middleware/studio-context.ts`

Sets `event.context.studioId` using:
1. **Query parameter** (`?studio_id=xxx`) - For dev/testing
2. **Subdomain** (`tenant.mystudio.com`) - Production multi-tenancy
3. **User's primary studio** - Fallback for authenticated users

---

## How to Use in API Handlers

### Example 1: Studio-Scoped Data Fetch

**Before (Single-Tenant):**
```typescript
// server/api/students/index.get.ts
export default defineEventHandler(async (event) => {
  await requireAdminOrStaff(event) // Global role check

  const client = getSupabaseClient()
  const { data } = await client
    .from('students')
    .select('*')
    .eq('status', 'active')

  return { students: data }
})
```

**After (Multi-Tenant):**
```typescript
// server/api/students/index.get.ts
export default defineEventHandler(async (event) => {
  const studioId = await requireStudioId(event)
  await requireStudioAdmin(event, studioId) // Studio-scoped role check

  const client = getSupabaseClient()
  const { data } = await client
    .from('students')
    .select('*')
    .eq('studio_id', studioId) // ⚠️ CRITICAL: Filter by studio_id
    .eq('status', 'active')

  return { students: data }
})
```

### Example 2: Creating Studio-Scoped Data

```typescript
// server/api/students/create.post.ts
export default defineEventHandler(async (event) => {
  const studioId = await requireStudioId(event)
  await requireStudioAdmin(event, studioId)

  const body = await readBody(event)
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('students')
    .insert({
      ...body,
      studio_id: studioId  // ⚠️ CRITICAL: Set studio_id on insert
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 400, message: error.message })

  return { student: data }
})
```

### Example 3: Public Access with Studio Context

```typescript
// server/api/public/recital-tickets/[showId].get.ts
export default defineEventHandler(async (event) => {
  const showId = getRouterParam(event, 'showId')

  const client = getSupabaseClient()

  // RLS allows public to view active studio shows
  // No need to manually filter by studio_id - RLS handles it
  const { data: show } = await client
    .from('recital_shows')
    .select(`
      *,
      venue:venues(*),
      show_seats(*, seat:seats(*))
    `)
    .eq('id', showId)
    .single()

  return { show }
})
```

---

## How to Use in Stores

### Before (Singleton Studio):
```typescript
// stores/studio.ts
async fetchStudioProfile() {
  const { fetchStudioProfile } = useApiService()
  const { data, error } = await fetchStudioProfile() // Gets "the" profile
  this.profile = data.value
}
```

### After (Studio-Scoped):
```typescript
// stores/studio.ts
state: () => ({
  currentStudioId: null,
  profile: null,
  // ...
}),

async fetchStudioProfile(studioId: string) {
  const { fetchStudioProfile } = useApiService()
  const { data, error } = await fetchStudioProfile(studioId)

  if (data.value) {
    this.profile = data.value
    this.currentStudioId = studioId
  }
}
```

**Note:** Store updates are deferred to a future PR to minimize scope.

---

## Testing Multi-Tenancy

### 1. Create Test Studios

```sql
-- Via psql or Supabase SQL editor
INSERT INTO studios (name, slug, subscription_tier, subscription_status)
VALUES
  ('Bella Dance Studio', 'bella-dance', 'professional', 'active'),
  ('Elite Dance Academy', 'elite-dance', 'professional', 'active');
```

### 2. Create Test Users

```sql
-- Create studio memberships for test users
INSERT INTO studio_members (studio_id, user_id, role, status)
VALUES
  (
    (SELECT id FROM studios WHERE slug = 'bella-dance'),
    (SELECT id FROM auth.users WHERE email = 'admin@bella.com'),
    'admin',
    'active'
  ),
  (
    (SELECT id FROM studios WHERE slug = 'elite-dance'),
    (SELECT id FROM auth.users WHERE email = 'admin@elite.com'),
    'admin',
    'active'
  );
```

### 3. Test Data Isolation

**Test Case:** Admin from Studio A should NOT see students from Studio B

```typescript
// Login as admin@bella.com
// GET /api/students

// Expected: Only students with studio_id = bella-dance.id
// Should NOT return students from elite-dance
```

### 4. Test RLS Policies

```sql
-- Set context to simulate user
SET LOCAL jwt.claims.sub = '<user-uuid>';

-- Try to access another studio's data (should fail)
SELECT * FROM students WHERE studio_id = '<other-studio-id>';
-- Expected: 0 rows (RLS blocks it)

-- Access own studio's data (should succeed)
SELECT * FROM students WHERE studio_id = '<user-studio-id>';
-- Expected: Returns rows
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Review all 4 migration files thoroughly
- [ ] Test migrations on a staging database
- [ ] Backup production database
- [ ] Verify RLS policies are correct
- [ ] Test with multiple test studios

### Deployment Steps

1. **Run migrations in order:**
   ```bash
   # Migration 1: Create studios infrastructure
   psql -f supabase/migrations/20251119_001_create_studios_and_members.sql

   # Migration 2: Add studio_id columns
   psql -f supabase/migrations/20251119_002_add_studio_id_to_tables.sql

   # Migration 3: Update RLS policies
   psql -f supabase/migrations/20251119_003_update_rls_policies_studio_isolation.sql

   # Migration 4: Migrate existing data ⚠️ CRITICAL - TEST FIRST!
   psql -f supabase/migrations/20251119_004_migrate_existing_data_to_default_studio.sql
   ```

2. **Verify default studio was created:**
   ```sql
   SELECT * FROM studios WHERE slug = 'default-studio';
   ```

3. **Verify studio memberships were created:**
   ```sql
   SELECT COUNT(*) FROM studio_members;
   -- Should match number of users in profiles table
   ```

4. **Verify all data has studio_id set:**
   ```sql
   SELECT COUNT(*) FROM students WHERE studio_id IS NULL;
   -- Should be 0

   SELECT COUNT(*) FROM teachers WHERE studio_id IS NULL;
   -- Should be 0

   -- Repeat for all critical tables
   ```

### Post-Deployment

- [ ] Test user login and data access
- [ ] Verify RLS is working (users can't see other studios' data)
- [ ] Check application logs for errors
- [ ] Monitor database performance
- [ ] Update application code to use studio context (gradual rollout)

---

## Future Enhancements

### Phase 5: Application Layer (Future PR)

- Update all API handlers to filter by `studio_id`
- Update all stores to be studio-scoped
- Add studio switcher UI component
- Update composables to pass `studio_id`
- Add studio selection during signup

### Phase 6: Subdomain Routing (Future PR)

- Configure DNS for wildcard subdomains (*.mystudio.com)
- Update middleware to extract studio from subdomain
- Add studio slug validation
- Set up SSL for wildcard domains

### Phase 7: Studio Admin Portal (Future PR)

- Studio settings page
- Studio member management (invite, roles, remove)
- Subscription management integration with Stripe
- Usage analytics per studio
- Studio branding customization

### Phase 8: Multi-Studio User Support (Future PR)

- Studio switcher dropdown in app header
- User can easily switch between studios they're a member of
- Remember last active studio per user
- Unified notifications across studios

---

## Troubleshooting

### Issue: RLS blocking all queries

**Symptom:** Queries return empty results or RLS policy violations

**Solution:**
1. Check user is authenticated: `SELECT auth.uid()` should return user ID
2. Verify studio membership exists:
   ```sql
   SELECT * FROM studio_members WHERE user_id = auth.uid();
   ```
3. Check RLS policies are enabled:
   ```sql
   SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
   ```

### Issue: Studio context not set

**Symptom:** `requireStudioId()` throws "Studio context required" error

**Solution:**
1. Check user has `primary_studio_id` set in profiles table
2. Verify studio_members record exists for user
3. Check middleware is running (should set `event.context.studioId`)

### Issue: Data not isolated between studios

**Symptom:** Users seeing data from other studios

**Solution:**
1. Verify RLS is enabled on the table:
   ```sql
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public' AND rowsecurity = true;
   ```
2. Check RLS policies exist and are correct
3. Verify `studio_id` is set on all rows
4. Check application code is NOT bypassing RLS (e.g., using service role key client-side)

---

## Security Considerations

### 1. RLS is Critical

**Never** disable RLS on tables with `studio_id`. This is the primary security mechanism.

```sql
-- ❌ NEVER DO THIS
ALTER TABLE students DISABLE ROW LEVEL SECURITY;

-- ✅ Always keep RLS enabled
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
```

### 2. Server-Side Filtering Required

Even with RLS, always filter by `studio_id` in API handlers for performance and clarity:

```typescript
// ❌ BAD - Relies only on RLS
const { data } = await client
  .from('students')
  .select('*')

// ✅ GOOD - Explicit studio filter
const { data } = await client
  .from('students')
  .select('*')
  .eq('studio_id', studioId)
```

### 3. Service Role Key Usage

**NEVER** expose the service role key client-side. It bypasses RLS!

```typescript
// ❌ BAD - Service role key in browser
const client = createClient(url, SERVICE_ROLE_KEY) // Bypasses RLS!

// ✅ GOOD - Anon key in browser (enforces RLS)
const client = createClient(url, ANON_KEY)
```

### 4. Studio Context Validation

Always validate studio context before trusting it:

```typescript
// ✅ GOOD - Validate user has access to the studio
const studioId = await requireStudioId(event)
await requireStudioAccess(event, studioId)

// Then use studioId in queries
```

---

## Database Performance

### Indexes Added

All `studio_id` columns have indexes for fast filtering:

```sql
CREATE INDEX idx_students_studio ON students(studio_id);
CREATE INDEX idx_teachers_studio ON teachers(studio_id);
CREATE INDEX idx_classes_studio ON class_instances(studio_id);
-- ... etc
```

### Query Patterns

**Efficient:**
```sql
-- Uses index on studio_id
SELECT * FROM students WHERE studio_id = $1;
```

**Inefficient:**
```sql
-- Full table scan
SELECT * FROM students WHERE studio_id IN (
  SELECT studio_id FROM studio_members WHERE user_id = $1
);
```

**Solution:** Use the helper function which is marked SECURITY DEFINER:
```sql
SELECT * FROM students WHERE studio_id = ANY(get_user_studio_ids($1));
```

---

## Support & Questions

For questions or issues:
1. Check this documentation first
2. Review migration files for implementation details
3. Test queries in psql to verify RLS behavior
4. Check server logs for detailed error messages

---

## Conclusion

The multi-tenant infrastructure is now complete at the database level. The system enforces studio isolation through RLS policies, and all necessary helper functions and server utilities are in place.

**Next Steps:**
1. Review and test migrations in staging environment
2. Deploy migrations to production
3. Gradually update API handlers to use studio context
4. Add studio switcher UI for users
5. Implement subdomain routing for true multi-tenancy

**Status:** ✅ **Ready for Review and Testing**
