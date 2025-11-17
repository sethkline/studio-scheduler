<script setup lang="ts">
import type { BuilderTool } from '~/types'

/**
 * BuilderToolbar - Toolbar with tools for the seat map builder
 */

const emit = defineEmits<{
  addRow: []
  addSeat: []
  deleteSelected: []
  importCsv: []
}>()

const store = useSeatMapBuilderStore()
const toast = useToast()

const tools = [
  { id: 'select' as BuilderTool, label: 'Select', icon: 'pi pi-arrow-up-left', description: 'Select and move seats' },
  { id: 'add-seat' as BuilderTool, label: 'Add Seat', icon: 'pi pi-plus', description: 'Click to add individual seats' },
  { id: 'add-row' as BuilderTool, label: 'Add Row', icon: 'pi pi-bars', description: 'Add a row of seats' },
  { id: 'delete' as BuilderTool, label: 'Delete', icon: 'pi pi-trash', description: 'Delete selected seats' },
  { id: 'pan' as BuilderTool, label: 'Pan', icon: 'pi pi-arrows-alt', description: 'Pan the canvas' }
]

const selectTool = (tool: BuilderTool) => {
  store.setTool(tool)
}

const handleAddRow = () => {
  emit('addRow')
}

const handleAddSeat = () => {
  selectTool('add-seat')
  emit('addSeat')
}

const handleDeleteSelected = async () => {
  if (store.selectedSeats.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'No Selection',
      detail: 'Please select seats to delete',
      life: 3000
    })
    return
  }

  emit('deleteSelected')
}

const handleUndo = () => {
  store.undo()
}

const handleRedo = () => {
  store.redo()
}

const handleZoomIn = () => {
  store.zoomIn()
}

const handleZoomOut = () => {
  store.zoomOut()
}

const handleResetView = () => {
  store.resetViewport()
}

const togglePreview = () => {
  store.togglePreviewMode()
}

const zoomPercentage = computed(() => {
  return Math.round(store.viewport.scale * 100)
})
</script>

<template>
  <div class="builder-toolbar bg-white border-b border-gray-200 p-4">
    <div class="flex items-center justify-between gap-4">
      <!-- Left Side - Tools -->
      <div class="flex items-center gap-2">
        <!-- Tool Buttons -->
        <div class="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
          <Button
            v-for="tool in tools"
            :key="tool.id"
            :icon="tool.icon"
            :title="tool.description"
            text
            :severity="store.selectedTool === tool.id ? 'primary' : 'secondary'"
            :class="{
              'bg-blue-100': store.selectedTool === tool.id
            }"
            @click="selectTool(tool.id)"
          />
        </div>

        <!-- Separator -->
        <div class="w-px h-6 bg-gray-300" />

        <!-- Action Buttons -->
        <div class="flex items-center gap-1">
          <Button
            icon="pi pi-plus-circle"
            label="Add Row"
            text
            severity="secondary"
            @click="handleAddRow"
          />
          <Button
            icon="pi pi-upload"
            label="Import CSV"
            text
            severity="secondary"
            @click="emit('importCsv')"
          />
          <Button
            icon="pi pi-trash"
            label="Delete"
            text
            severity="danger"
            :disabled="store.selectedSeats.length === 0"
            @click="handleDeleteSelected"
          />
        </div>

        <!-- Separator -->
        <div class="w-px h-6 bg-gray-300" />

        <!-- Undo/Redo -->
        <div class="flex items-center gap-1">
          <Button
            icon="pi pi-undo"
            title="Undo"
            text
            severity="secondary"
            :disabled="!store.canUndo"
            @click="handleUndo"
          />
          <Button
            icon="pi pi-redo"
            title="Redo"
            text
            severity="secondary"
            :disabled="!store.canRedo"
            @click="handleRedo"
          />
        </div>
      </div>

      <!-- Right Side - Zoom & View Controls -->
      <div class="flex items-center gap-2">
        <!-- Selection Info -->
        <div v-if="store.selectedSeats.length > 0" class="text-sm text-gray-600">
          {{ store.selectedSeats.length }} seat(s) selected
        </div>

        <!-- Separator -->
        <div class="w-px h-6 bg-gray-300" />

        <!-- Zoom Controls -->
        <div class="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
          <Button
            icon="pi pi-minus"
            title="Zoom Out"
            text
            severity="secondary"
            size="small"
            :disabled="store.viewport.scale <= 0.1"
            @click="handleZoomOut"
          />
          <div class="px-2 text-sm font-medium text-gray-700 min-w-[3rem] text-center">
            {{ zoomPercentage }}%
          </div>
          <Button
            icon="pi pi-plus"
            title="Zoom In"
            text
            severity="secondary"
            size="small"
            :disabled="store.viewport.scale >= 3"
            @click="handleZoomIn"
          />
        </div>

        <Button
          icon="pi pi-refresh"
          title="Reset View"
          text
          severity="secondary"
          @click="handleResetView"
        />

        <!-- Separator -->
        <div class="w-px h-6 bg-gray-300" />

        <!-- Preview Toggle -->
        <Button
          :icon="store.previewMode ? 'pi pi-pencil' : 'pi pi-eye'"
          :label="store.previewMode ? 'Edit' : 'Preview'"
          text
          :severity="store.previewMode ? 'secondary' : 'primary'"
          @click="togglePreview"
        />
      </div>
    </div>

    <!-- Section & Price Zone Selectors (when adding seats) -->
    <div
      v-if="store.selectedTool === 'add-seat' || store.selectedTool === 'add-row'"
      class="mt-4 pt-4 border-t border-gray-200"
    >
      <div class="grid grid-cols-2 gap-4">
        <!-- Section Selector -->
        <div class="field">
          <label class="text-sm font-medium text-gray-700 mb-1 block">Section</label>
          <Dropdown
            v-model="store.selectedSectionId"
            :options="store.sections"
            option-label="name"
            option-value="id"
            placeholder="Select section"
            class="w-full"
          />
        </div>

        <!-- Price Zone Selector -->
        <div class="field">
          <label class="text-sm font-medium text-gray-700 mb-1 block">Price Zone</label>
          <Dropdown
            v-model="store.selectedPriceZoneId"
            :options="store.priceZones"
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
            <template #value="{ value }">
              <div v-if="value" class="flex items-center gap-2">
                <div
                  class="w-4 h-4 rounded border border-gray-300"
                  :style="{ backgroundColor: store.priceZoneById(value)?.color || '#10B981' }"
                />
                <span>{{ store.priceZoneById(value)?.name }}</span>
              </div>
              <span v-else class="text-gray-400">Select price zone</span>
            </template>
          </Dropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.builder-toolbar {
  user-select: none;
}
</style>
