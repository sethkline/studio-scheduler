# Role-Based Access Control (RBAC) Guide

This guide explains how to use the Role-Based Access Control system in the Dance Studio Scheduler application.

## Table of Contents

- [Overview](#overview)
- [User Roles](#user-roles)
- [Permissions](#permissions)
- [Usage Examples](#usage-examples)
- [Middleware](#middleware)
- [Components](#components)
- [Best Practices](#best-practices)

## Overview

The RBAC system provides fine-grained access control based on user roles and permissions. It includes:

- 5 user roles (admin, staff, teacher, parent, student)
- 30+ granular permissions
- Easy-to-use composable for checking permissions
- Route middleware for protecting pages
- Component guards for protecting UI sections

## User Roles

### Admin
**Full access to all features**
- Studio owners and directors
- Can manage all settings, users, and data
- Permissions: All

### Staff
**Front desk and administrative staff**
- Can manage day-to-day operations
- Cannot change studio settings or manage users
- Permissions: Class management, student enrollment, ticket sales, recital management

### Teacher
**Dance instructors**
- Can manage their own classes
- View students and schedules
- Manage costumes for their performances
- Permissions: View schedule, manage own classes, view students, manage costumes

### Parent
**Parent/Guardian accounts**
- Can view and manage their own children's information
- Purchase tickets and media
- Sign up for volunteer shifts
- Permissions: View own students, purchase tickets, sign up for volunteers

### Student
**Student accounts (limited self-service)**
- Can view their own schedule
- View recital information
- View own purchases
- Permissions: View schedule, view own info, view recitals

## Permissions

Permissions are organized into functional groups:

### Studio Management
- `canManageStudioProfile` - Edit studio profile
- `canManageLocations` - Manage locations and rooms
- `canManageSettings` - Access system settings

### Class Management
- `canManageClassDefinitions` - Create/edit class definitions
- `canManageDanceStyles` - Manage dance styles
- `canManageClassLevels` - Manage class levels
- `canViewAllClasses` - View all classes
- `canManageOwnClasses` - Manage own classes (teachers)

### Schedule Management
- `canManageSchedules` - Create/edit schedules
- `canViewSchedule` - View schedule
- `canBuildSchedule` - Use schedule builder

### People Management
- `canManageStudents` - Full student management
- `canViewAllStudents` - View all students
- `canViewOwnStudents` - View own children (parents)
- `canManageTeachers` - Manage teacher accounts
- `canManageParents` - Manage parent accounts

### Recital Management
- `canManageRecitals` - Create/edit recitals
- `canViewRecitals` - View recital information
- `canManagePrograms` - Edit recital programs
- `canManageCostumes` - Full costume management
- `canViewCostumes` - View costume assignments
- `canManageVolunteers` - Manage volunteer shifts
- `canSignUpVolunteer` - Sign up for volunteer shifts

### Tickets & Media
- `canManageTickets` - Manage ticket sales
- `canPurchaseTickets` - Purchase tickets
- `canManageMedia` - Upload and manage media
- `canPurchaseMedia` - Purchase digital media
- `canViewOwnPurchases` - View own purchases

### Financial
- `canViewReports` - View financial reports
- `canManagePayments` - Process payments
- `canViewOwnPayments` - View own payment history

### User Management
- `canManageUsers` - Create/edit user accounts
- `canManageRoles` - Assign user roles

## Usage Examples

### In Components

#### Using the Permissions Composable

```vue
<script setup>
import { usePermissions } from '~/composables/usePermissions'

const { can, hasRole, isAdmin, isParent } = usePermissions()

// Check specific permission
if (can('canManageStudents')) {
  // Show student management UI
}

// Check role
if (hasRole(['admin', 'staff'])) {
  // Show admin features
}

// Use role helpers
if (isAdmin.value) {
  // Admin-only features
}
</script>

<template>
  <div>
    <!-- Conditionally show based on permission -->
    <Button v-if="can('canManageRecitals')" @click="createRecital">
      Create Recital
    </Button>

    <!-- Conditionally show based on role -->
    <div v-if="isParent">
      <h2>My Children</h2>
      <!-- Parent-specific content -->
    </div>
  </div>
</template>
```

#### Using PermissionGuard Component

```vue
<template>
  <div>
    <!-- Show content only if user has permission -->
    <PermissionGuard permission="canManageStudents">
      <StudentManagementPanel />
    </PermissionGuard>

    <!-- Show content only if user has specific role -->
    <PermissionGuard :roles="['admin', 'staff']">
      <AdminDashboard />
    </PermissionGuard>

    <!-- Show "access denied" message if no permission -->
    <PermissionGuard
      permission="canViewReports"
      :showDenied="true"
      deniedTitle="Reports Unavailable"
      deniedMessage="You need admin access to view reports."
    >
      <ReportsPage />
    </PermissionGuard>
  </div>
</template>
```

### In Server API Routes

```typescript
// server/api/students/index.get.ts
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const user = event.context.user

  // Get user profile
  const { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check permission
  const permissions = getPermissionsForRole(profile.user_role)

  if (!permissions.canViewAllStudents && !permissions.canViewOwnStudents) {
    throw createError({
      statusCode: 403,
      message: 'Permission denied'
    })
  }

  // If parent, only return their students
  if (profile.user_role === 'parent') {
    // Fetch only students linked to this parent
    const { data: students } = await client
      .from('students')
      .select(`
        *,
        student_guardian_relationships!inner(guardian_id)
      `)
      .eq('student_guardian_relationships.guardian_id', profile.id)

    return { students }
  }

  // Admin/staff can see all students
  const { data: students } = await client
    .from('students')
    .select('*')

  return { students }
})
```

## Middleware

### Available Middleware

#### `auth.ts`
Basic authentication check - redirects to login if not authenticated.

```vue
<script setup>
definePageMeta({
  middleware: 'auth'
})
</script>
```

#### `admin.ts`
Requires admin role - redirects to unauthorized page if not admin.

```vue
<script setup>
definePageMeta({
  middleware: 'admin'
})
</script>
```

#### `staff.ts`
Requires admin or staff role.

```vue
<script setup>
definePageMeta({
  middleware: 'staff'
})
</script>
```

#### `teacher.ts`
Requires teacher, staff, or admin role.

```vue
<script setup>
definePageMeta({
  middleware: 'teacher'
})
</script>
```

#### `parent.ts`
Requires parent role or higher.

```vue
<script setup>
definePageMeta({
  middleware: 'parent'
})
</script>
```

### Multiple Middleware

You can combine multiple middleware:

```vue
<script setup>
definePageMeta({
  middleware: ['auth', 'admin']
})
</script>
```

## Components

### PermissionGuard

Wrap content that should only be visible to users with specific permissions or roles.

**Props:**
- `permission` (keyof Permissions) - Required permission
- `roles` (UserRole[]) - Required roles (user must have one)
- `showDenied` (boolean) - Show "access denied" message (default: false)
- `deniedTitle` (string) - Custom denied title
- `deniedMessage` (string) - Custom denied message

**Example:**

```vue
<PermissionGuard
  permission="canManageStudents"
  :showDenied="true"
>
  <StudentManagementPanel />
</PermissionGuard>
```

## Best Practices

### 1. Always Check Permissions at Multiple Levels

Check permissions in:
- **Route middleware** - Prevent access to entire pages
- **Component level** - Hide UI elements
- **API level** - Enforce on server

### 2. Use Specific Permissions, Not Roles

❌ **Bad:**
```vue
<Button v-if="isAdmin">Delete Student</Button>
```

✅ **Good:**
```vue
<Button v-if="can('canManageStudents')">Delete Student</Button>
```

This is more flexible - if you later want to give staff permission to delete students, you just update the permission mapping, not the code.

### 3. Fail Closed, Not Open

If permission check fails, deny access by default.

❌ **Bad:**
```typescript
const canAccess = permissions?.canManageStudents || true
```

✅ **Good:**
```typescript
const canAccess = permissions?.canManageStudents || false
```

### 4. Provide Clear Feedback

When denying access, tell users why:

```vue
<PermissionGuard
  permission="canViewReports"
  :showDenied="true"
  deniedTitle="Reports Unavailable"
  deniedMessage="You need administrator access to view financial reports. Please contact your studio owner."
>
  <ReportsPage />
</PermissionGuard>
```

### 5. Load Profile Early

The auth plugin automatically loads the user profile, but you can ensure it's loaded in components:

```vue
<script setup>
const { ensureProfile } = usePermissions()

onMounted(async () => {
  await ensureProfile()
})
</script>
```

### 6. Handle Loading States

```vue
<script setup>
const authStore = useAuthStore()
const { can } = usePermissions()
</script>

<template>
  <div v-if="authStore.loading">
    <i class="pi pi-spin pi-spinner"></i> Loading...
  </div>
  <div v-else-if="can('canManageStudents')">
    <StudentManagementPanel />
  </div>
  <div v-else>
    <p>You don't have permission to manage students.</p>
  </div>
</template>
```

## Modifying Permissions

To add or modify permissions:

1. **Update types** (`types/auth.ts`):
   - Add new permission to `Permissions` interface
   - Update `RolePermissions` mapping for each role

2. **No code changes needed** - The system automatically uses the updated permissions!

Example:

```typescript
// types/auth.ts
export interface Permissions {
  // ... existing permissions
  canManageInventory: boolean  // NEW
}

export const RolePermissions: Record<UserRole, Permissions> = {
  admin: {
    // ... existing permissions
    canManageInventory: true  // NEW
  },
  staff: {
    // ... existing permissions
    canManageInventory: true  // NEW
  },
  // ... other roles (set to false if they shouldn't have access)
}
```

## Troubleshooting

### User can't access a page they should have access to

1. Check if their profile has the correct role in the database
2. Verify the middleware is correctly checking the role
3. Check browser console for errors
4. Ensure profile is loaded (check `authStore.isProfileLoaded`)

### Permission checks always return false

1. Ensure auth plugin is running (`plugins/auth.ts`)
2. Check if user is logged in
3. Verify profile is loaded from database
4. Check browser console for errors in `fetchUserProfile()`

### Changes to permissions not taking effect

1. Refresh the browser (hard refresh: Cmd+Shift+R)
2. Check if you updated both the interface and the role mapping
3. Ensure TypeScript compiled without errors

## Migration from Old System

The old system used hardcoded checks:

```typescript
// OLD
const isAdmin = computed(() => true) // Hardcoded!
```

Now update to:

```typescript
// NEW
const { isAdmin } = usePermissions()
```

All occurrences of the old pattern should be replaced with the composable.
