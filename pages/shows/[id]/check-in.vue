<template>
  <div class="p-6">
    <CheckInDashboardPage :show-id="showId" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'staff']
})

const route = useRoute()
const showId = route.params.id as string
</script>
