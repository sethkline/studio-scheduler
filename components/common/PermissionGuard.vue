<template>
  <div v-if="hasAccess">
    <slot />
  </div>
  <div v-else-if="showDenied" class="permission-denied">
    <div class="text-center py-8">
      <i class="pi pi-lock text-4xl text-gray-400 mb-3"></i>
      <h3 class="text-lg font-semibold text-gray-700">{{ deniedTitle }}</h3>
      <p class="text-gray-500 mt-2">{{ deniedMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePermissions } from '~/composables/usePermissions'
import type { UserRole, Permissions } from '~/types/auth'

interface Props {
  /**
   * Required permission - user must have this permission to see content
   */
  permission?: keyof Permissions

  /**
   * Required roles - user must have one of these roles to see content
   */
  roles?: UserRole[]

  /**
   * Show "access denied" message if user doesn't have permission
   * Default: false (just hide content)
   */
  showDenied?: boolean

  /**
   * Custom denied title
   */
  deniedTitle?: string

  /**
   * Custom denied message
   */
  deniedMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  showDenied: false,
  deniedTitle: 'Access Denied',
  deniedMessage: 'You do not have permission to view this content.',
})

const { can, hasRole } = usePermissions()

/**
 * Check if user has access based on permission or role
 */
const hasAccess = computed(() => {
  // If permission is specified, check it
  if (props.permission) {
    return can(props.permission)
  }

  // If roles are specified, check them
  if (props.roles && props.roles.length > 0) {
    return hasRole(props.roles)
  }

  // If neither is specified, deny access by default
  return false
})
</script>

<style scoped>
.permission-denied {
  @apply bg-gray-50 border border-gray-200 rounded-lg p-6;
}
</style>
