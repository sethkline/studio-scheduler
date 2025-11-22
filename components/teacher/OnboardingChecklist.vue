<template>
  <Card class="onboarding-checklist">
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi pi-list-check text-white text-xl"></i>
          <span>Getting Started as a Teacher</span>
        </div>
        <Button
          icon="pi pi-times"
          class="p-button-text p-button-rounded p-button-sm text-white hover:bg-white/20"
          @click="dismiss"
          v-tooltip.left="'Dismiss checklist'"
        />
      </div>
    </template>
    <template #content>
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-white/90">{{ completedCount }} of {{ checklistItems.length }} completed</span>
          <span class="text-sm font-semibold text-white">{{ progressPercent }}%</span>
        </div>
        <ProgressBar :value="progressPercent" :show-value="false" style="height: 6px" />
      </div>

      <div class="space-y-2">
        <div
          v-for="item in checklistItems"
          :key="item.id"
          class="checklist-item"
          :class="{ 'completed': item.completed, 'clickable': !item.completed && item.action }"
          @click="handleItemClick(item)"
        >
          <div class="flex items-start gap-3">
            <div class="checklist-checkbox">
              <i v-if="item.completed" class="pi pi-check text-white text-sm"></i>
            </div>
            <div class="flex-1">
              <div class="font-medium text-white" :class="{ 'line-through opacity-70': item.completed }">
                {{ item.title }}
              </div>
              <div class="text-sm text-white/80 mt-0.5">{{ item.description }}</div>
            </div>
            <Button
              v-if="!item.completed && item.action"
              icon="pi pi-arrow-right"
              class="p-button-text p-button-rounded p-button-sm text-white hover:bg-white/20"
              @click.stop="item.action"
            />
          </div>
        </div>
      </div>

      <div v-if="allCompleted" class="mt-4 p-4 bg-white/20 border border-white/30 rounded-lg">
        <div class="flex items-center gap-2 text-white">
          <i class="pi pi-check-circle text-xl"></i>
          <div>
            <div class="font-semibold">Congratulations!</div>
            <div class="text-sm text-white/90">You're all set up and ready to teach!</div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['complete'])

const authStore = useAuthStore()

interface ChecklistItem {
  id: string
  title: string
  description: string
  completed: boolean
  action?: () => void
}

const checklistItems = ref<ChecklistItem[]>([
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Add your bio, photo, and specialties',
    completed: false,
    action: () => navigateTo('/teacher/profile')
  },
  {
    id: 'photo',
    title: 'Upload Profile Photo',
    description: 'Add a professional photo',
    completed: false,
    action: () => navigateTo('/teacher/profile')
  },
  {
    id: 'availability',
    title: 'Set Your Availability',
    description: 'Let us know when you can teach',
    completed: false,
    action: () => navigateTo('/teacher/availability')
  },
  {
    id: 'classes',
    title: 'Review Your Classes',
    description: 'Check your assigned classes',
    completed: false,
    action: () => navigateTo('/teacher/classes')
  },
  {
    id: 'attendance',
    title: 'Learn Attendance System',
    description: 'Understand how to take attendance',
    completed: false,
    action: () => navigateTo('/teacher/attendance')
  }
])

const completedCount = computed(() => {
  return checklistItems.value.filter(item => item.completed).length
})

const progressPercent = computed(() => {
  return Math.round((completedCount.value / checklistItems.value.length) * 100)
})

const allCompleted = computed(() => {
  return completedCount.value === checklistItems.value.length
})

onMounted(async () => {
  await checkCompletionStatus()
})

async function checkCompletionStatus() {
  try {
    // Get teacher profile from auth store
    const profile = authStore.profile

    // Check profile completion
    if (profile) {
      checklistItems.value[0].completed = !!(profile.first_name && profile.last_name && profile.email)
      checklistItems.value[1].completed = !!profile.photo_url
    }

    // Check if teacher has availability set
    const teacherId = profile?.teacher_id
    if (teacherId) {
      const { data: availabilityData } = await useFetch(`/api/teachers/${teacherId}/availability-list`)
      checklistItems.value[2].completed = Array.isArray(availabilityData.value) && availabilityData.value.length > 0

      // Check if teacher has classes assigned
      const { data: classesData } = await useFetch('/api/teacher/classes')
      checklistItems.value[3].completed = Array.isArray(classesData.value) && classesData.value.length > 0
    }

    // Mark attendance tutorial as completed if they've taken attendance before
    const hasUsedAttendance = localStorage.getItem('teacher_attendance_used')
    checklistItems.value[4].completed = !!hasUsedAttendance

    // Emit complete event if all done
    if (allCompleted.value) {
      setTimeout(() => emit('complete'), 2000)
    }
  } catch (error) {
    console.error('Failed to check onboarding status:', error)
  }
}

function handleItemClick(item: ChecklistItem) {
  if (!item.completed && item.action) {
    item.action()
  }
}

function dismiss() {
  emit('complete')
}
</script>

<style scoped>
.onboarding-checklist {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.onboarding-checklist :deep(.p-card-title),
.onboarding-checklist :deep(.p-card-content) {
  color: white;
}

.onboarding-checklist :deep(.p-card-body) {
  padding: 1.5rem;
}

.checklist-item {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.2s;
}

.checklist-item.clickable {
  cursor: pointer;
}

.checklist-item.clickable:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(4px);
}

.checklist-item.completed {
  opacity: 0.7;
}

.checklist-checkbox {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.checklist-item.completed .checklist-checkbox {
  background: #fff;
  border-color: #fff;
}

.checklist-item.completed .checklist-checkbox i {
  color: #10b981;
}

.onboarding-checklist :deep(.p-progressbar) {
  background: rgba(255, 255, 255, 0.2);
}

.onboarding-checklist :deep(.p-progressbar-value) {
  background: white;
}
</style>
