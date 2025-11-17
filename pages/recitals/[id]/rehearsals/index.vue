<template>
  <RehearsalRehearsalListPage />
</template>

<script setup lang="ts">
/**
 * Rehearsals List Page
 *
 * Displays all rehearsals for a recital show with filtering and management options.
 *
 * Route: /recitals/[id]/rehearsals
 *
 * Permissions: Staff and teachers can view and manage rehearsals.
 * Parents can view rehearsals their children are participating in.
 */

definePageMeta({
  middleware: 'auth'
})
</script>
