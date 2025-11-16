<template>
  <TasksTasksListPage />
</template>

<script setup lang="ts">
/**
 * Tasks & Checklist Page
 *
 * Comprehensive task management system for recital preparation.
 * Features:
 * - Create and manage tasks with priorities and categories
 * - Assign tasks to staff members
 * - Track task progress and completion
 * - Use pre-built templates for common workflows
 * - Add comments and collaborate on tasks
 * - Filter and search tasks
 * - View progress statistics and analytics
 *
 * Route: /recitals/[id]/tasks
 *
 * Permissions: Staff and admin can manage tasks, others can view
 */

definePageMeta({
  middleware: ['auth', 'staff']
})
</script>
