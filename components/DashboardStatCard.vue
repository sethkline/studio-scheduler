<template>
  <Card class="stat-card" :class="`stat-card-${color}`">
    <template #content>
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="text-sm font-medium text-gray-600 mb-1">{{ title }}</div>
          <div v-if="loading" class="h-8 flex items-center">
            <ProgressSpinner style="width: 24px; height: 24px" />
          </div>
          <div v-else class="text-3xl font-bold text-gray-900">
            {{ formattedValue }}
          </div>
          <div v-if="subtitle" class="text-xs text-gray-500 mt-1">
            {{ subtitle }}
          </div>
        </div>
        <div class="stat-icon" :class="`stat-icon-${color}`">
          <i :class="`pi ${icon}`" class="text-2xl"></i>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  value: number | string
  icon: string
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  subtitle?: string
  loading?: boolean
}>()

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})
</script>

<style scoped>
.stat-card {
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-center;
  opacity: 0.9;
}

.stat-icon-blue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-icon-green {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.stat-icon-purple {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.stat-icon-orange {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: white;
}

.stat-icon-red {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
}

.stat-card :deep(.p-card-body) {
  padding: 1.25rem;
}

.stat-card :deep(.p-card-content) {
  padding: 0;
}
</style>
