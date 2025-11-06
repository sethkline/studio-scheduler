# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A dance studio management application built with Nuxt 3, featuring class scheduling, recital management, ticketing with seat selection, and Stripe payment integration. Uses Supabase for backend/database and PrimeVue for UI components.

## Development Commands

### Running the Application
```bash
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Build for production
npm run preview          # Preview production build
```

### Testing
```bash
npm run test             # Run tests with Vitest
npm run test:coverage    # Run tests with coverage report
```

### Dependencies
```bash
npm install              # Install dependencies
npm run postinstall      # Nuxt prepare (runs automatically after install)
```

## Architecture

### Tech Stack
- **Framework**: Nuxt 3 (Vue 3, TypeScript)
- **Database/Auth**: Supabase (PostgreSQL)
- **UI Components**: PrimeVue (unstyled, custom Tailwind theme)
- **State Management**: Pinia stores
- **Styling**: Tailwind CSS with PrimeUI preset
- **Payments**: Stripe
- **Testing**: Vitest with @nuxt/test-utils
- **Forms**: VeeValidate + Yup/Zod schemas
- **Rich Text**: TipTap editor
- **Calendar**: FullCalendar
- **PDF Generation**: jsPDF, pdf-lib, puppeteer
- **PWA**: @vite-pwa/nuxt with Workbox for offline support

### Project Structure

**Pages** (`/pages`): File-based routing with nested directories for features:
- `/classes` - Class definition management
- `/schedules` - Schedule/term management
- `/teachers` - Teacher profiles and availability
- `/recitals` - Recital series, shows, and programs
- `/public` - Public-facing ticket purchase pages
- `/studio` - Studio profile and settings

**Server API** (`/server/api`): RESTful endpoints organized by resource:
- Pattern: `[resource]/[action].[method].ts` (e.g., `profile.post.ts`)
- Use `getSupabaseClient()` from `/server/utils/supabase.ts` for database access
- Return structured JSON responses with error handling via `createError()`

**Components** (`/components`): Auto-imported, organized by feature domain:
- Top-level: Shared app components (AppHeader, AppSidebar, etc.)
- Feature folders: Domain-specific components (e.g., `/recital-program`, `/seating`, `/ticket`)

**Composables** (`/composables`): Auto-imported Vue composables:
- `useApiService.ts` - Centralized API client methods
- `useRecitalProgramService.ts` - Recital program operations
- `useStripeService.ts` - Stripe integration
- `useScheduleManager.ts` - Schedule management logic
- `useTicketingService.ts` - Ticketing operations
- `usePermissions.ts` - Role and permission checking (RBAC)
- `usePwa.ts` - PWA install prompts and service worker updates
- `useOffline.ts` - Offline detection and action queue management
- `useOfflineStorage.ts` - IndexedDB caching for offline data (in utils)

**Stores** (`/stores`): Pinia stores for state management:
- `auth.ts` - Authentication state with role-based access control
- `studio.ts` - Studio profile and configuration
- `schedule.ts` - Class schedule state
- `recitalProgramStore.ts` - Recital program builder state
- `teacherAvailabilityStore.ts` - Teacher availability
- `useScheduleTermStore.ts` - Schedule term/season management

**Types** (`/types`): TypeScript interfaces and types:
- `index.ts` - Core entities (Student, Teacher, ClassDefinition, Schedule)
- `auth.ts` - Role and permission types (UserRole, Permissions, UserProfile)
- `recitals.ts` - Recital-related types
- `studio.ts` - Studio profile types
- `seatDetection.ts` - Seating chart types

**Middleware** (`/middleware`): Route guards for role-based access control
- `auth.ts` - Redirect unauthenticated users to login
- `admin.ts` - Requires admin role only
- `staff.ts` - Requires admin or staff role
- `teacher.ts` - Requires teacher, staff, or admin role
- `parent.ts` - Requires parent role or higher

**Layouts** (`/layouts`):
- `default.vue` - Main layout with AppHeader/AppSidebar
- `auth.vue` - Minimal layout for login/register pages

### Database Schema

Supabase PostgreSQL database with main tables:
- Authentication: Uses Supabase Auth with `profiles` table for user roles
- Studio: `studio_profile`, `studio_locations`, `studio_rooms`, `operating_hours`
- Classes: `class_definitions`, `class_instances`, `dance_styles`, `class_levels`
- Scheduling: `schedules`, `schedule_classes`, `schedule_terms`
- Teachers: `teachers`, `teacher_availability`, `teacher_availability_exceptions`
- Students: `students`, `class_enrollments`
- Recitals: `recitals`, `recital_series`, `recital_shows`, `recital_programs`, `recital_performances`, `recital_program_advertisements`
- Ticketing: `tickets`, `orders`, `reservations`, `seating_charts`, `seats`

See `/docs/database/recital-program-db.md` for detailed recital schema documentation.

### Key Patterns

**API Endpoints**: Follow Nuxt server route conventions:
```typescript
// server/api/resource/action.method.ts
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()
  const body = await readBody(event)
  // Validate, query database, return response
})
```

**Composables**: Service pattern for API calls:
```typescript
// composables/useApiService.ts
export function useApiService() {
  const fetchResource = async (params = {}) => {
    return await useFetch('/api/resource', { params })
  }
  return { fetchResource }
}
```

**Middleware**: Route guards using Nuxt middleware:
```typescript
// Applied in page with: definePageMeta({ middleware: 'admin' })
```

**Authentication**: Supabase user accessed via `useSupabaseUser()` composable

**Styling**: Tailwind with PrimeVue unstyled components using `tailwindcss-primeui` preset

### Environment Variables

Required variables in `.env`:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (server-side)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (client-side)
- `STRIPE_SECRET_KEY` - Stripe secret key (server-side)
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (client-side)
- `MAILGUN_API_KEY` - Mailgun API key for email
- `MAILGUN_DOMAIN` - Mailgun domain
- `MARKETING_SITE_URL` - Base URL for the application

Accessed via `runtimeConfig` in `nuxt.config.ts` (private keys server-side only).

### Feature Areas

**Class Scheduling**: Teachers manage availability, admin creates class definitions and assigns to schedules. Uses FullCalendar for visualization.

**Recitals**: Multi-show recital management with program builder (drag-and-drop class performances), PDF generation for programs.

**Ticketing**: Public ticket purchase flow with interactive seating chart, seat selection with consecutive seat detection, Stripe checkout integration, QR code ticket generation.

**Studio Management**: Profile, locations, rooms, operating hours, logo upload.

**Progressive Web App (PWA)**: Installable app with offline support, service worker caching, background sync, and automatic updates. Users can install to home screen on mobile devices and work offline with queued actions that sync when back online. See `/docs/pwa-guide.md` for complete documentation.

## Important Notes

- PrimeVue is configured with `theme: 'none'` - all styling is via Tailwind
- Supabase client is initialized differently on client vs server (see `/server/utils/supabase.ts` and auto-injected client composables)
- Toast notifications use PrimeVue Toast component (injected in `app.vue`)
- File uploads (logos, images) use Supabase Storage
- Payment processing is test mode (keys in `.env` are test keys)
- The application has both authenticated admin pages and public-facing pages (e.g., `/public/recital-tickets/[id]`)

### Role-Based Access Control (RBAC)

The application implements comprehensive role-based access control with 5 user roles and 30+ permissions.

**User Roles:**
- `admin` - Studio owner/director (full access)
- `staff` - Front desk staff (day-to-day operations)
- `teacher` - Dance instructors (manage own classes)
- `parent` - Parent/guardian (manage children, purchase tickets)
- `student` - Students (view own info, limited self-service)

**Using Permissions in Components:**
```vue
<script setup>
const { can, hasRole, isAdmin } = usePermissions()
</script>

<template>
  <Button v-if="can('canManageStudents')">Manage Students</Button>
  <PermissionGuard permission="canViewReports">
    <ReportsPage />
  </PermissionGuard>
</template>
```

**Protecting Routes:**
```vue
<script setup>
definePageMeta({
  middleware: 'admin'  // or 'staff', 'teacher', 'parent'
})
</script>
```

**Checking Permissions in API Routes:**
```typescript
import { getPermissionsForRole } from '~/types/auth'

const permissions = getPermissionsForRole(profile.user_role)
if (!permissions.canManageStudents) {
  throw createError({ statusCode: 403, message: 'Permission denied' })
}
```

See `/docs/rbac-guide.md` for complete documentation on the RBAC system.
