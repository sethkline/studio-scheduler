<template>
  <Card>
    <template #content>
      <div>
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Assigned Staff</h3>

        <!-- Empty State -->
        <div v-if="!staff || staff.length === 0" class="text-center py-8 text-gray-500">
          <i class="pi pi-users text-4xl mb-3"></i>
          <p>No staff assigned yet</p>
          <p class="text-sm mt-2">Assign staff members to tasks to see them here</p>
        </div>

        <!-- Staff Grid -->
        <div v-else class="staff-grid">
          <div
            v-for="member in staff"
            :key="member.id"
            class="staff-card"
          >
            <div class="flex items-center gap-3">
              <!-- Avatar -->
              <div class="staff-avatar">
                <img
                  v-if="member.avatar_url"
                  :src="member.avatar_url"
                  :alt="member.full_name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="staff-avatar-placeholder">
                  {{ getInitials(member.full_name) }}
                </div>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="staff-name">{{ member.full_name }}</p>
                <p class="staff-email">{{ member.email }}</p>
              </div>

              <!-- Contact Button -->
              <Button
                icon="pi pi-envelope"
                severity="secondary"
                text
                rounded
                size="small"
                @click="contactStaff(member)"
              />
            </div>
          </div>
        </div>

        <!-- View All Link -->
        <div v-if="staff && staff.length > 6" class="mt-4 text-center">
          <Button
            label="View All Staff"
            severity="secondary"
            text
            icon="pi pi-arrow-right"
            iconPos="right"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
interface StaffMember {
  id: string
  full_name: string
  email: string
  avatar_url?: string
}

interface Props {
  staff?: StaffMember[]
}

defineProps<Props>()

const getInitials = (name: string) => {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

const contactStaff = (member: StaffMember) => {
  window.location.href = `mailto:${member.email}`
}
</script>

<style scoped>
.staff-grid {
  @apply grid grid-cols-1 gap-3;
}

.staff-card {
  @apply p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors;
}

.staff-avatar {
  @apply w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100;
}

.staff-avatar-placeholder {
  @apply w-full h-full flex items-center justify-center text-sm font-semibold text-gray-700 bg-gradient-to-br from-blue-400 to-purple-500 text-white;
}

.staff-name {
  @apply font-semibold text-gray-900 text-sm truncate;
}

.staff-email {
  @apply text-xs text-gray-600 truncate;
}
</style>
