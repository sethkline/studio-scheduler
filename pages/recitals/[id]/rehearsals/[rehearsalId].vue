<template>
  <RehearsalRehearsalDetailPage />
</template>

<script setup lang="ts">
/**
 * Rehearsal Detail Page
 *
 * Displays detailed information about a specific rehearsal including:
 * - Rehearsal details and requirements
 * - Attendance tracking
 * - Resources (videos, documents, links)
 *
 * Route: /recitals/[id]/rehearsals/[rehearsalId]
 *
 * Permissions: Staff and teachers can view and manage.
 * Parents can view rehearsals their children are in.
 */

definePageMeta({
  middleware: 'auth'
})
</script>
