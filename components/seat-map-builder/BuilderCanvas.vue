<script setup lang="ts">
import type { SeatNode } from '~/types'

/**
 * BuilderCanvas - Main canvas for displaying and interacting with the seat map
 */

const store = useSeatMapBuilderStore()
const canvasRef = ref<HTMLDivElement | null>(null)

// Pan state
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })

// Drag state
const draggingSeat = ref<SeatNode | null>(null)
const dragStart = ref({ x: 0, y: 0 })

// Canvas dimensions
const canvasSize = {
  width: 2000,
  height: 1500
}

// Group seats by section
const seatsBySection = computed(() => {
  const grouped = new Map<string, SeatNode[]>()

  store.sections.forEach(section => {
    grouped.set(section.id, store.seatsBySection(section.id))
  })

  return grouped
})

// Handle canvas click
const handleCanvasClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  // If clicking on canvas background (not a seat)
  if (target.classList.contains('canvas-background')) {
    if (store.selectedTool === 'add-seat') {
      addSeatAtPosition(event)
    } else if (store.selectedTool === 'select') {
      store.deselectAll()
    }
  }
}

// Add seat at clicked position
const addSeatAtPosition = async (event: MouseEvent) => {
  if (!store.selectedSectionId || !canvasRef.value) {
    return
  }

  const rect = canvasRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left - store.viewport.offsetX) / store.viewport.scale
  const y = (event.clientY - rect.top - store.viewport.offsetY) / store.viewport.scale

  const toast = useToast()

  try {
    // Find the next seat number for this section
    const sectionSeats = store.seatsBySection(store.selectedSectionId)
    const nextSeatNumber = sectionSeats.length + 1

    await store.createSeat({
      venue_id: store.venueId!,
      section_id: store.selectedSectionId,
      row_name: 'A', // Default row
      seat_number: String(nextSeatNumber),
      seat_type: 'regular',
      price_zone_id: store.selectedPriceZoneId,
      is_sellable: true,
      x_position: Math.round(x),
      y_position: Math.round(y)
    })

    toast.add({
      severity: 'success',
      summary: 'Seat Added',
      detail: 'Seat created successfully',
      life: 2000
    })
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to create seat',
      life: 3000
    })
  }
}

// Handle seat click
const handleSeatClick = (seat: SeatNode, event: MouseEvent) => {
  if (store.previewMode) return

  if (store.selectedTool === 'select') {
    const addToSelection = event.ctrlKey || event.metaKey
    store.selectSeat(seat.id, addToSelection)
  } else if (store.selectedTool === 'delete') {
    deleteSeat(seat)
  }
}

// Handle seat drag start
const handleSeatDragStart = (seat: SeatNode, event: DragEvent) => {
  if (store.previewMode || store.selectedTool !== 'select') {
    event.preventDefault()
    return
  }

  draggingSeat.value = seat
  dragStart.value = {
    x: event.clientX,
    y: event.clientY
  }

  // Set drag image to be invisible
  const img = new Image()
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  event.dataTransfer?.setDragImage(img, 0, 0)

  // Mark seat as dragging
  const seatIndex = store.seats.findIndex(s => s.id === seat.id)
  if (seatIndex !== -1) {
    store.seats[seatIndex].isDragging = true
  }
}

// Handle seat drag end
const handleSeatDragEnd = async (seat: SeatNode, event: DragEvent) => {
  if (!draggingSeat.value || !canvasRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()

  // Calculate new position
  const deltaX = (event.clientX - dragStart.value.x) / store.viewport.scale
  const deltaY = (event.clientY - dragStart.value.y) / store.viewport.scale

  const newX = (seat.x_position || 0) + deltaX
  const newY = (seat.y_position || 0) + deltaY

  // Update seat position
  try {
    await store.updateSeat(seat.id, {
      x_position: Math.round(newX),
      y_position: Math.round(newY)
    })
  } catch (error) {
    console.error('Failed to update seat position:', error)
  }

  // Clear drag state
  const seatIndex = store.seats.findIndex(s => s.id === seat.id)
  if (seatIndex !== -1) {
    store.seats[seatIndex].isDragging = false
  }
  draggingSeat.value = null
}

// Delete seat
const deleteSeat = async (seat: SeatNode) => {
  const toast = useToast()

  try {
    await store.deleteSeat(seat.id)
    toast.add({
      severity: 'success',
      summary: 'Seat Deleted',
      detail: `Seat ${seat.row_name}${seat.seat_number} deleted`,
      life: 2000
    })
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete seat',
      life: 3000
    })
  }
}

// Handle mouse down for panning
const handleMouseDown = (event: MouseEvent) => {
  if (store.selectedTool === 'pan' || event.button === 1) { // Middle mouse button
    isPanning.value = true
    panStart.value = {
      x: event.clientX - store.viewport.offsetX,
      y: event.clientY - store.viewport.offsetY
    }
    event.preventDefault()
  }
}

// Handle mouse move for panning
const handleMouseMove = (event: MouseEvent) => {
  if (isPanning.value) {
    store.setViewport({
      offsetX: event.clientX - panStart.value.x,
      offsetY: event.clientY - panStart.value.y
    })
  }
}

// Handle mouse up
const handleMouseUp = () => {
  isPanning.value = false
}

// Handle wheel for zooming
const handleWheel = (event: WheelEvent) => {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()

    const delta = event.deltaY > 0 ? -0.1 : 0.1
    const newScale = Math.max(0.1, Math.min(3, store.viewport.scale + delta))

    store.setViewport({ scale: newScale })
  }
}

// Canvas style
const canvasStyle = computed(() => {
  return {
    transform: `translate(${store.viewport.offsetX}px, ${store.viewport.offsetY}px) scale(${store.viewport.scale})`,
    transformOrigin: '0 0',
    cursor: isPanning.value ? 'grabbing' : store.selectedTool === 'pan' ? 'grab' : 'default'
  }
})
</script>

<template>
  <div
    ref="canvasRef"
    class="builder-canvas relative overflow-hidden bg-gray-100"
    :class="{
      'cursor-crosshair': store.selectedTool === 'add-seat',
      'cursor-grab': store.selectedTool === 'pan' && !isPanning,
      'cursor-grabbing': isPanning
    }"
    @click="handleCanvasClick"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @wheel="handleWheel"
  >
    <!-- Grid Background -->
    <div class="absolute inset-0 canvas-background" :style="canvasStyle">
      <svg
        :width="canvasSize.width"
        :height="canvasSize.height"
        class="canvas-background"
      >
        <!-- Grid Lines -->
        <defs>
          <pattern
            id="grid"
            :width="50"
            :height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#e5e7eb"
              stroke-width="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="white" />
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- Stage/Screen Indicator -->
        <rect
          x="850"
          y="50"
          width="300"
          height="40"
          fill="#3B82F6"
          opacity="0.2"
          stroke="#3B82F6"
          stroke-width="2"
        />
        <text
          x="1000"
          y="75"
          text-anchor="middle"
          class="fill-blue-600 text-sm font-semibold"
        >
          STAGE
        </text>
      </svg>

      <!-- Sections and Seats -->
      <div class="relative canvas-background" :style="{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }">
        <SectionNode
          v-for="section in store.sections"
          :key="section.id"
          :section="section"
          :seats="seatsBySection.get(section.id) || []"
          :scale="store.viewport.scale"
          :readonly="store.previewMode"
          @seat-click="handleSeatClick"
          @seat-drag-start="handleSeatDragStart"
          @seat-drag-end="handleSeatDragEnd"
        />
      </div>
    </div>

    <!-- Loading Overlay -->
    <div
      v-if="store.loading"
      class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center"
    >
      <ProgressSpinner />
    </div>

    <!-- Empty State -->
    <div
      v-if="!store.loading && store.seats.length === 0"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div class="text-center text-gray-500">
        <i class="pi pi-th text-4xl mb-4" />
        <p class="text-lg font-medium">No seats yet</p>
        <p class="text-sm mt-1">Click "Add Seat" or "Add Row" to get started</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.builder-canvas {
  width: 100%;
  height: 600px;
  position: relative;
}

.canvas-background {
  pointer-events: auto;
}
</style>
