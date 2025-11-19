<template>
  <Card>
    <template #content>
      <div>
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Seat Availability</h3>

        <div v-if="!seating || seating.totalSeats === 0" class="text-center py-8 text-gray-500">
          <i class="pi pi-th-large text-4xl mb-3"></i>
          <p>No seating data available</p>
        </div>

        <div v-else>
          <!-- Overall Progress -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-gray-900">Overall Capacity</span>
              <span class="text-sm text-gray-600">
                {{ seating.soldSeats }} / {{ seating.totalSeats }} seats
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                class="h-full transition-all duration-500"
                :class="getPercentageColor(seating.percentageSold)"
                :style="{ width: `${seating.percentageSold}%` }"
              ></div>
            </div>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-gray-600">
                {{ seating.availableSeats }} available
              </span>
              <span class="text-xs font-semibold text-gray-900">
                {{ seating.percentageSold }}% sold
              </span>
            </div>
          </div>

          <!-- By Show Breakdown -->
          <div v-if="seating.byShow && seating.byShow.length > 1" class="space-y-3">
            <h4 class="text-sm font-semibold text-gray-700">By Show</h4>
            <div
              v-for="show in seating.byShow"
              :key="show.show_id"
              class="p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-900">Show {{ getShowNumber(show.show_id) }}</span>
                <span class="text-xs text-gray-600">
                  {{ show.sold_seats }} / {{ show.total_seats }}
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  class="h-full bg-blue-600 transition-all duration-500"
                  :style="{ width: `${getShowPercentage(show)}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
interface ShowSeating {
  show_id: string
  total_seats: number
  sold_seats: number
  available_seats: number
}

interface Seating {
  totalSeats: number
  soldSeats: number
  availableSeats: number
  percentageSold: number
  byShow?: ShowSeating[]
}

interface Props {
  seating?: Seating
}

defineProps<Props>()

const getPercentageColor = (percentage: number) => {
  if (percentage >= 90) return 'bg-red-600'
  if (percentage >= 75) return 'bg-orange-500'
  if (percentage >= 50) return 'bg-blue-600'
  return 'bg-green-600'
}

const getShowPercentage = (show: ShowSeating) => {
  if (show.total_seats === 0) return 0
  return Math.round((show.sold_seats / show.total_seats) * 100)
}

const getShowNumber = (showId: string) => {
  // Simple show numbering - could be enhanced with actual show data
  return showId.substring(0, 8)
}
</script>

<style scoped>
/* Styles are inline with Tailwind classes */
</style>
