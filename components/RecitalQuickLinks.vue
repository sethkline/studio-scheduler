<template>
  <Card class="quick-links-card">
    <template #content>
      <div>
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>

        <div class="space-y-2">
          <NuxtLink
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="quick-link-item"
          >
            <div class="flex items-center gap-3">
              <div class="quick-link-icon" :class="link.color">
                <i :class="link.icon"></i>
              </div>
              <div class="flex-1">
                <div class="font-semibold text-gray-900">{{ link.label }}</div>
                <div class="text-xs text-gray-600">{{ link.description }}</div>
              </div>
              <i class="pi pi-chevron-right text-gray-400"></i>
            </div>
          </NuxtLink>
        </div>

        <!-- Emergency Contacts Section -->
        <div class="mt-6 pt-6 border-t border-gray-200">
          <button
            @click="showEmergencyContacts = !showEmergencyContacts"
            class="flex items-center justify-between w-full text-left"
          >
            <span class="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <i class="pi pi-phone text-red-600"></i>
              Emergency Contacts
            </span>
            <i
              :class="showEmergencyContacts ? 'pi-chevron-up' : 'pi-chevron-down'"
              class="pi text-gray-400"
            ></i>
          </button>

          <div v-if="showEmergencyContacts" class="mt-3 space-y-2">
            <div class="text-sm p-3 bg-gray-50 rounded border border-gray-200">
              <div class="font-semibold text-gray-900">Studio Manager</div>
              <div class="text-gray-600">Contact via studio phone</div>
            </div>
            <div class="text-sm p-3 bg-gray-50 rounded border border-gray-200">
              <div class="font-semibold text-gray-900">Venue Contact</div>
              <div class="text-gray-600">Available in venue info</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
interface Props {
  recitalId: string
}

const props = defineProps<Props>()

const showEmergencyContacts = ref(false)

const quickLinks = computed(() => [
  {
    label: 'Rehearsals',
    description: 'Schedule and track rehearsals',
    icon: 'pi pi-calendar',
    to: `/recitals/${props.recitalId}/rehearsals`,
    color: 'bg-teal-100 text-teal-700'
  },
  {
    label: 'Tasks & Checklist',
    description: 'Manage preparation tasks',
    icon: 'pi pi-check-square',
    to: `/recitals/${props.recitalId}/tasks`,
    color: 'bg-blue-100 text-blue-700'
  },
  {
    label: 'Volunteers',
    description: 'Manage volunteer shifts',
    icon: 'pi pi-users',
    to: `/recitals/${props.recitalId}/volunteers`,
    color: 'bg-purple-100 text-purple-700'
  },
  {
    label: 'Program Builder',
    description: 'Edit performance order',
    icon: 'pi pi-book',
    to: `/recitals/${props.recitalId}/program`,
    color: 'bg-green-100 text-green-700'
  },
  {
    label: 'Ticket Sales',
    description: 'View sales analytics',
    icon: 'pi pi-ticket',
    to: `/recitals/${props.recitalId}/hub#sales`,
    color: 'bg-orange-100 text-orange-700'
  },
  {
    label: 'Media Gallery',
    description: 'Photos and videos',
    icon: 'pi pi-images',
    to: `/recitals/${props.recitalId}/media`,
    color: 'bg-pink-100 text-pink-700'
  },
  {
    label: 'Parent Info',
    description: 'Information center',
    icon: 'pi pi-info-circle',
    to: `/recitals/${props.recitalId}/parent-info`,
    color: 'bg-indigo-100 text-indigo-700'
  }
])
</script>

<style scoped>
.quick-links-card {
  @apply h-full;
}

.quick-link-item {
  @apply block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors;
}

.quick-link-icon {
  @apply w-10 h-10 rounded-lg flex items-center justify-center text-lg;
}
</style>
