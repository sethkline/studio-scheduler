<script setup lang="ts">
/**
 * UpcomingShows Component
 * Displays upcoming shows with ticket availability
 */

interface UpcomingShow {
  id: string
  title: string
  show_date: string
  show_time: string | null
  venue_name: string | null
  capacity: number
  sold: number
  available: number
  sold_percentage: number
}

interface Props {
  upcomingShows: UpcomingShow[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const router = useRouter()

/**
 * Format show date and time
 */
const formatShowDateTime = (dateString: string, timeString: string | null): string => {
  const date = new Date(dateString)
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  if (timeString) {
    return `${dateStr} at ${timeString}`
  }

  return dateStr
}

/**
 * Get progress bar color based on sold percentage
 */
const getProgressColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-500'
  if (percentage >= 70) return 'bg-orange-500'
  if (percentage >= 50) return 'bg-yellow-500'
  return 'bg-green-500'
}

/**
 * Get availability status
 */
const getAvailabilityStatus = (show: UpcomingShow): {
  label: string
  severity: string
} => {
  if (show.available === 0) {
    return { label: 'Sold Out', severity: 'danger' }
  }
  if (show.sold_percentage >= 90) {
    return { label: 'Almost Full', severity: 'warning' }
  }
  if (show.sold_percentage >= 50) {
    return { label: 'Filling Up', severity: 'info' }
  }
  return { label: 'Available', severity: 'success' }
}
</script>

<template>
  <Card class="border border-gray-200">
    <template #header>
      <div class="p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Upcoming Shows</h3>
        <p class="text-sm text-gray-600 mt-1">Shows with ticket availability</p>
      </div>
    </template>

    <template #content>
      <div v-if="loading" class="p-4 space-y-4">
        <Skeleton height="4rem" class="mb-2" />
        <Skeleton height="4rem" class="mb-2" />
        <Skeleton height="4rem" class="mb-2" />
      </div>

      <div v-else-if="upcomingShows.length === 0" class="text-center py-12">
        <i class="pi pi-calendar text-4xl text-gray-400 mb-4" />
        <p class="text-gray-600">No upcoming shows scheduled</p>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="show in upcomingShows"
          :key="show.id"
          class="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
          @click="router.push(`/admin/ticketing/shows/${show.id}`)"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900 mb-1">{{ show.title }}</h4>
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <i class="pi pi-calendar text-xs" />
                <span>{{ formatShowDateTime(show.show_date, show.show_time) }}</span>
              </div>
              <div
                v-if="show.venue_name"
                class="flex items-center gap-2 text-sm text-gray-600 mt-1"
              >
                <i class="pi pi-map-marker text-xs" />
                <span>{{ show.venue_name }}</span>
              </div>
            </div>
            <Tag
              :value="getAvailabilityStatus(show).label"
              :severity="getAvailabilityStatus(show).severity"
            />
          </div>

          <!-- Progress Bar -->
          <div class="mb-2">
            <div class="flex items-center justify-between text-sm mb-1">
              <span class="text-gray-600">
                {{ show.sold }} / {{ show.capacity }} sold
              </span>
              <span class="font-semibold text-gray-900">{{
                show.sold_percentage
              }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                :class="['h-full transition-all duration-300', getProgressColor(show.sold_percentage)]"
                :style="{ width: `${show.sold_percentage}%` }"
              />
            </div>
          </div>

          <!-- Availability Stats -->
          <div class="flex items-center gap-4 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-green-500 rounded-full" />
              <span class="text-gray-600">{{ show.available }} available</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full" />
              <span class="text-gray-600">{{ show.sold }} sold</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
