<script setup lang="ts">
/**
 * SeatHeatMap Component
 * Displays seat sales data by section and row in a heat map visualization
 */

interface SeatHeatMapData {
  section: string
  row: string
  total_seats: number
  sold_seats: number
  reserved_seats: number
  available_seats: number
}

interface Props {
  seatHeatMap: SeatHeatMapData[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

/**
 * Group heat map data by section
 */
const groupedBySection = computed(() => {
  const grouped = new Map<string, SeatHeatMapData[]>()

  props.seatHeatMap.forEach((data) => {
    if (!grouped.has(data.section)) {
      grouped.set(data.section, [])
    }
    grouped.get(data.section)!.push(data)
  })

  // Sort sections alphabetically
  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([section, rows]) => ({
      section,
      rows: rows.sort((a, b) => a.row.localeCompare(b.row))
    }))
})

/**
 * Calculate sold percentage for color intensity
 */
const getSoldPercentage = (data: SeatHeatMapData): number => {
  if (data.total_seats === 0) return 0
  return Math.round((data.sold_seats / data.total_seats) * 100)
}

/**
 * Get background color based on sold percentage
 */
const getHeatColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-600 text-white'
  if (percentage >= 70) return 'bg-orange-500 text-white'
  if (percentage >= 50) return 'bg-yellow-500 text-gray-900'
  if (percentage >= 30) return 'bg-green-400 text-gray-900'
  if (percentage > 0) return 'bg-green-200 text-gray-900'
  return 'bg-gray-100 text-gray-600'
}

/**
 * Get status label for the cell
 */
const getStatusLabel = (data: SeatHeatMapData): string => {
  return `${data.sold_seats}/${data.total_seats}`
}
</script>

<template>
  <Card class="border border-gray-200">
    <template #header>
      <div class="p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Seat Sales Heat Map</h3>
        <p class="text-sm text-gray-600 mt-1">Sales distribution by section and row</p>
      </div>
    </template>

    <template #content>
      <div v-if="loading" class="space-y-2 p-4">
        <Skeleton height="200px" />
      </div>

      <div v-else-if="seatHeatMap.length === 0" class="text-center py-12">
        <i class="pi pi-th-large text-4xl text-gray-400 mb-4" />
        <p class="text-gray-600">No seat data available</p>
      </div>

      <div v-else class="p-4">
        <!-- Legend -->
        <div class="flex items-center gap-4 mb-4 text-sm">
          <span class="font-semibold text-gray-700">Sold %:</span>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-gray-100 border border-gray-300 rounded" />
            <span class="text-gray-600">0%</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-green-200 border border-gray-300 rounded" />
            <span class="text-gray-600">1-30%</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-green-400 border border-gray-300 rounded" />
            <span class="text-gray-600">30-50%</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-yellow-500 border border-gray-300 rounded" />
            <span class="text-gray-600">50-70%</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-orange-500 border border-gray-300 rounded" />
            <span class="text-gray-600">70-90%</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-red-600 border border-gray-300 rounded" />
            <span class="text-gray-600">90%+</span>
          </div>
        </div>

        <!-- Heat Map Grid -->
        <div class="space-y-6">
          <div
            v-for="sectionGroup in groupedBySection"
            :key="sectionGroup.section"
            class="border border-gray-200 rounded-lg p-4"
          >
            <h4 class="text-md font-semibold text-gray-800 mb-3">
              {{ sectionGroup.section }}
            </h4>

            <div class="grid grid-cols-auto-fill gap-2">
              <div
                v-for="rowData in sectionGroup.rows"
                :key="rowData.row"
                class="relative group"
              >
                <div
                  :class="[
                    'flex items-center justify-center h-12 w-20 rounded border border-gray-300 transition-all hover:scale-110 cursor-pointer',
                    getHeatColor(getSoldPercentage(rowData))
                  ]"
                >
                  <div class="text-center">
                    <div class="text-xs font-semibold">Row {{ rowData.row }}</div>
                    <div class="text-xs">{{ getStatusLabel(rowData) }}</div>
                  </div>
                </div>

                <!-- Tooltip on hover -->
                <div
                  class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap"
                >
                  <div class="font-semibold mb-1">
                    {{ sectionGroup.section }} - Row {{ rowData.row }}
                  </div>
                  <div>Total: {{ rowData.total_seats }}</div>
                  <div>Sold: {{ rowData.sold_seats }}</div>
                  <div>Reserved: {{ rowData.reserved_seats }}</div>
                  <div>Available: {{ rowData.available_seats }}</div>
                  <div class="mt-1 font-semibold">
                    {{ getSoldPercentage(rowData) }}% Sold
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.grid-cols-auto-fill {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr));
}
</style>
