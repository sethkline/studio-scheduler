<template>
  <FeesParentPaymentPortalPage />
</template>

<script setup lang="ts">
/**
 * Fees & Payments Portal Page
 *
 * Main entry point for recital fees. Displays different views based on user role:
 * - Parents: See their children's fees and make payments
 * - Staff/Admin: Redirects to payment dashboard
 *
 * Route: /recitals/[id]/fees
 *
 * Permissions: Authenticated users only
 */

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const { hasRole } = usePermissions()

// Redirect staff/admin to payment dashboard
onMounted(() => {
  if (hasRole('staff') || hasRole('admin')) {
    router.push(`/recitals/${route.params.id}/fees/payments`)
  }
})
</script>
