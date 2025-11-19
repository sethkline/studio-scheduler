<template>
  <FeesFeeTypesListPage />
</template>

<script setup lang="ts">
/**
 * Fee Types Management Page
 *
 * Allows staff and admin to manage fee types for a recital.
 * Features:
 * - Create/edit/delete fee types
 * - Set pricing, due dates, early bird discounts, late fees
 * - Assign fees to students
 * - View assignment statistics
 *
 * Route: /recitals/[id]/fees/types
 *
 * Permissions: Staff and admin only
 */

definePageMeta({
  middleware: ['auth', 'staff']
})
</script>
