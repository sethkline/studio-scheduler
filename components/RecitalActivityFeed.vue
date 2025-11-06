<template>
  <Card>
    <template #content>
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-700">Recent Activity</h3>
          <Button
            icon="pi pi-refresh"
            severity="secondary"
            text
            rounded
            @click="loadActivity"
            :loading="loading"
          />
        </div>

        <!-- Loading State -->
        <div v-if="loading && !activities.length" class="text-center py-8">
          <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <!-- Empty State -->
        <div v-else-if="!activities.length" class="text-center py-8 text-gray-500">
          <i class="pi pi-inbox text-4xl mb-3"></i>
          <p>No recent activity</p>
        </div>

        <!-- Activity List -->
        <div v-else class="activity-feed">
          <div
            v-for="activity in activities"
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon" :class="getActivityIconClass(activity.severity)">
              <i :class="`pi pi-${activity.icon}`"></i>
            </div>
            <div class="activity-content">
              <p class="activity-title">{{ activity.title }}</p>
              <p class="activity-description">{{ activity.description }}</p>
              <p class="activity-meta">
                <span>{{ activity.user }}</span>
                <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Show More Button -->
        <div v-if="activities.length >= limit" class="mt-4 text-center">
          <Button
            label="View All Activity"
            severity="secondary"
            text
            @click="navigateTo(`/recitals/${recitalId}/activity`)"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
interface Activity {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  user: string
  icon: string
  severity: string
}

interface Props {
  recitalId: string
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 10
})

const loading = ref(false)
const activities = ref<Activity[]>([])

const loadActivity = async () => {
  loading.value = true

  try {
    const { data } = await useFetch(`/api/recitals/${props.recitalId}/activity-feed`, {
      params: { limit: props.limit }
    })

    if (data.value) {
      activities.value = data.value.activities || []
    }
  } catch (error) {
    console.error('Error loading activity:', error)
  } finally {
    loading.value = false
  }
}

const getActivityIconClass = (severity: string) => {
  switch (severity) {
    case 'success':
      return 'bg-green-100 text-green-700'
    case 'info':
      return 'bg-blue-100 text-blue-700'
    case 'warning':
      return 'bg-orange-100 text-orange-700'
    case 'error':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

onMounted(() => {
  loadActivity()
})
</script>

<style scoped>
.activity-feed {
  @apply space-y-4 max-h-96 overflow-y-auto pr-2;
}

.activity-item {
  @apply flex gap-3 pb-4 border-b border-gray-100 last:border-0;
}

.activity-icon {
  @apply w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0;
}

.activity-content {
  @apply flex-1 min-w-0;
}

.activity-title {
  @apply font-semibold text-gray-900 text-sm;
}

.activity-description {
  @apply text-sm text-gray-600 mt-1;
}

.activity-meta {
  @apply text-xs text-gray-500 mt-2 flex items-center gap-2;
}

.activity-time {
  @apply text-gray-400;
}

.activity-time::before {
  content: '•';
  @apply mx-1;
}
</style>
