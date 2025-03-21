<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-primary-800">Class Schedule</h1>
        <p v-if="activeSchedule" class="text-gray-600">
          Viewing: {{ activeSchedule.name }} 
          <span class="text-sm">({{ formatDateRange(activeSchedule.start_date, activeSchedule.end_date) }})</span>
        </p>
      </div>
      
      <div class="flex flex-col sm:flex-row gap-2">
        <Calendar v-model="selectedDate" dateFormat="yy-mm-dd" class="w-full sm:w-auto" />
        
        <Dropdown 
          v-model="selectedView" 
          :options="viewOptions" 
          optionLabel="name" 
          optionValue="value"
          placeholder="Select View" 
          class="w-full sm:w-48" 
        />
        
        <Button 
          v-if="authStore.hasRole(['admin', 'staff'])"
          label="Manage Schedules" 
          icon="pi pi-cog" 
          class="p-button-outlined" 
          @click="navigateTo('/schedules')" 
        />
      </div>
    </div>
    
    <div class="card">
      <!-- Filter toolbar -->
      <div class="mb-4 flex flex-wrap gap-2 items-center">
        <div class="flex-grow">
          <span v-if="showingWeek" class="font-medium text-lg">
            {{ formatWeekRange(selectedDate) }}
          </span>
          <span v-else class="font-medium text-lg">
            {{ formatMonthYear(selectedDate) }}
          </span>
        </div>
        
        <div class="flex gap-2">
          <Button icon="pi pi-chevron-left" class="p-button-sm p-button-outlined" @click="navigateDate(-1)" />
          <Button label="Today" class="p-button-sm" @click="goToToday" />
          <Button icon="pi pi-chevron-right" class="p-button-sm p-button-outlined" @click="navigateDate(1)" />
        </div>
        
        <div>
          <MultiSelect 
            v-model="selectedDanceStyles" 
            :options="danceStyles" 
            optionLabel="name" 
            placeholder="Filter by dance style" 
            class="w-full sm:w-60"
            display="chip"
          >
            <template #value="slotProps">
              <div v-if="slotProps.value && slotProps.value.length > 0" class="flex gap-1">
                <Badge v-for="(style, i) in slotProps.value" :key="i" :value="style.name" />
              </div>
              <div v-else>
                Filter by dance style
              </div>
            </template>
            <template #option="slotProps">
              <div class="flex items-center">
                <span 
                  class="inline-block w-3 h-3 rounded-full mr-2"
                  :style="{ backgroundColor: slotProps.option.color }"
                ></span>
                <div>{{ slotProps.option.name }}</div>
              </div>
            </template>
          </MultiSelect>
        </div>
      </div>
      
      <!-- Schedule content -->
      <div class="min-h-[600px] bg-gray-50 p-4 rounded border">
        <div v-if="loading" class="flex justify-center items-center h-64">
          <i class="pi pi-spin pi-spinner text-2xl"></i>
        </div>
        
        <!-- Week view -->
        <div v-else-if="selectedView === 'week'" class="relative">
          <!-- Time indicators on the left -->
          <div class="absolute left-0 top-[60px] w-16 h-full">
            <div v-for="hour in hoursOfDay" :key="hour" class="h-20 -mt-3 text-xs text-gray-500 text-right pr-2">
              {{ formatHour(hour) }}
            </div>
          </div>
          
          <!-- Days of the week -->
          <div class="grid grid-cols-7 gap-1 pl-16">
            <div v-for="(day, index) in daysOfWeek" :key="day.value" 
                 class="text-center p-2 font-medium text-sm border-b bg-white sticky top-0 z-10">
              {{ day.label }}<br>
              <span class="text-xs text-gray-500">
                {{ formatDayDate(getDateForDayOfWeek(selectedDate, index)) }}
              </span>
            </div>
          </div>
          
          <!-- Time slots grid -->
          <div class="grid grid-cols-7 gap-1 mt-1 pl-16">
            <div v-for="dayIndex in 7" :key="dayIndex" class="bg-white rounded">
              <div v-for="hour in hoursOfDay" :key="hour" 
                   class="h-20 border-b border-gray-100 relative"
                   :class="{ 'bg-gray-50': hour % 2 === 0 }">
                <!-- Classes occurring at this time slot -->
                <div v-for="classItem in getClassesForTimeSlot(dayIndex - 1, hour)" 
                     :key="classItem.id"
                     class="absolute rounded p-1 overflow-hidden text-xs w-full cursor-pointer hover:opacity-90"
                     :class="{ 'left-0': true }"
                     :style="{
                       top: `${getClassTopPosition(classItem, hour)}px`,
                       height: `${getClassHeight(classItem)}px`,
                       backgroundColor: classItem.danceStyleColor,
                       color: getContrastColor(classItem.danceStyleColor)
                     }"
                     @click="showClassDetails(classItem)"
                >
                  <div class="font-bold truncate">{{ classItem.className }}</div>
                  <div class="truncate">{{ formatTimeRange(classItem.startTime, classItem.endTime) }}</div>
                  <div class="truncate">{{ classItem.teacherName }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Month view (placeholder) -->
        <div v-else>
          <p class="text-center text-gray-500">Month view coming soon</p>
        </div>
      </div>
    </div>
    
    <!-- Class details dialog -->
    <Dialog v-model:visible="classDetailsDialog.visible" :header="classDetailsDialog.title" :style="{ width: '450px' }">
      <div v-if="classDetailsDialog.class" class="space-y-4">
        <div class="flex items-center">
          <span 
            class="inline-block w-4 h-4 rounded-full mr-2"
            :style="{ backgroundColor: classDetailsDialog.class.danceStyleColor }"
          ></span>
          <span class="font-medium">{{ classDetailsDialog.class.danceStyle }}</span>
        </div>
        
        <div class="grid grid-cols-3 gap-2 text-sm">
          <div class="font-medium">Day:</div>
          <div class="col-span-2">{{ getDayName(classDetailsDialog.class.dayOfWeek) }}</div>
          
          <div class="font-medium">Time:</div>
          <div class="col-span-2">{{ formatTimeRange(classDetailsDialog.class.startTime, classDetailsDialog.class.endTime) }}</div>
          
          <div class="font-medium">Teacher:</div>
          <div class="col-span-2">{{ classDetailsDialog.class.teacherName }}</div>
          
          <div class="font-medium">Studio:</div>
          <div class="col-span-2">{{ classDetailsDialog.class.studioName }}</div>
        </div>
      </div>
      
      <template #footer>
        <Button label="Close" icon="pi pi-times" @click="closeClassDetails" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useScheduleTermStore } from '~/stores/useScheduleTermStore'
import { useScheduleStore } from '~/stores/schedule'
import { useAuthStore } from '~/stores/auth'
import type { Schedule, ScheduleClass } from '~/types'

// State
const loading = ref(true)
const selectedDate = ref(new Date())
const selectedView = ref('week')
const viewOptions = [
  { name: 'Week View', value: 'week' },
  { name: 'Month View', value: 'month' }
]
const activeSchedule = ref<Schedule | null>(null)
const scheduleClasses = ref<ScheduleClass[]>([])
const selectedDanceStyles = ref<any[]>([])
const danceStyles = ref<any[]>([])

// Dialog state
const classDetailsDialog = ref({
  visible: false,
  title: '',
  class: null as ScheduleClass | null
})

// Hours to display in the week view
const hoursOfDay = Array.from({ length: 14 }, (_, i) => i + 8) // 8 AM to 9 PM

// Computed props
const showingWeek = computed(() => selectedView.value === 'week')

// Composables
const router = useRouter()
const scheduleTermStore = useScheduleTermStore()
const scheduleStore = useScheduleStore()
const authStore = useAuthStore()

// Days of the week
const daysOfWeek = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
]

// Load data on mount
onMounted(async () => {
  try {
    loading.value = true
    
    // Fetch active schedule
    await loadActiveSchedule()
    
    // Fetch dance styles for filtering
    await loadDanceStyles()
    
  } catch (error) {
    console.error('Error loading schedule data:', error)
  } finally {
    loading.value = false
  }
})

// Watch for date changes to reload schedule
watch(selectedDate, () => {
  if (activeSchedule.value) {
    loadScheduleClasses(activeSchedule.value.id)
  }
})

// Watch for dance style filter changes
watch(selectedDanceStyles, () => {
  // No need to reload, just let the filtering happen in the template
})

// Load the active schedule
async function loadActiveSchedule() {
  try {
    const activeSchedules = await scheduleTermStore.fetchSchedules({ isActive: true })
    
    if (activeSchedules && activeSchedules.length > 0) {
      activeSchedule.value = activeSchedules[0]
      
      // Now load classes for this schedule
      await loadScheduleClasses(activeSchedule.value.id)
    }
  } catch (error) {
    console.error('Error fetching active schedule:', error)
  }
}

// Load dance styles for filtering
async function loadDanceStyles() {
  const client = useSupabaseClient()
  
  try {
    const { data, error } = await client
      .from('dance_styles')
      .select('id, name, color')
      
    if (error) throw error
    
    danceStyles.value = data
  } catch (error) {
    console.error('Error loading dance styles:', error)
  }
}

// Load schedule classes
async function loadScheduleClasses(scheduleId: string) {
  loading.value = true
  
  try {
    await scheduleStore.fetchCurrentSchedule(scheduleId)
    scheduleClasses.value = scheduleStore.scheduleItems
  } catch (error) {
    console.error('Error loading schedule classes:', error)
  } finally {
    loading.value = false
  }
}

// Get the day name
function getDayName(dayIndex: number): string {
  const day = daysOfWeek.find(d => d.value === dayIndex)
  return day ? day.label : ''
}

// Format date range
function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return ''
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  return `${formatDate(start)} - ${formatDate(end)}`
}

// Format a date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

// Format day date (e.g., "Dec 5")
function formatDayDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric'
  }).format(date)
}

// Format week range (e.g., "December 5 - December 11, 2023")
function formatWeekRange(date: Date): string {
  const weekStart = getStartOfWeek(date)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  
  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
}

// Format month and year (e.g., "December 2023")
function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { 
    month: 'long', 
    year: 'numeric'
  }).format(date)
}

// Format hour (e.g., "9:00 AM")
function formatHour(hour: number): string {
  const date = new Date()
  date.setHours(hour, 0, 0)
  
  return new Intl.DateTimeFormat('en-US', { 
    hour: 'numeric',
    hour12: true
  }).format(date)
}

// Format time range (e.g., "9:00 AM - 10:30 AM")
function formatTimeRange(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return ''
  
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)
  
  return `${formatTime(start)} - ${formatTime(end)}`
}

// Format time
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { 
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

// Get start of week for a date
function getStartOfWeek(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  result.setDate(result.getDate() - day)
  return result
}

// Get date for a specific day of the week relative to selected date
function getDateForDayOfWeek(date: Date, dayIndex: number): Date {
  const weekStart = getStartOfWeek(date)
  const result = new Date(weekStart)
  result.setDate(weekStart.getDate() + dayIndex)
  return result
}

// Navigate to previous/next week or month
function navigateDate(direction: number) {
  const newDate = new Date(selectedDate.value)
  
  if (selectedView.value === 'week') {
    newDate.setDate(newDate.getDate() + (7 * direction))
  } else {
    newDate.setMonth(newDate.getMonth() + direction)
  }
  
  selectedDate.value = newDate
}

// Go to today
function goToToday() {
  selectedDate.value = new Date()
}

// Get classes for a specific time slot
function getClassesForTimeSlot(dayOfWeek: number, hour: number): ScheduleClass[] {
  if (!scheduleClasses.value) return []
  
  // Filter classes by selected dance styles
  const styleIds = selectedDanceStyles.value.map(s => s.id)
  let filteredClasses = scheduleClasses.value
  
  if (selectedDanceStyles.value.length > 0) {
    // We don't have direct access to dance_style_id in scheduleClasses
    // This is a simplified approach - in a real app, you'd improve this filtering
    filteredClasses = scheduleClasses.value.filter(c => 
      selectedDanceStyles.value.some(s => s.name === c.danceStyle)
    )
  }
  
  // Filter classes for this day and time slot
  return filteredClasses.filter(classItem => {
    if (classItem.dayOfWeek !== dayOfWeek) return false
    
    const startTime = new Date(`2000-01-01T${classItem.startTime}`)
    const endTime = new Date(`2000-01-01T${classItem.endTime}`)
    const slotStart = new Date(2000, 0, 1, hour, 0, 0)
    const slotEnd = new Date(2000, 0, 1, hour + 1, 0, 0)
    
    // Class overlaps with this hour slot
    return (
      (startTime < slotEnd && endTime > slotStart) ||
      (startTime.getHours() === hour) ||
      (endTime.getHours() === hour)
    )
  })
}

// Calculate top position for a class in the time grid
function getClassTopPosition(classItem: ScheduleClass, hour: number): number {
  const startTime = new Date(`2000-01-01T${classItem.startTime}`)
  const slotStartHour = hour
  
  if (startTime.getHours() < slotStartHour) {
    // Class starts before this hour slot
    return 0
  }
  
  // Calculate minutes into the hour
  const minutesIntoHour = startTime.getMinutes()
  
  // Convert minutes to pixels (1 hour = 80px)
  return (minutesIntoHour / 60) * 80
}

// Calculate height for a class based on duration
function getClassHeight(classItem: ScheduleClass): number {
  const startTime = new Date(`2000-01-01T${classItem.startTime}`)
  const endTime = new Date(`2000-01-01T${classItem.endTime}`)
  
  // Calculate duration in minutes
  const durationMs = endTime.getTime() - startTime.getTime()
  const durationMinutes = durationMs / (1000 * 60)
  
  // Convert duration to pixels (1 hour = 80px, 1 minute = 80/60 px)
  return (durationMinutes / 60) * 80
}

// Get contrast color (black or white) based on background color
function getContrastColor(hexColor: string): string {
  // Default to white if no color
  if (!hexColor) return 'white'
  
  // Convert hex to RGB
  let r, g, b
  
  if (hexColor.startsWith('#')) {
    // Remove the hash
    const hex = hexColor.slice(1)
    
    // Convert 3-digit hex to 6-digit
    const normalizedHex = hex.length === 3 
      ? hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
      : hex
      
    // Parse the hex values
    r = parseInt(normalizedHex.substring(0, 2), 16)
    g = parseInt(normalizedHex.substring(2, 4), 16)
    b = parseInt(normalizedHex.substring(4, 6), 16)
  } else {
    // Default values if color format is unexpected
    r = g = b = 128
  }
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? 'black' : 'white'
}

// Show class details in dialog
function showClassDetails(classItem: ScheduleClass) {
  classDetailsDialog.value = {
    visible: true,
    title: classItem.className,
    class: classItem
  }
}

// Close class details dialog
function closeClassDetails() {
  classDetailsDialog.value.visible = false
}
</script>

<style scoped>
/* Ensure week view displays properly */
.grid-cols-7 {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
</style>