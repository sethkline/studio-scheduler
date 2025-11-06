<template>
  <div class="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-lg transition-shadow">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-medium text-gray-600">{{ title }}</h3>
      <slot name="icon">
        <div v-if="icon" class="text-gray-400">
          <i :class="icon" class="text-xl"></i>
        </div>
      </slot>
    </div>

    <!-- Value -->
    <div class="mb-2">
      <p class="text-3xl font-bold text-gray-900">
        <span v-if="loading" class="animate-pulse">...</span>
        <span v-else>{{ formattedValue }}</span>
      </p>
    </div>

    <!-- Change Indicator -->
    <div v-if="change !== null && !loading" class="flex items-center text-sm">
      <span
        :class="{
          'text-green-600': changeType === 'positive',
          'text-red-600': changeType === 'negative',
          'text-gray-600': changeType === 'neutral'
        }"
        class="flex items-center font-medium"
      >
        <i
          v-if="changeType !== 'neutral'"
          :class="{
            'pi pi-arrow-up': changeType === 'positive',
            'pi pi-arrow-down': changeType === 'negative'
          }"
          class="mr-1 text-xs"
        ></i>
        {{ Math.abs(change) }}{{ changeUnit }}
      </span>
      <span class="text-gray-500 ml-2">{{ changeLabel }}</span>
    </div>

    <!-- Subtext -->
    <p v-if="subtext && !loading" class="text-sm text-gray-500 mt-2">
      {{ subtext }}
    </p>

    <!-- Footer Slot -->
    <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-gray-200">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  value: number | string
  icon?: string
  format?: 'number' | 'currency' | 'percentage' | 'text'
  change?: number | null
  changeType?: 'positive' | 'negative' | 'neutral'
  changeLabel?: string
  changeUnit?: string
  subtext?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  format: 'number',
  change: null,
  changeType: 'neutral',
  changeLabel: 'vs last period',
  changeUnit: '%',
  loading: false
})

const formattedValue = computed(() => {
  if (props.loading) return '...'

  if (props.format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(props.value))
  }

  if (props.format === 'percentage') {
    return `${Number(props.value).toFixed(1)}%`
  }

  if (props.format === 'number' && typeof props.value === 'number') {
    return new Intl.NumberFormat('en-US').format(props.value)
  }

  return props.value
})
</script>
