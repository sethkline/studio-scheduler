<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-primary-800">Class Schedule</h1>
      <div class="flex space-x-2">
        <Button label="Auto-Schedule" icon="pi pi-cog" class="p-button-outlined" />
        <Button label="New Class" icon="pi pi-plus" @click="navigateTo('/schedule/new')" />
      </div>
    </div>
    
    <div class="card">
      <div class="mb-4 flex flex-wrap gap-2">
        <Calendar v-model="selectedDate" dateFormat="yy-mm-dd" />
        <Dropdown v-model="selectedView" :options="viewOptions" optionLabel="name" optionValue="value" 
                  placeholder="Select View" class="w-48" />
      </div>
      
      <div class="min-h-[600px] bg-gray-50 p-4 rounded border">
        <div v-if="loading" class="flex justify-center items-center h-64">
          <i class="pi pi-spin pi-spinner text-2xl"></i>
        </div>
        <div v-else-if="selectedView === 'week'">
          <!-- Week view would be implemented with a more complex component
               Placeholder for now -->
          <div class="grid grid-cols-7 gap-2">
            <div v-for="dayIndex in 7" :key="dayIndex" class="bg-white border rounded p-3">
              <h3 class="text-sm font-semibold">{{ getDayName(dayIndex - 1) }}</h3>
              <div class="mt-2 space-y-2">
                <div v-for="hour in 10" :key="hour" 
                     class="text-xs p-1 border-l-2 border-primary-300 pl-2 hover:bg-primary-50 cursor-pointer">
                  {{ hour + 8 }}:00
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <p class="text-center text-gray-500">Calendar view coming soon</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const loading = ref(true)
const selectedDate = ref(new Date())
const selectedView = ref('week')
const viewOptions = [
  { name: 'Week View', value: 'week' },
  { name: 'Month View', value: 'month' }
]

onMounted(() => {
  // Simulate loading schedule data
  setTimeout(() => {
    loading.value = false
  }, 500)
})

const getDayName = (index) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[index]
}
</script>