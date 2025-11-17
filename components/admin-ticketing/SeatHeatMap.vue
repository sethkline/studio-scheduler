<script setup lang="ts">
import type { ShowSalesStats } from '~/types'

interface Props {
  showStats: ShowSalesStats[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Get color based on sold percentage
const getColorForPercentage = (percentage: number) => {
  if (percentage >= 90) return 'bg-green-600'
  if (percentage >= 75) return 'bg-green-500'
  if (percentage >= 50) return 'bg-yellow-500'
  if (percentage >= 25) return 'bg-orange-500'
  if (percentage > 0) return 'bg-red-500'
  return 'bg-gray-300'
}

// Get text color for better contrast
const getTextColorForPercentage = (percentage: number) => {
  if (percentage >= 25) return 'text-white'
  return 'text-gray-700'
}

// Sort shows by date
const sortedShows = computed(() => {
  return [...props.showStats].sort((a, b) => {
    return new Date(a.show_date).getTime() - new Date(b.show_date).getTime()
  })
})

// Format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Format time
const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}
</script>

<template>
  <Card class="h-full">
    <template #title>
      <h3 class="text-xl font-bold text-gray-900">Show Capacity Overview</h3>
    </template>
    <template #content>
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="animate-pulse">
          <div class="h-20 bg-gray-200 rounded-lg"></div>
        </div>
      </div>

      <div v-else-if="sortedShows.length === 0" class="flex justify-center items-center h-64 text-gray-500">
        <div class="text-center">
          <i class="pi pi-calendar text-4xl mb-2"></i>
          <p>No shows found</p>
        </div>
      </div>

      <div v-else class="space-y-3 max-h-[600px] overflow-y-auto">
        <div
          v-for="show in sortedShows"
          :key="show.show_id"
          class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <!-- Show info -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900 mb-1">{{ show.show_title }}</h4>
              <div class="flex items-center gap-4 text-sm text-gray-600">
                <span class="flex items-center gap-1">
                  <i class="pi pi-calendar text-xs"></i>
                  {{ formatDate(show.show_date) }}
                </span>
                <span class="flex items-center gap-1">
                  <i class="pi pi-clock text-xs"></i>
                  {{ formatTime(show.show_time) }}
                </span>
                <span class="flex items-center gap-1">
                  <i class="pi pi-map-marker text-xs"></i>
                  {{ show.venue_name }}
                </span>
              </div>
            </div>
            <div class="text-right">
              <div
                :class="[
                  'inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold',
                  getColorForPercentage(show.sold_percentage),
                  getTextColorForPercentage(show.sold_percentage)
                ]"
              >
                {{ show.sold_percentage }}% Sold
              </div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="mb-3">
            <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div class="flex h-full">
                <!-- Sold seats -->
                <div
                  v-if="show.sold_seats > 0"
                  :style="{ width: `${(show.sold_seats / show.total_seats) * 100}%` }"
                  class="bg-green-600"
                  :title="`${show.sold_seats} sold`"
                ></div>
                <!-- Reserved seats -->
                <div
                  v-if="show.reserved_seats > 0"
                  :style="{ width: `${(show.reserved_seats / show.total_seats) * 100}%` }"
                  class="bg-yellow-500"
                  :title="`${show.reserved_seats} reserved`"
                ></div>
                <!-- Available seats (remaining space) -->
              </div>
            </div>
          </div>

          <!-- Stats grid -->
          <div class="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div class="text-gray-600">Sold</div>
              <div class="font-semibold text-green-700">{{ show.sold_seats }}</div>
            </div>
            <div>
              <div class="text-gray-600">Reserved</div>
              <div class="font-semibold text-yellow-700">{{ show.reserved_seats }}</div>
            </div>
            <div>
              <div class="text-gray-600">Available</div>
              <div class="font-semibold text-blue-700">{{ show.available_seats }}</div>
            </div>
            <div>
              <div class="text-gray-600">Total</div>
              <div class="font-semibold text-gray-900">{{ show.total_seats }}</div>
            </div>
          </div>

          <!-- Revenue info -->
          <div class="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-sm">
            <div class="text-gray-600">Revenue:</div>
            <div class="font-semibold text-gray-900">
              {{
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(show.total_revenue_in_cents / 100)
              }}
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-4 pt-4 border-t border-gray-200">
        <div class="flex items-center justify-center gap-6 text-xs text-gray-600">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-green-600 rounded"></div>
            <span>Sold</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Reserved</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-gray-200 rounded"></div>
            <span>Available</span>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
