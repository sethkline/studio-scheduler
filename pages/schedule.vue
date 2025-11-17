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
        <div class="mt-6 pt-6 border-t border-gray-200">
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
                :style="{ borderColor: classItem.dance_style?.color || '#8b5cf6' }">
                <div class="flex justify-between items-start gap-4">
                  <div class="flex-1">
                    <h3 class="text-lg font-bold text-gray-900 mb-1">{{ classItem.name }}</h3>
                    <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span class="flex items-center gap-1">
                        <i class="pi pi-clock text-primary" />
                        {{ classItem.start_time }} - {{ classItem.end_time }}
                      </span>
                      <span class="flex items-center gap-1">
                        <i class="pi pi-tag text-primary" />
                        {{ classItem.dance_style?.name }}
                      </span>
                      <span class="flex items-center gap-1">
                        <i class="pi pi-users text-primary" />
                        Ages {{ classItem.min_age }}-{{ classItem.max_age }}
                      </span>
                      <span v-if="classItem.teacher" class="flex items-center gap-1">
                        <i class="pi pi-user text-primary" />
                        {{ classItem.teacher.first_name }} {{ classItem.teacher.last_name }}
                      </span>
                    </div>
                  </div>
                  <NuxtLink :to="`/register/enroll?classId=${classItem.id}`"
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

definePageMeta({
  layout: 'public',
})

const { applyTheme } = useTheme()
const toast = useToast()

// Load theme
onMounted(() => {
  applyTheme()
})

// Fetch data
const { data: locationsData } = await useFetch('/api/studio/locations')
const { data: stylesData } = await useFetch('/api/classes/dance-styles')
const { data: schedulesData } = await useFetch('/api/schedules')

const locations = ref<StudioLocation[]>(locationsData.value || [])
const danceStyles = ref(stylesData.value || [])
const schedules = ref(schedulesData.value || [])

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

// Mock class data (replace with actual API call)
const classSchedule = ref([
  {
    id: '1',
    name: 'Ballet Fundamentals',
    day_of_week: 1,
    start_time: '4:00 PM',
    end_time: '5:00 PM',
    min_age: 6,
    max_age: 10,
    dance_style: { id: '1', name: 'Ballet', color: '#ec4899' },
    teacher: { first_name: 'Sarah', last_name: 'Johnson' },
  },
  // Add more mock data as needed
])

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
  events: [], // TODO: Map class schedule to calendar events
  eventClick: (info) => {
    // Handle event click
  },
}))

// Get classes for specific day
const getClassesForDay = (dayOfWeek: number) => {
  let result = classSchedule.value.filter(c => c.day_of_week === dayOfWeek)

  // Apply filters
  if (selectedStyle.value) {
    result = result.filter(c => c.dance_style?.id === selectedStyle.value)
  }

  if (selectedAgeGroup.value) {
    const [minAge, maxAge] = selectedAgeGroup.value.split('-').map(a => a.replace('+', ''))
    result = result.filter(c => {
      if (maxAge === '') {
        return c.min_age >= parseInt(minAge)
      }
      return c.min_age >= parseInt(minAge) && c.max_age <= parseInt(maxAge)
    })
  }

  return result
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
