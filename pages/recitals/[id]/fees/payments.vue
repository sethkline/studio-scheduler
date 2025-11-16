<template>
  <FeesPaymentDashboardPage />
</template>

<script setup lang="ts">
/**
 * Payment Dashboard Page
 *
 * Comprehensive payment tracking dashboard for staff and admin.
 * Features:
 * - View all student fees and payment status
 * - Filter by payment status, fee type, student name
 * - Record payments (cash, check, credit card)
 * - Track collection rate and outstanding balances
 * - Summary statistics
 *
 * Route: /recitals/[id]/fees/payments
 *
 * Permissions: Staff and admin only
 */

definePageMeta({
  middleware: ['auth', 'staff']
})
</script>
