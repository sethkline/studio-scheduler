<template>
  <div>
    <!-- Hero Section -->
    <section class="bg-gradient-to-r from-primary to-secondary text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">Class Schedule</h1>
        <p class="text-xl max-w-2xl mx-auto">
          View our weekly class schedule and find the perfect time for your dance classes.
        </p>
      </div>
    </section>

    <div class="container mx-auto px-4 py-12">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="text-center">
          <i class="pi pi-spin pi-spinner text-4xl text-primary mb-4" />
          <p class="text-gray-600">Loading class schedule...</p>
        </div>
      </div>

      <!-- No Schedule Available -->
      <div v-else-if="!activeSchedule" class="bg-white rounded-xl shadow-lg p-12 text-center">
        <i class="pi pi-calendar-times text-6xl text-gray-300 mb-4" />
        <h2 class="text-2xl font-bold text-gray-900 mb-2">No Schedule Available</h2>
        <p class="text-gray-600">There is currently no published class schedule. Please check back later.</p>
      </div>

      <!-- Schedule Content -->
      <template v-else>
        <!-- Filters and Controls -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div class="grid md:grid-cols-4 gap-6">
            <!-- Location Filter -->
            <div v-if="locations.length > 1">
              <label class="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <select v-model="selectedLocation"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="">All Locations</option>
                <option v-for="location in locations" :key="location.id" :value="location.id">
                  {{ location.name }}
                </option>
              </select>
            </div>

            <!-- Dance Style Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Dance Style</label>
              <select v-model="selectedStyle"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="">All Styles</option>
                <option v-for="style in danceStyles" :key="style.id" :value="style.id">
                  {{ style.name }}
                </option>
              </select>
            </div>

            <!-- Age Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Age Group</label>
              <select v-model="selectedAgeGroup"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="">All Ages</option>
                <option value="3-6">Ages 3-6</option>
                <option value="7-12">Ages 7-12</option>
                <option value="13-18">Teen (13-18)</option>
                <option value="18+">Adult (18+)</option>
              </select>
            </div>

            <!-- View Mode -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">View</label>
              <div class="flex gap-2">
                <button @click="viewMode = 'week'"
                  :class="[viewMode === 'week' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700']"
                  class="flex-1 px-4 py-2 rounded-lg font-medium transition-colors">
                  Week
                </button>
                <button @click="viewMode = 'list'"
                  :class="[viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700']"
                  class="flex-1 px-4 py-2 rounded-lg font-medium transition-colors">
                  List
                </button>
              </div>
            </div>
          </div>

          <!-- Legend -->
          <div v-if="danceStyles.length > 0" class="mt-6 pt-6 border-t border-gray-200">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Legend</h3>
            <div class="flex flex-wrap gap-4">
              <div v-for="style in danceStyles.slice(0, 6)" :key="style.id" class="flex items-center gap-2">
                <div class="w-4 h-4 rounded" :style="{ backgroundColor: style.color || '#8b5cf6' }" />
                <span class="text-sm text-gray-600">{{ style.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Week View (Calendar) -->
        <div v-if="viewMode === 'week'" class="bg-white rounded-xl shadow-lg overflow-hidden">
          <FullCalendar :options="calendarOptions" />
        </div>

        <!-- List View -->
        <div v-else class="space-y-6">
          <div v-for="day in daysOfWeek" :key="day.value" class="bg-white rounded-xl shadow-lg overflow-hidden">
            <div class="bg-gradient-to-r from-primary to-secondary text-white px-6 py-4">
              <h2 class="text-2xl font-bold">{{ day.label }}</h2>
            </div>

            <div class="p-6">
              <div v-if="getClassesForDay(day.value).length > 0" class="space-y-4">
                <div v-for="classItem in getClassesForDay(day.value)" :key="classItem.id"
                  class="border-l-4 pl-4 py-3 hover:bg-gray-50 transition-colors"
                  :style="{ borderColor: classItem.danceStyleColor || '#8b5cf6' }">
                  <div class="flex justify-between items-start gap-4">
                    <div class="flex-1">
                      <h3 class="text-lg font-bold text-gray-900 mb-1">{{ classItem.className }}</h3>
                      <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span class="flex items-center gap-1">
                          <i class="pi pi-clock text-primary" />
                          {{ formatTime(classItem.startTime) }} - {{ formatTime(classItem.endTime) }}
                        </span>
                        <span class="flex items-center gap-1">
                          <i class="pi pi-tag text-primary" />
                          {{ classItem.danceStyle }}
                        </span>
                        <span class="flex items-center gap-1">
                          <i class="pi pi-users text-primary" />
                          Ages {{ classItem.minAge }}-{{ classItem.maxAge }}
                        </span>
                        <span class="flex items-center gap-1">
                          <i class="pi pi-user text-primary" />
                          {{ classItem.teacherName }}
                        </span>
                        <span v-if="classItem.studioName" class="flex items-center gap-1">
                          <i class="pi pi-map-marker text-primary" />
                          {{ classItem.studioName }}
                        </span>
                      </div>
                    </div>
                    <NuxtLink :to="`/register/enroll?classId=${classItem.classInstanceId}`"
                      class="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:shadow-lg transition-all whitespace-nowrap">
                      Enroll
                    </NuxtLink>
                  </div>
                </div>
              </div>

              <div v-else class="text-center py-8 text-gray-500">
                <i class="pi pi-calendar-times text-4xl mb-2 text-gray-300" />
                <p>No classes scheduled for {{ day.label }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Download/Print Options -->
      <div class="mt-8 text-center">
        <div class="inline-flex gap-4">
          <button @click="printSchedule"
            class="px-6 py-3 bg-white border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all">
            <i class="pi pi-print mr-2" />
            Print Schedule
          </button>
          <button @click="downloadPDF"
            class="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:shadow-lg transition-all">
            <i class="pi pi-download mr-2" />
            Download PDF
          </button>
        </div>
      </div>

      <!-- Important Dates -->
      <div class="mt-12 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Important Dates</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="flex items-start gap-3">
            <i class="pi pi-calendar text-yellow-600 text-xl mt-1" />
            <div>
              <div class="font-bold text-gray-900">Studio Closures</div>
              <div class="text-sm text-gray-600">Thanksgiving: Nov 23-24 | Winter Break: Dec 24-Jan 2</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <i class="pi pi-star text-yellow-600 text-xl mt-1" />
            <div>
              <div class="font-bold text-gray-900">Upcoming Events</div>
              <div class="text-sm text-gray-600">Spring Recital: May 15 | Summer Intensive: July 10-20</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import type { CalendarOptions } from '@fullcalendar/core'
import type { StudioLocation } from '~/types/studio'
import type { Schedule, ScheduleClass } from '~/types'
import { useScheduleTermStore } from '~/stores/useScheduleTermStore'
import { useScheduleStore } from '~/stores/schedule'

definePageMeta({
  layout: 'public',
})

const { applyTheme } = useTheme()
const toast = useToast()
const supabase = useSupabaseClient()

// Stores
const scheduleTermStore = useScheduleTermStore()
const scheduleStore = useScheduleStore()

// State
const loading = ref(true)
const activeSchedule = ref<Schedule | null>(null)
const scheduleClasses = ref<ScheduleClass[]>([])

// Fetch data
const { data: locationsData } = await useFetch('/api/studio/locations')
const { data: stylesData } = await useFetch('/api/classes/dance-styles')

const locations = ref<StudioLocation[]>(locationsData.value || [])
const danceStyles = ref(stylesData.value || [])

// Filters
const selectedLocation = ref('')
const selectedStyle = ref('')
const selectedAgeGroup = ref('')
const viewMode = ref<'week' | 'list'>('week')

// Days of week
const daysOfWeek = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
]

// Load theme and data on mount
onMounted(async () => {
  applyTheme()
  await loadScheduleData()
})

// Load active/published schedule and its classes
async function loadScheduleData() {
  try {
    loading.value = true

    // Fetch active schedule
    const activeSchedules = await scheduleTermStore.fetchSchedules({ isActive: true })

    if (activeSchedules && activeSchedules.length > 0) {
      activeSchedule.value = activeSchedules[0]

      // Load classes for this schedule
      await loadScheduleClasses(activeSchedule.value.id)
    } else {
      // No active schedule found
      toast.add({
        severity: 'info',
        summary: 'No Schedule Available',
        detail: 'There is currently no published class schedule.',
        life: 5000,
      })
    }
  } catch (error) {
    console.error('Error loading schedule data:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load class schedule',
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

// Load schedule classes with full details
async function loadScheduleClasses(scheduleId: string) {
  try {
    // Fetch schedule classes using the store
    await scheduleStore.fetchCurrentSchedule(scheduleId)

    // Get enriched schedule data with teacher names, ages, etc.
    const { data: enrichedClasses, error } = await supabase
      .from('schedule_classes')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        class_instance:class_instance_id (
          id,
          name,
          min_age,
          max_age,
          teacher:teacher_id (id, first_name, last_name),
          class_definition:class_definition_id (
            id,
            name,
            dance_style:dance_style_id (id, name, color)
          )
        ),
        studio:studio_room_id (id, name)
      `)
      .eq('schedule_id', scheduleId)
      .order('day_of_week')
      .order('start_time')

    if (error) throw error

    // Transform data for easier use in templates
    scheduleClasses.value = enrichedClasses.map(item => ({
      id: item.id,
      dayOfWeek: item.day_of_week,
      startTime: item.start_time,
      endTime: item.end_time,
      classInstanceId: item.class_instance?.id || '',
      className: item.class_instance?.name ||
                 item.class_instance?.class_definition?.name ||
                 'Unnamed Class',
      teacherName: item.class_instance?.teacher
        ? `${item.class_instance.teacher.first_name} ${item.class_instance.teacher.last_name}`
        : 'TBD',
      danceStyle: item.class_instance?.class_definition?.dance_style?.name || 'Unknown',
      danceStyleColor: item.class_instance?.class_definition?.dance_style?.color || '#8b5cf6',
      studioId: item.studio?.id || '',
      studioName: item.studio?.name || 'TBD',
      // Include additional fields for filtering
      minAge: item.class_instance?.min_age || 0,
      maxAge: item.class_instance?.max_age || 99,
      danceStyleId: item.class_instance?.class_definition?.dance_style?.id || '',
    }))
  } catch (error) {
    console.error('Error loading schedule classes:', error)
    throw error
  }
}

// Filtered classes based on user selections
const filteredClasses = computed(() => {
  let result = scheduleClasses.value

  // Filter by dance style
  if (selectedStyle.value) {
    result = result.filter(c => c.danceStyleId === selectedStyle.value)
  }

  // Filter by age group
  if (selectedAgeGroup.value) {
    const [minAge, maxAge] = selectedAgeGroup.value.split('-').map(a => a.replace('+', ''))
    result = result.filter(c => {
      if (maxAge === '') {
        // "18+" case
        return c.minAge >= parseInt(minAge)
      }
      // Check if class age range overlaps with filter range
      return c.minAge <= parseInt(maxAge) && c.maxAge >= parseInt(minAge)
    })
  }

  return result
})

// Map classes to calendar events
const calendarEvents = computed(() => {
  return filteredClasses.value.map(classItem => {
    // Create a date for this week to display on calendar
    const today = new Date()
    const currentDay = today.getDay()
    const diff = classItem.dayOfWeek - currentDay
    const eventDate = new Date(today)
    eventDate.setDate(today.getDate() + diff)

    // Parse time strings (format: "HH:MM:SS")
    const [startHour, startMin] = classItem.startTime.split(':').map(Number)
    const [endHour, endMin] = classItem.endTime.split(':').map(Number)

    const startDateTime = new Date(eventDate)
    startDateTime.setHours(startHour, startMin, 0, 0)

    const endDateTime = new Date(eventDate)
    endDateTime.setHours(endHour, endMin, 0, 0)

    return {
      id: classItem.id,
      title: classItem.className,
      start: startDateTime,
      end: endDateTime,
      backgroundColor: classItem.danceStyleColor,
      borderColor: classItem.danceStyleColor,
      extendedProps: {
        teacher: classItem.teacherName,
        style: classItem.danceStyle,
        studio: classItem.studioName,
        classItem: classItem,
      },
    }
  })
})

// Calendar options
const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin],
  initialView: 'timeGridWeek',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'timeGridWeek,timeGridDay',
  },
  slotMinTime: '08:00:00',
  slotMaxTime: '22:00:00',
  allDaySlot: false,
  events: calendarEvents.value,
  eventClick: (info) => {
    const classItem = info.event.extendedProps.classItem
    // Show more details or navigate to enrollment
    toast.add({
      severity: 'info',
      summary: classItem.className,
      detail: `${classItem.danceStyle} with ${classItem.teacherName}`,
      life: 3000,
    })
  },
}))

// Get classes for specific day
const getClassesForDay = (dayOfWeek: number) => {
  return filteredClasses.value.filter(c => c.dayOfWeek === dayOfWeek)
}

// Format time from HH:MM:SS to readable format (e.g., "2:00 PM")
const formatTime = (timeString: string) => {
  if (!timeString) return ''

  const [hours, minutes] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// Print schedule
const printSchedule = () => {
  window.print()
}

// Download PDF
const downloadPDF = () => {
  toast.add({
    severity: 'info',
    summary: 'Coming Soon',
    detail: 'PDF download functionality will be available soon.',
    life: 3000,
  })
}
</script>

<style>
@media print {
  .no-print {
    display: none !
;
  }
}
</style>
