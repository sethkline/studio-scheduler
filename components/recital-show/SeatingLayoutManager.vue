<template>
  <div class="card">
    <h2 class="text-xl font-bold text-primary-800 mb-2">Seating Layout</h2>
    <p class="text-gray-600 mb-6">Configure the seating layout for this show.</p>

    <div v-if="!hasSeats" class="mb-6">
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <i class="pi pi-info-circle text-blue-500"></i>
          </div>
          <div class="ml-3">
            <p class="text-sm text-blue-800">
              No seating has been set up for this show yet. Generate seats using your theater's standard layout.
            </p>
          </div>
        </div>
      </div>

      <div class="mb-6">
        <Button 
          label="Generate Seats" 
          icon="pi pi-plus"
          @click="$emit('generate-seats')"
          :disabled="generatingSeats"
          :loading="generatingSeats"
          class="mt-3"
        />
      </div>
    </div>

    <div v-else class="space-y-4">
      <!-- Seat Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-green-50 p-4 rounded-lg">
          <div class="text-lg font-bold text-green-700">{{ seatStats.total }}</div>
          <div class="text-sm text-green-600">Total Seats</div>
        </div>
        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="text-lg font-bold text-blue-700">{{ seatStats.available }}</div>
          <div class="text-sm text-blue-600">Available Seats</div>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg">
          <div class="text-lg font-bold text-orange-700">{{ seatStats.sold }}</div>
          <div class="text-sm text-orange-600">Sold Seats</div>
        </div>
      </div>

      <!-- Section Stats -->
      <h3 class="text-lg font-semibold mb-3">Section Statistics</h3>
      <DataTable :value="sectionStats" stripedRows class="mb-4">
        <Column field="name" header="Section" />
        <Column field="total" header="Total Seats" />
        <Column field="available" header="Available" />
        <Column field="sold" header="Sold" />
        <Column header="Availability">
          <template #body="{ data }">
            <ProgressBar :value="calculateAvailabilityPercentage(data)" class="h-2" />
            <span class="text-xs">
              {{ data.available }} of {{ data.total }} available ({{ calculateAvailabilityPercentage(data) }}%)
            </span>
          </template>
        </Column>
      </DataTable>

      <!-- Actions -->
      <div class="flex justify-between items-center">
        <Button
          label="Regenerate Seats"
          icon="pi pi-refresh"
          class="p-button-outlined"
          @click="$emit('regenerate-seats')"
        />
        
        <div>
          <Button
            label="View Seating Chart" 
            icon="pi pi-eye"
            class="p-button-outlined p-button-success mr-2"
            @click="$emit('view-chart')"
          />
          <Button
            label="Download Seat Map" 
            icon="pi pi-download"
            class="p-button-outlined"
            @click="$emit('download-map')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  showId: {
    type: String,
    required: true
  },
  hasSeats: {
    type: Boolean,
    default: false
  },
  seatStats: {
    type: Object,
    default: () => ({ total: 0, available: 0, sold: 0 })
  },
  sectionStats: {
    type: Array,
    default: () => []
  },
  selectedLayout: {
    type: String,
    default: null
  },
  layoutOptions: {
    type: Array,
    default: () => []
  },
  generatingSeats: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'select-layout', 
  'generate-seats', 
  'regenerate-seats',
  'view-chart',
  'download-map'
]);

function calculateAvailabilityPercentage(sectionData) {
  if (!sectionData.total) return 0;
  return Math.round((sectionData.available / sectionData.total) * 100);
}
</script>