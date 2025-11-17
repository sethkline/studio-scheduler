<script setup lang="ts">
import type { VenueSection, SeatNode } from '~/types'

/**
 * SectionNode - Visual container for a section in the seat map builder
 */

interface Props {
  section: VenueSection
  seats: SeatNode[]
  scale?: number
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  scale: 1,
  readonly: false
})

const emit = defineEmits<{
  seatClick: [seat: SeatNode, event: MouseEvent]
  seatDragStart: [seat: SeatNode, event: DragEvent]
  seatDragEnd: [seat: SeatNode, event: DragEvent]
}>()

// Calculate section bounds based on seats
const sectionBounds = computed(() => {
  if (props.seats.length === 0) {
    return { x: 0, y: 0, width: 200, height: 100 }
  }

  const xPositions = props.seats.map(s => s.x_position || 0)
  const yPositions = props.seats.map(s => s.y_position || 0)

  const minX = Math.min(...xPositions)
  const maxX = Math.max(...xPositions)
  const minY = Math.min(...yPositions)
  const maxY = Math.max(...yPositions)

  const padding = 20

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2 + 30, // 30 is seat width
    height: maxY - minY + padding * 2 + 30 // 30 is seat height
  }
})

const sectionStyle = computed(() => {
  const bounds = sectionBounds.value
  return {
    left: `${bounds.x * props.scale}px`,
    top: `${bounds.y * props.scale}px`,
    width: `${bounds.width * props.scale}px`,
    height: `${bounds.height * props.scale}px`
  }
})

const handleSeatClick = (seat: SeatNode, event: MouseEvent) => {
  emit('seatClick', seat, event)
}

const handleSeatDragStart = (seat: SeatNode, event: DragEvent) => {
  emit('seatDragStart', seat, event)
}

const handleSeatDragEnd = (seat: SeatNode, event: DragEvent) => {
  emit('seatDragEnd', seat, event)
}
</script>

<template>
  <div
    class="section-node absolute border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 bg-opacity-30"
    :style="sectionStyle"
  >
    <!-- Section Label -->
    <div
      class="absolute -top-6 left-0 bg-white px-2 py-1 rounded text-sm font-semibold text-gray-700 shadow-sm"
    >
      {{ section.name }}
    </div>

    <!-- Seat Count Badge -->
    <div
      class="absolute -top-6 right-0 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium"
    >
      {{ seats.length }} seats
    </div>

    <!-- Seats Container (relative positioning for seats) -->
    <div class="relative w-full h-full">
      <SeatNode
        v-for="seat in seats"
        :key="seat.id"
        :seat="seat"
        :scale="scale"
        :readonly="readonly"
        @click="handleSeatClick"
        @dragstart="handleSeatDragStart"
        @dragend="handleSeatDragEnd"
      />
    </div>
  </div>
</template>

<style scoped>
.section-node {
  pointer-events: none;
}

.section-node > * {
  pointer-events: auto;
}
</style>
