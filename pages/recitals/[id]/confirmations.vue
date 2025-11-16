<template>
  <div class="p-6">
    <ConfirmationDashboardPage :recital-id="recitalId" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'staff']
})

const route = useRoute()
const recitalId = route.params.id as string
</script>
