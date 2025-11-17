<script setup lang="ts">
/**
 * Color picker component for price zones
 * Displays a palette of preset colors for seat map visualization
 */

interface Props {
  modelValue?: string | null
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
})

const emit = defineEmits<Emits>()

// Predefined color palette for price zones
const colorPalette = [
  { name: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
  { name: 'Green', value: '#10B981', class: 'bg-green-500' },
  { name: 'Yellow', value: '#F59E0B', class: 'bg-yellow-500' },
  { name: 'Red', value: '#EF4444', class: 'bg-red-500' },
  { name: 'Purple', value: '#8B5CF6', class: 'bg-purple-500' },
  { name: 'Pink', value: '#EC4899', class: 'bg-pink-500' },
  { name: 'Indigo', value: '#6366F1', class: 'bg-indigo-500' },
  { name: 'Teal', value: '#14B8A6', class: 'bg-teal-500' },
  { name: 'Orange', value: '#F97316', class: 'bg-orange-500' },
  { name: 'Cyan', value: '#06B6D4', class: 'bg-cyan-500' },
  { name: 'Lime', value: '#84CC16', class: 'bg-lime-500' },
  { name: 'Amber', value: '#F59E0B', class: 'bg-amber-500' }
]

const selectedColor = computed({
  get: () => props.modelValue,
  set: (value: string | null) => {
    if (value) {
      emit('update:modelValue', value)
    }
  }
})

const selectColor = (color: string) => {
  emit('update:modelValue', color)
}
</script>

<template>
  <div class="price-zone-color-picker">
    <div class="grid grid-cols-6 gap-2">
      <button
        v-for="color in colorPalette"
        :key="color.value"
        type="button"
        :class="[
          color.class,
          'w-10 h-10 rounded-md cursor-pointer transition-all duration-200',
          'hover:scale-110 hover:shadow-lg',
          selectedColor === color.value
            ? 'ring-4 ring-gray-900 ring-offset-2'
            : 'ring-1 ring-gray-300'
        ]"
        :title="color.name"
        @click="selectColor(color.value)"
      />
    </div>

    <!-- Selected color preview -->
    <div v-if="selectedColor" class="mt-4 flex items-center gap-3">
      <span class="text-sm text-gray-600">Selected:</span>
      <div
        :style="{ backgroundColor: selectedColor }"
        class="w-8 h-8 rounded-md ring-1 ring-gray-300"
      />
      <span class="text-sm font-mono text-gray-700">{{ selectedColor }}</span>
    </div>
  </div>
</template>

<style scoped>
.price-zone-color-picker {
  @apply space-y-2;
}
</style>
