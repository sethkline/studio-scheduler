<template>
  <div class="container mx-auto px-4 py-8">
    <ChoreographyNotesList />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'teacher', // Teachers, staff, and admin can access
  layout: 'default'
})
</script>
