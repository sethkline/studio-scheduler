<template>
  <TeacherDashboardPage />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'teacher']
})
</script>
