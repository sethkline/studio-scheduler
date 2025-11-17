<template>
  <VolunteersVolunteerShiftsListPage />
</template>

<script setup lang="ts">
/**
 * Volunteer Management Page
 *
 * Manage volunteer shifts and sign-ups for recitals.
 * Features:
 * - Create and manage volunteer shifts
 * - Track shift availability and fill rates
 * - Allow volunteers to sign up for shifts
 * - View volunteer assignments and schedules
 * - Filter by role, status, and date
 *
 * Route: /recitals/[id]/volunteers
 *
 * Permissions: All authenticated users can view and sign up
 */

definePageMeta({
  middleware: 'auth'
})
</script>
