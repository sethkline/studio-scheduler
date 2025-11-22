<template>
  <Card class="onboarding-checklist">
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi pi-list-check text-primary text-xl"></i>
          <span>Getting Started</span>
        </div>
        <Button
          icon="pi pi-times"
          class="p-button-text p-button-rounded p-button-sm"
          @click="dismiss"
          v-tooltip.left="'Dismiss checklist'"
        />
      </div>
    </template>
    <template #content>
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-600">{{ completedCount }} of {{ checklistItems.length}} completed</span>
          <span class="text-sm font-semibold text-primary">{{ progressPercent }}%</span>
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
              <div class="font-medium text-gray-900" :class="{ 'line-through text-gray-500': item.completed }">
                {{ item.title }}
              </div>
              <div class="text-sm text-gray-600 mt-0.5">{{ item.description }}</div>
            </div>
            <Button
              v-if="!item.completed && item.action"
              icon="pi pi-arrow-right"
              class="p-button-text p-button-rounded p-button-sm"
              @click.stop="item.action"
            />
          </div>
        </div>
      </div>

      <div v-if="allCompleted" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center gap-2 text-green-800">
          <i class="pi pi-check-circle text-xl"></i>
          <div>
            <div class="font-semibold">Congratulations!</div>
            <div class="text-sm">You've completed the initial setup. You're ready to start managing your studio!</div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStudioStore } from '@/stores/studio'

const emit = defineEmits(['complete'])

const studioStore = useStudioStore()

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
    title: 'Complete Studio Profile',
    description: 'Add your studio name, contact info, and logo',
    completed: false,
    action: () => navigateTo('/admin/studio/profile')
  },
  {
    id: 'location',
    title: 'Add Your First Location',
    description: 'Set up your studio location and rooms',
    completed: false,
    action: () => navigateTo('/admin/studio/locations')
  },
  {
    id: 'styles',
    title: 'Configure Dance Styles',
    description: 'Define the types of dance you teach',
    completed: false,
    action: () => navigateTo('/admin/classes/styles')
  },
  {
    id: 'levels',
    title: 'Set Up Class Levels',
    description: 'Create beginner, intermediate, advanced levels',
    completed: false,
    action: () => navigateTo('/admin/classes/levels')
  },
  {
    id: 'class',
    title: 'Create Your First Class',
    description: 'Add a class definition to get started',
    completed: false,
    action: () => navigateTo('/admin/classes/new')
  },
  {
    id: 'teacher',
    title: 'Add Teachers',
    description: 'Invite your teaching staff',
    completed: false,
    action: () => navigateTo('/admin/teachers')
  },
  {
    id: 'schedule',
    title: 'Build Your Schedule',
    description: 'Create a schedule and assign classes',
    completed: false,
    action: () => navigateTo('/admin/schedules')
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
    // Check which items are completed by querying the database
    const [profileRes, locationsRes, stylesRes, levelsRes, classesRes, teachersRes, schedulesRes] = await Promise.all([
      $fetch('/api/studio-profile').catch(() => null),
      $fetch('/api/studio-locations').catch(() => []),
      $fetch('/api/dance-styles').catch(() => []),
      $fetch('/api/class-levels').catch(() => []),
      $fetch('/api/class-definitions/count').catch(() => ({ count: 0 })),
      $fetch('/api/teachers/count').catch(() => ({ count: 0 })),
      $fetch('/api/schedules/count').catch(() => ({ count: 0 }))
    ])

    // Update completion status
    checklistItems.value[0].completed = !!profileRes && !!profileRes.name
    checklistItems.value[1].completed = Array.isArray(locationsRes) && locationsRes.length > 0
    checklistItems.value[2].completed = Array.isArray(stylesRes) && stylesRes.length > 0
    checklistItems.value[3].completed = Array.isArray(levelsRes) && levelsRes.length > 0
    checklistItems.value[4].completed = classesRes?.count > 0
    checklistItems.value[5].completed = teachersRes?.count > 0
    checklistItems.value[6].completed = schedulesRes?.count > 0

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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  background: #10b981;
  border-color: #10b981;
}

.onboarding-checklist :deep(.p-progressbar) {
  background: rgba(255, 255, 255, 0.2);
}

.onboarding-checklist :deep(.p-progressbar-value) {
  background: white;
}
</style>
