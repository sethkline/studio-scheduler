<template>
  <div>
    <ParentConfirmationPage :student-id="studentId" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'parent']
})

const route = useRoute()
const studentId = route.params.id as string
</script>
