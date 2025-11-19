<script setup lang="ts">
import type { RowTemplate } from '~/types'

/**
 * SeatMapBuilder - Main seat map builder component
 */

interface Props {
  venueId: string
}

const props = defineProps<Props>()

const store = useSeatMapBuilderStore()
const toast = useToast()

// Add Row Dialog
const addRowDialogVisible = ref(false)
const rowFormData = ref<RowTemplate>({
  row_name: 'A',
  section_id: '',
  seat_count: 10,
  start_number: 1,
  y_position: 300,
  x_start: 400,
  seat_spacing: 40,
  price_zone_id: null,
  seat_type: 'regular'
})

// Delete Confirmation Dialog
const deleteConfirmVisible = ref(false)

// CSV Import Dialog
const importCsvDialogVisible = ref(false)

// Load seat map on mount
onMounted(async () => {
  try {
    await store.loadSeatMap(props.venueId)
  } catch (error) {
    console.error('Failed to load seat map:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load seat map',
      life: 3000
    })
  }
})

// Cleanup on unmount
onUnmounted(() => {
  store.reset()
})

// Show add row dialog
const showAddRowDialog = () => {
  // Pre-fill with current selections
  if (store.selectedSectionId) {
    rowFormData.value.section_id = store.selectedSectionId
  }
  if (store.selectedPriceZoneId) {
    rowFormData.value.price_zone_id = store.selectedPriceZoneId
  }

  addRowDialogVisible.value = true
}

// Handle add row
const handleAddRow = async () => {
  if (!rowFormData.value.section_id) {
    toast.add({
      severity: 'warn',
      summary: 'Validation Error',
      detail: 'Please select a section',
      life: 3000
    })
    return
  }

  try {
    // Generate seats for the row
    const seats = []
    for (let i = 0; i < rowFormData.value.seat_count; i++) {
      seats.push({
        venue_id: props.venueId,
        section_id: rowFormData.value.section_id,
        row_name: rowFormData.value.row_name,
        seat_number: String(rowFormData.value.start_number + i),
        seat_type: rowFormData.value.seat_type,
        price_zone_id: rowFormData.value.price_zone_id,
        is_sellable: true,
        x_position: rowFormData.value.x_start + (i * rowFormData.value.seat_spacing),
        y_position: rowFormData.value.y_position
      })
    }

    await store.bulkCreateSeats(seats)

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Created ${rowFormData.value.seat_count} seats in row ${rowFormData.value.row_name}`,
      life: 3000
    })

    addRowDialogVisible.value = false

    // Increment row letter for next time
    rowFormData.value.row_name = String.fromCharCode(rowFormData.value.row_name.charCodeAt(0) + 1)
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to create row',
      life: 3000
    })
  }
}

// Show delete confirmation
const showDeleteConfirmation = () => {
  deleteConfirmVisible.value = true
}

// Handle delete selected
const handleDeleteSelected = async () => {
  try {
    await store.deleteSelectedSeats()
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Seats deleted successfully',
      life: 3000
    })
    deleteConfirmVisible.value = false
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete seats',
      life: 3000
    })
  }
}

// Show CSV import dialog
const showImportCsvDialog = () => {
  importCsvDialogVisible.value = true
}

// Handle import complete
const handleImportComplete = async () => {
  // Reload seat map to show newly imported seats
  await store.loadSeatMap(props.venueId)
  importCsvDialogVisible.value = false
}

// Seat type options
const seatTypeOptions = [
  { label: 'Regular', value: 'regular' },
  { label: 'ADA (Accessible)', value: 'ada' },
  { label: 'House (Complimentary)', value: 'house' },
  { label: 'Blocked (Not for sale)', value: 'blocked' }
]
</script>

<template>
  <div class="seat-map-builder">
    <!-- Toolbar -->
    <BuilderToolbar
      @add-row="showAddRowDialog"
      @delete-selected="showDeleteConfirmation"
      @import-csv="showImportCsvDialog"
    />

    <!-- Main Content -->
    <div class="flex gap-4 p-4">
      <!-- Canvas (Main Area) -->
      <div class="flex-1">
        <BuilderCanvas />
      </div>

      <!-- Right Sidebar - Price Zones -->
      <div class="w-80">
        <PriceZonePanel />
      </div>
    </div>

    <!-- Add Row Dialog -->
    <Dialog
      v-model:visible="addRowDialogVisible"
      header="Add Row of Seats"
      :modal="true"
      class="w-full max-w-2xl"
    >
      <div class="space-y-4">
        <!-- Row Name -->
        <div class="field">
          <label for="row-name" class="font-medium text-sm mb-2 block">
            Row Name <span class="text-red-500">*</span>
          </label>
          <InputText
            id="row-name"
            v-model="rowFormData.row_name"
            class="w-full"
            placeholder="e.g., A, B, C"
          />
        </div>

        <!-- Section -->
        <div class="field">
          <label for="section" class="font-medium text-sm mb-2 block">
            Section <span class="text-red-500">*</span>
          </label>
          <Dropdown
            id="section"
            v-model="rowFormData.section_id"
            :options="store.sections"
            option-label="name"
            option-value="id"
            placeholder="Select section"
            class="w-full"
          />
        </div>

        <!-- Seat Count and Start Number -->
        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label for="seat-count" class="font-medium text-sm mb-2 block">
              Number of Seats
            </label>
            <InputNumber
              id="seat-count"
              v-model="rowFormData.seat_count"
              class="w-full"
              :min="1"
              :max="50"
            />
          </div>

          <div class="field">
            <label for="start-number" class="font-medium text-sm mb-2 block">
              Start Number
            </label>
            <InputNumber
              id="start-number"
              v-model="rowFormData.start_number"
              class="w-full"
              :min="1"
            />
          </div>
        </div>

        <!-- Position -->
        <div class="grid grid-cols-3 gap-4">
          <div class="field">
            <label for="x-start" class="font-medium text-sm mb-2 block">
              X Position
            </label>
            <InputNumber
              id="x-start"
              v-model="rowFormData.x_start"
              class="w-full"
            />
          </div>

          <div class="field">
            <label for="y-position" class="font-medium text-sm mb-2 block">
              Y Position
            </label>
            <InputNumber
              id="y-position"
              v-model="rowFormData.y_position"
              class="w-full"
            />
          </div>

          <div class="field">
            <label for="seat-spacing" class="font-medium text-sm mb-2 block">
              Spacing
            </label>
            <InputNumber
              id="seat-spacing"
              v-model="rowFormData.seat_spacing"
              class="w-full"
              :min="20"
              :max="100"
            />
          </div>
        </div>

        <!-- Price Zone -->
        <div class="field">
          <label for="price-zone" class="font-medium text-sm mb-2 block">
            Price Zone
          </label>
          <Dropdown
            id="price-zone"
            v-model="rowFormData.price_zone_id"
            :options="store.priceZones"
            option-label="name"
            option-value="id"
            placeholder="Select price zone"
            class="w-full"
          >
            <template #option="{ option }">
              <div class="flex items-center gap-2">
                <div
                  class="w-4 h-4 rounded border border-gray-300"
                  :style="{ backgroundColor: option.color || '#10B981' }"
                />
                <span>{{ option.name }}</span>
                <span class="text-gray-500 text-sm ml-auto">
                  ${{ (option.price_in_cents / 100).toFixed(2) }}
                </span>
              </div>
            </template>
          </Dropdown>
        </div>

        <!-- Seat Type -->
        <div class="field">
          <label for="seat-type" class="font-medium text-sm mb-2 block">
            Seat Type
          </label>
          <Dropdown
            id="seat-type"
            v-model="rowFormData.seat_type"
            :options="seatTypeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button
            label="Cancel"
            severity="secondary"
            @click="addRowDialogVisible = false"
          />
          <Button
            label="Create Row"
            icon="pi pi-plus"
            :loading="store.saving"
            @click="handleAddRow"
          />
        </div>
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="deleteConfirmVisible"
      header="Delete Selected Seats"
      :modal="true"
    >
      <p class="mb-4">
        Are you sure you want to delete {{ store.selectedSeats.length }} seat(s)?
        This action cannot be undone.
      </p>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button
            label="Cancel"
            severity="secondary"
            @click="deleteConfirmVisible = false"
          />
          <Button
            label="Delete"
            severity="danger"
            icon="pi pi-trash"
            :loading="store.saving"
            @click="handleDeleteSelected"
          />
        </div>
      </template>
    </Dialog>

    <!-- CSV Import Dialog -->
    <Dialog
      v-model:visible="importCsvDialogVisible"
      header="Import Seats from CSV"
      :modal="true"
      class="w-full max-w-4xl"
    >
      <ImportCSV
        :venue-id="venueId"
        :sections="store.sections"
        :price-zones="store.priceZones"
        @import-complete="handleImportComplete"
        @cancel="importCsvDialogVisible = false"
      />
    </Dialog>
  </div>
</template>

<style scoped>
.seat-map-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
