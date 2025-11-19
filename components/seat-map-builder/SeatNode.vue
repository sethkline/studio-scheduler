<script setup lang="ts">
import type { SeatNode } from '~/types'

/**
 * SeatNode - Visual representation of an individual seat in the seat map builder
 */

interface Props {
  seat: SeatNode
  scale?: number
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  scale: 1,
  readonly: false
})

const emit = defineEmits<{
  click: [seat: SeatNode, event: MouseEvent]
  dragstart: [seat: SeatNode, event: DragEvent]
  dragend: [seat: SeatNode, event: DragEvent]
}>()

const store = useSeatMapBuilderStore()

// Seat colors based on type and price zone
const seatColor = computed(() => {
  // If seat has a price zone with color, use that
  if (props.seat.price_zone?.color) {
    return props.seat.price_zone.color
  }

  // Otherwise use default colors based on seat type
  switch (props.seat.seat_type) {
    case 'ada':
      return '#3B82F6' // Blue
    case 'house':
      return '#8B5CF6' // Purple
    case 'blocked':
      return '#6B7280' // Gray
    default:
      return '#10B981' // Green
  }
})

const seatStyle = computed(() => {
  const baseSize = 30
  const size = baseSize * props.scale

  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: seatColor.value,
    transform: `translate(${(props.seat.x_position || 0) * props.scale}px, ${(props.seat.y_position || 0) * props.scale}px)`,
    cursor: props.readonly ? 'default' : 'pointer',
    opacity: props.seat.isDragging ? 0.5 : 1
  }
})

const handleClick = (event: MouseEvent) => {
  if (!props.readonly) {
    emit('click', props.seat, event)
  }
}

const handleDragStart = (event: DragEvent) => {
  if (!props.readonly) {
    emit('dragstart', props.seat, event)
  }
}

const handleDragEnd = (event: DragEvent) => {
  if (!props.readonly) {
    emit('dragend', props.seat, event)
  }
}
</script>

<template>
  <div
    class="seat-node absolute rounded transition-all duration-150"
    :class="{
      'ring-2 ring-blue-500 ring-offset-1': seat.isSelected,
      'hover:ring-2 hover:ring-gray-400': !readonly && !seat.isSelected,
      'opacity-50': !seat.is_sellable
    }"
    :style="seatStyle"
    :draggable="!readonly"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <!-- Seat Label -->
    <div class="flex items-center justify-center h-full text-white text-xs font-semibold">
      {{ seat.seat_number }}
    </div>

    <!-- Seat Type Indicator -->
    <div
      v-if="seat.seat_type !== 'regular'"
      class="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white"
      :class="{
        'bg-blue-600': seat.seat_type === 'ada',
        'bg-purple-600': seat.seat_type === 'house',
        'bg-gray-600': seat.seat_type === 'blocked'
      }"
      :title="seat.seat_type.toUpperCase()"
    />
  </div>
</template>

<style scoped>
.seat-node {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
