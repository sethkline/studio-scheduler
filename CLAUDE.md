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

## Troubleshooting

### Common Development Issues

#### Build Errors

**Problem**: `Cannot find module` errors during build

**Solution**:
```bash
# Clear Nuxt cache
rm -rf .nuxt node_modules/.cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

**Problem**: TypeScript errors in IDE but build succeeds

**Solution**:
- Restart TypeScript server in VSCode: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
- Ensure `.nuxt/tsconfig.json` exists (run `npm run dev` first)
- Check that VSCode is using workspace TypeScript version

#### Database/Supabase Issues

**Problem**: `Invalid API key` or authentication errors

**Solution**:
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct in `.env`
- Check that `.env` file is in project root
- Restart dev server after changing `.env`
- Ensure Supabase project is not paused (free tier auto-pauses after 7 days inactivity)

**Problem**: RLS policy errors (`new row violates row-level security policy`)

**Solution**:
- Check that user is authenticated: `const user = useSupabaseUser()`
- Verify user role in `profiles` table matches required permission
- Review RLS policies in Supabase dashboard
- Use service role key server-side for admin operations

**Problem**: Real-time subscriptions not working

**Solution**:
- Enable Realtime in Supabase dashboard for relevant tables
- Check browser console for WebSocket errors
- Verify channel subscription code is correct
- Ensure table has `REPLICA IDENTITY FULL` enabled for UPDATE events

#### Stripe Integration Issues

**Problem**: Webhook not receiving events

**Solution**:
- For local development, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Verify webhook endpoint is accessible (not behind auth middleware)
- Check webhook signing secret matches in `.env`
- Review webhook event logs in Stripe Dashboard

**Problem**: `No such customer` errors

**Solution**:
- Verify using correct Stripe keys (test vs. production)
- Check that customer ID exists in Stripe dashboard
- Ensure customer ID is stored correctly in database
- Create customer before creating checkout session

**Problem**: Payment succeeds but order not created

**Solution**:
- Check server logs for webhook processing errors
- Verify webhook signature validation is passing
- Ensure database transaction completes successfully
- Check for idempotency issues (duplicate webhooks)

#### Email Delivery Issues

**Problem**: Emails not sending

**Solution**:
- Verify Mailgun API key and domain in `.env`
- Check Mailgun domain is verified (DNS records)
- Review Mailgun logs for delivery errors
- Ensure email addresses are valid
- Check spam folder for delivered emails

**Problem**: Email formatting issues

**Solution**:
- Test MJML template in [MJML Playground](https://mjml.io/try-it-live)
- Verify all MJML tags are properly closed
- Check for syntax errors in template variables
- Test with different email clients

#### Performance Issues

**Problem**: Slow page loads

**Solution**:
- Check browser Network tab for slow requests
- Optimize database queries (add indexes)
- Use `useLazyAsyncData` for non-critical data
- Enable Nuxt `ssr: true` for faster initial load
- Implement pagination for large lists

**Problem**: High memory usage

**Solution**:
- Check for memory leaks (unsubscribed listeners, intervals)
- Use `onUnmounted` to clean up subscriptions
- Limit number of real-time subscriptions
- Clear large arrays when component unmounts

#### Testing Issues

**Problem**: Tests failing with module resolution errors

**Solution**:
- Ensure `@nuxt/test-utils` is installed
- Add `vitest.config.ts` with correct module aliases
- Use `setup()` from `@nuxt/test-utils` in test files
- Clear Vitest cache: `rm -rf node_modules/.vitest`

**Problem**: Component tests failing with PrimeVue errors

**Solution**:
- Mock PrimeVue components in tests
- Install required PrimeVue components in test setup
- Use shallow mounting to avoid rendering child components

### Environment-Specific Issues

#### Local Development

**Port already in use**:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

**Hot reload not working**:
- Check that file watcher limit is not exceeded (Linux)
- Restart dev server
- Clear browser cache
- Check for errors in terminal

#### Production/Deployment

**Build succeeds but app crashes**:
- Check environment variables are set correctly
- Review server logs for errors
- Verify Node.js version matches requirement (18+)
- Check for missing dependencies in production

**Database connection errors**:
- Verify Supabase connection pooling settings
- Check IP allowlist in Supabase (if restricted)
- Ensure service role key is used server-side only
- Review connection string format

**Stripe webhooks not working in production**:
- Update webhook endpoint URL in Stripe Dashboard
- Verify webhook signing secret for production
- Ensure server can receive POST requests at webhook endpoint
- Check server firewall/security group settings

### Debugging Tips

**Enable verbose logging**:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  debug: true,
  devtools: { enabled: true }
})
```

**Debug API endpoints**:
```typescript
// server/api/example.ts
export default defineEventHandler(async (event) => {
  console.log('Request body:', await readBody(event))
  console.log('Request headers:', getHeaders(event))
  // ... rest of handler
})
```

**Debug Supabase queries**:
```typescript
const { data, error } = await supabase
  .from('table')
  .select()

console.log('Supabase response:', { data, error })
```

**Debug real-time subscriptions**:
```typescript
const channel = supabase.channel('test')
  .on('postgres_changes', { /* ... */ }, (payload) => {
    console.log('Realtime event:', payload)
  })
  .subscribe((status) => {
    console.log('Subscription status:', status)
  })
```

### Getting Help

If you're still stuck after trying these solutions:

1. **Search existing documentation**:
   - [Architecture Guide](/docs/architecture.md)
   - [Deployment Guide](/docs/deployment.md)
   - [Testing Guide](/docs/testing.md)
   - Workflow guides in `/docs/workflows/`

2. **Check external documentation**:
   - [Nuxt 3 Docs](https://nuxt.com/docs)
   - [Supabase Docs](https://supabase.com/docs)
   - [Stripe Docs](https://stripe.com/docs)
   - [PrimeVue Docs](https://primevue.org/)

3. **Search GitHub Issues**:
   - Check if someone else had the same problem
   - Look for closed issues with solutions

4. **Create a new issue**:
   - Provide detailed error messages
   - Include steps to reproduce
   - Share relevant code snippets
   - Mention what you've already tried

5. **Community resources**:
   - Nuxt Discord
   - Supabase Discord
   - Stack Overflow (tag with `nuxt3`, `supabase`, `stripe`)

### Quick Reference

**Clear all caches**:
```bash
rm -rf .nuxt node_modules/.cache node_modules/.vitest coverage
```

**Reset database (development only)**:
```sql
-- In Supabase SQL Editor
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then re-run migrations
```

**Test webhook locally**:
```bash
stripe trigger checkout.session.completed
```

**Generate TypeScript types from Supabase**:
```bash
npx supabase gen types typescript --project-id your-project-id > types/database.ts
```
