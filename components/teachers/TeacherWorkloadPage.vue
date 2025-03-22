<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <Button icon="pi pi-arrow-left" class="p-button-text" @click="$router.back()" />
        <h1 class="text-2xl font-bold text-primary-800 inline-block ml-2">
          {{ teacher ? `${teacher.first_name} ${teacher.last_name}'s Workload` : 'Teacher Workload' }}
        </h1>
      </div>
      <div class="flex gap-2">
        <Button label="Export CSV" icon="pi pi-file-excel" class="p-button-outlined" @click="exportWorkload('csv')" />
        <Button label="Print" icon="pi pi-print" class="p-button-outlined" @click="printWorkload" />
      </div>
    </div>
    
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Date Range</h2>
      <div class="flex flex-wrap gap-4 items-end">
        <div>
          <label class="block mb-2">Start Date</label>
          <Calendar v-model="dateRange.startDate" dateFormat="yy-mm-dd" :showIcon="true" 
                   :maxDate="dateRange.endDate || undefined" />
        </div>
        <div>
          <label class="block mb-2">End Date</label>
          <Calendar v-model="dateRange.endDate" dateFormat="yy-mm-dd" :showIcon="true" 
                   :minDate="dateRange.startDate || undefined" />
        </div>
        <div>
          <Button label="Apply" icon="pi pi-search" @click="fetchWorkload" />
        </div>
        <div>
          <Dropdown v-model="selectedPeriod" :options="predefinedPeriods" optionLabel="label" 
                  placeholder="Select Period" class="w-full md:w-14rem" @change="changePeriod" />
        </div>
      </div>
    </div>
    
    <div v-if="loading" class="card flex justify-center py-8">
      <i class="pi pi-spin pi-spinner text-2xl"></i>
    </div>
    
    <div v-else>
      <!-- Workload Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="card bg-blue-50">
          <div class="text-center">
            <h3 class="text-lg font-medium mb-2">Total Teaching Hours</h3>
            <p class="text-3xl font-bold text-blue-600">{{ totalHours.toFixed(1) }}</p>
          </div>
        </div>
        
        <div class="card bg-green-50">
          <div class="text-center">
            <h3 class="text-lg font-medium mb-2">Weekly Average</h3>
            <p class="text-3xl font-bold text-green-600">{{ weeklyAverage.toFixed(1) }}</p>
          </div>
        </div>
        
        <div class="card bg-purple-50">
          <div class="text-center">
            <h3 class="text-lg font-medium mb-2">Total Classes</h3>
            <p class="text-3xl font-bold text-purple-600">{{ totalClasses }}</p>
          </div>
        </div>
        
        <div class="card bg-orange-50">
          <div class="text-center">
            <h3 class="text-lg font-medium mb-2">Styles Taught</h3>
            <p class="text-3xl font-bold text-orange-600">{{ stylesTaught }}</p>
          </div>
        </div>
      </div>
      
      <!-- Charts and Graphs -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Hours by Day of Week</h2>
          <div class="chart-container">
            <Chart type="bar" :data="hoursByDayChartData" :options="barChartOptions" class="h-80" />
          </div>
        </div>
        
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Classes by Dance Style</h2>
          <div class="chart-container">
            <Chart type="pie" :data="classesByStyleChartData" :options="pieChartOptions" class="h-80" />
          </div>
        </div>
      </div>
      
      <!-- Scheduled Classes Table -->
      <div class="card mt-6">
        <h2 class="text-xl font-semibold mb-4">Scheduled Classes</h2>
        
        <DataTable :value="workloadData" :loading="loading" :paginator="true" :rows="10"
                  :rowsPerPageOptions="[5, 10, 20, 50]" responsiveLayout="scroll" stripedRows
                  sortField="day_of_week" :sortOrder="1" class="p-datatable-sm">
          <Column field="day" header="Day" sortable>
            <template #body="slotProps">
              {{ getDayName(slotProps.data.day_of_week) }}
            </template>
          </Column>
          <Column field="start_time" header="Start Time" sortable>
            <template #body="slotProps">
              {{ formatTime(slotProps.data.start_time) }}
            </template>
          </Column>
          <Column field="end_time" header="End Time" sortable>
            <template #body="slotProps">
              {{ formatTime(slotProps.data.end_time) }}
            </template>
          </Column>
          <Column field="class_instance.name" header="Class" sortable></Column>
          <Column field="class_instance.class_definition.dance_style.name" header="Dance Style" sortable>
            <template #body="slotProps">
              <Tag :value="getDanceStyle(slotProps.data)" 
                  :style="{ backgroundColor: getDanceStyleColor(slotProps.data) }" />
            </template>
          </Column>
          <Column field="studio.name" header="Studio" sortable></Column>
          <Column field="duration" header="Duration" sortable>
            <template #body="slotProps">
              {{ calculateDuration(slotProps.data.start_time, slotProps.data.end_time) }}
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTeacherStore } from '~/stores/teacherStore'
import { useTeacherWorkloadStore } from '~/stores/teacherWorkloadStore'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const teacherId = route.params.id
const teacherStore = useTeacherStore()
const workloadStore = useTeacherWorkloadStore()
const toast = useToast()

// State
const teacher = ref(null)
const loading = computed(() => teacherStore.loading || workloadStore.loading)
const workloadData = computed(() => workloadStore.workloadData || [])
const dateRange = ref({
  startDate: new Date(),
  endDate: new Date(new Date().setDate(new Date().getDate() + 30))
})

// Chart data
const hoursByDayChartData = ref(null)
const classesByStyleChartData = ref(null)
const selectedPeriod = ref(null)

// Chart options
const barChartOptions = {
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Hours'
      }
    }
  },
  responsive: true,
  maintainAspectRatio: false
}

const pieChartOptions = {
  plugins: {
    legend: {
      position: 'right'
    }
  },
  responsive: true,
  maintainAspectRatio: false
}

// Predefined periods
const predefinedPeriods = [
  { label: 'Current Week', value: 'currentWeek' },
  { label: 'Next Week', value: 'nextWeek' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Next Month', value: 'nextMonth' },
  { label: 'Last 30 Days', value: 'last30' },
  { label: 'Next 30 Days', value: 'next30' }
]

// Computed
const totalHours = computed(() => workloadStore.totalHours || 0)

const weeklyAverage = computed(() => {
  const days = Math.ceil(
    (dateRange.value.endDate.getTime() - dateRange.value.startDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const weeks = days / 7
  return totalHours.value / weeks
})

const totalClasses = computed(() => {
  return workloadData.value.length || 0
})

const stylesTaught = computed(() => {
  const styles = new Set()
  workloadData.value.forEach(item => {
    const style = getDanceStyle(item)
    if (style) styles.add(style)
  })
  return styles.size
})

// Lifecycle
onMounted(async () => {
  await loadTeacher()
  await fetchWorkload()
})

// Methods
async function loadTeacher() {
  try {
    teacher.value = await teacherStore.fetchTeacherById(teacherId)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load teacher information',
      life: 5000
    })
  }
}

async function fetchWorkload() {
  try {
    if (!dateRange.value.startDate || !dateRange.value.endDate) {
      throw new Error('Please select both start and end dates')
    }
    
    await workloadStore.fetchTeacherWorkload(
      teacherId,
      dateRange.value.startDate,
      dateRange.value.endDate
    )
    
    updateChartData()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load workload information',
      life: 5000
    })
  }
}

function updateChartData() {
  // Hours by day chart
  const hoursByDay = workloadStore.hoursByDay
  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  hoursByDayChartData.value = {
    labels: dayLabels,
    datasets: [
      {
        label: 'Hours',
        backgroundColor: '#3B82F6',
        data: dayLabels.map((_, index) => hoursByDay[index] || 0)
      }
    ]
  }
  
  // Classes by style chart
  const classesByStyle = workloadStore.classesByStyle
  const styleLabels = Object.keys(classesByStyle)
  
  classesByStyleChartData.value = {
    labels: styleLabels,
    datasets: [
      {
        data: styleLabels.map(style => classesByStyle[style] || 0),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#C9CBCF'
        ]
      }
    ]
  }
}

function getDayName(dayIndex) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayIndex] || 'Unknown'
}

function formatTime(timeString) {
  if (!timeString) return ''
  
  const date = new Date(`2000-01-01T${timeString}`)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return ''
  
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)
  const durationMs = end.getTime() - start.getTime()
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
  
  return `${durationHours}h ${durationMinutes}m`
}

function getDanceStyle(classItem) {
  return classItem.class_instance?.class_definition?.dance_style?.name || 'Unknown'
}

function getDanceStyleColor(classItem) {
  return classItem.class_instance?.class_definition?.dance_style?.color || '#cccccc'
}

function exportWorkload(format) {
  try {
    const csvContent = workloadStore.exportWorkloadData(format)
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    // Set link properties
    link.setAttribute('href', url)
    link.setAttribute('download', `${teacher.value.first_name}_${teacher.value.last_name}_workload.csv`)
    link.style.visibility = 'hidden'
    
    // Add to document, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Workload data exported successfully',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to export workload data',
      life: 5000
    })
  }
}

function printWorkload() {
  window.print()
}

function changePeriod() {
  if (!selectedPeriod.value) return
  
  const today = new Date()
  let startDate, endDate
  
  switch (selectedPeriod.value) {
    case 'currentWeek':
      // Start from Sunday of current week
      startDate = new Date(today)
      startDate.setDate(today.getDate() - today.getDay())
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      break
    
    case 'nextWeek':
      // Start from next Sunday
      startDate = new Date(today)
      startDate.setDate(today.getDate() - today.getDay() + 7)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      break
    
    case 'thisMonth':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      break
    
    case 'nextMonth':
      startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)
      break
    
    case 'last30':
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 30)
      endDate = new Date(today)
      break
    
    case 'next30':
      startDate = new Date(today)
      endDate = new Date(today)
      endDate.setDate(today.getDate() + 30)
      break
  }
  
  dateRange.value = {
    startDate,
    endDate
  }
  
  fetchWorkload()
}
</script>