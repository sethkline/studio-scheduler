<template>
  <div class="p-6">
    <CampaignsListPage />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'staff']
})
</script>
