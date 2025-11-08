<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="card bg-gradient-to-r from-purple-500 to-pink-500 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Class Schedule</h1>
          <p class="text-purple-100 mt-1">View your children's dance class schedules</p>
        </div>
        <i class="pi pi-calendar text-6xl opacity-20"></i>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card bg-blue-50 border-l-4 border-blue-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Classes</p>
            <p class="text-3xl font-bold text-blue-700">{{ totalClasses }}</p>
          </div>
          <i class="pi pi-calendar text-3xl text-blue-300"></i>
        </div>
      </div>

      <div class="card bg-purple-50 border-l-4 border-purple-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">This Week</p>
            <p class="text-3xl font-bold text-purple-700">{{ classesThisWeek }}</p>
          </div>
          <i class="pi pi-clock text-3xl text-purple-300"></i>
        </div>
      </div>

      <div class="card bg-green-50 border-l-4 border-green-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Dance Styles</p>
            <p class="text-3xl font-bold text-green-700">{{ uniqueDanceStyles }}</p>
          </div>
          <i class="pi pi-star text-3xl text-green-300"></i>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="card">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="flex flex-wrap gap-3 flex-1">
          <!-- Student Filter -->
          <Dropdown
            v-model="selectedStudentId"
            :options="studentOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Students"
            class="w-56"
            @change="loadSchedule"
          >
            <template #value="slotProps">
              <div v-if="slotProps.value" class="flex items-center">
                <i class="pi pi-user mr-2"></i>
                <span>{{ studentOptions.find(s => s.value === slotProps.value)?.label }}</span>
              </div>
              <span v-else>All Students</span>
            </template>
          </Dropdown>

          <!-- View Toggle -->
          <SelectButton v-model="calendarView" :options="viewOptions" optionLabel="label" optionValue="value" @change="changeView" />
        </div>

        <div class="flex gap-2">
          <Button
            label="Today"
            icon="pi pi-calendar-times"
            class="p-button-outlined"
            size="small"
            @click="goToToday"
          />
          <Button
            label="Export Calendar"
            icon="pi pi-download"
            class="p-button-outlined"
            size="small"
            @click="exportToIcal"
          />
        </div>
      </div>
    </div>

    <!-- Calendar View -->
    <div class="card">
      <div v-if="loading" class="text-center py-12">
        <i class="pi pi-spin pi-spinner text-4xl text-primary-500"></i>
        <p class="mt-4 text-gray-600">Loading schedule...</p>
      </div>

      <div v-else-if="calendarEvents.length === 0" class="text-center py-12 bg-gray-50 rounded-lg">
        <i class="pi pi-calendar-times text-6xl text-gray-400 mb-4"></i>
        <p class="text-gray-600 text-lg">No classes scheduled</p>
        <p class="text-gray-500 text-sm mt-2">
          {{ selectedStudentId ? 'This student has no active enrollments' : 'No students have active class enrollments' }}
        </p>
      </div>

      <div v-else>
        <FullCalendar ref="calendar" :options="calendarOptions" />
      </div>
    </div>

    <!-- Legend -->
    <div v-if="calendarEvents.length > 0" class="card">
      <h3 class="font-semibold mb-3">Dance Styles</h3>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="style in danceStyles"
          :key="style.name"
          class="flex items-center space-x-2"
        >
          <div
            class="w-4 h-4 rounded"
            :style="{ backgroundColor: style.color }"
          ></div>
          <span class="text-sm">{{ style.name }}</span>
        </div>
      </div>
    </div>

    <!-- Class Detail Dialog -->
    <Dialog v-model:visible="showClassDetail" :header="selectedClass?.title" :modal="true" :style="{ width: '500px' }">
      <div v-if="selectedClass" class="space-y-4">
        <div class="flex items-center space-x-3">
          <div
            class="w-16 h-16 rounded-lg flex items-center justify-center"
            :style="{ backgroundColor: selectedClass.backgroundColor + '33' }"
          >
            <i class="pi pi-users text-2xl" :style="{ color: selectedClass.backgroundColor }"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold">{{ selectedClass.extendedProps.class_name }}</h3>
            <p class="text-gray-600">{{ selectedClass.extendedProps.student_name }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600">Day</p>
            <p class="font-medium">{{ getDayName(selectedClass.extendedProps.day_of_week) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Time</p>
            <p class="font-medium">{{ selectedClass.startStr }} - {{ selectedClass.endStr }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Teacher</p>
            <p class="font-medium">{{ selectedClass.extendedProps.teacher_name || 'TBA' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Location</p>
            <p class="font-medium">{{ selectedClass.extendedProps.location || 'TBA' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Dance Style</p>
            <Tag
              :value="selectedClass.extendedProps.dance_style"
              :style="{
                backgroundColor: selectedClass.backgroundColor + '33',
                color: selectedClass.backgroundColor,
              }"
            />
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions, EventClickArg } from '@fullcalendar/core'
import type { ParentScheduleEvent } from '~/types/parents'

definePageMeta({
  middleware: 'parent',
})

const toast = useToast()
const calendar = ref()

// State
const loading = ref(true)
const scheduleEvents = ref<ParentScheduleEvent[]>([])
const students = ref<any[]>([])
const selectedStudentId = ref<string | null>(null)
const calendarView = ref<string>('timeGridWeek')
const showClassDetail = ref(false)
const selectedClass = ref<any>(null)

// View options
const viewOptions = [
  { label: 'Week', value: 'timeGridWeek' },
  { label: 'Month', value: 'dayGridMonth' },
]

// Computed
const studentOptions = computed(() => [
  { label: 'All Students', value: null },
  ...students.value.map(s => ({
    label: `${s.first_name} ${s.last_name}`,
    value: s.id,
  })),
])

const danceStyles = computed(() => {
  const styles = new Map<string, { name: string; color: string }>()

  scheduleEvents.value.forEach(event => {
    if (event.dance_style && event.dance_style_color) {
      styles.set(event.dance_style, {
        name: event.dance_style,
        color: event.dance_style_color,
      })
    }
  })

  return Array.from(styles.values())
})

const uniqueDanceStyles = computed(() => danceStyles.value.length)

// Convert schedule events to calendar events
const calendarEvents = computed(() => {
  if (!scheduleEvents.value || scheduleEvents.value.length === 0) {
    return []
  }

  const events: any[] = []
  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0)

  scheduleEvents.value.forEach(scheduleEvent => {
    // Generate recurring events for the next few months
    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      if (currentDate.getDay() === scheduleEvent.day_of_week) {
        const eventDate = new Date(currentDate)
        const [startHour, startMin] = scheduleEvent.start_time.split(':').map(Number)
        const [endHour, endMin] = scheduleEvent.end_time.split(':').map(Number)

        const startDateTime = new Date(eventDate)
        startDateTime.setHours(startHour, startMin, 0)

        const endDateTime = new Date(eventDate)
        endDateTime.setHours(endHour, endMin, 0)

        events.push({
          id: `${scheduleEvent.id}-${eventDate.toISOString()}`,
          title: scheduleEvent.class_name,
          start: startDateTime,
          end: endDateTime,
          backgroundColor: scheduleEvent.dance_style_color || '#6366f1',
          borderColor: scheduleEvent.dance_style_color || '#6366f1',
          textColor: '#ffffff',
          extendedProps: {
            ...scheduleEvent,
          },
        })
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
  })

  return events
})

const totalClasses = computed(() => scheduleEvents.value.length)

const classesThisWeek = computed(() => {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  return calendarEvents.value.filter(event => {
    const eventDate = new Date(event.start)
    return eventDate >= startOfWeek && eventDate < endOfWeek
  }).length
})

// Calendar options
const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: calendarView.value,
  headerToolbar: {
    left: 'prev,next',
    center: 'title',
    right: '',
  },
  events: calendarEvents.value,
  editable: false,
  selectable: false,
  selectMirror: true,
  dayMaxEvents: true,
  weekends: true,
  slotMinTime: '08:00:00',
  slotMaxTime: '22:00:00',
  height: 'auto',
  eventClick: handleEventClick,
  eventTimeFormat: {
    hour: 'numeric',
    minute: '2-digit',
    meridiem: 'short',
  },
}))

// Load data
onMounted(async () => {
  await loadStudents()
  await loadSchedule()
})

async function loadStudents() {
  try {
    const { data } = await useFetch('/api/parent/students')
    if (data.value) {
      students.value = data.value as any[]
    }
  } catch (error) {
    console.error('Error loading students:', error)
  }
}

async function loadSchedule() {
  loading.value = true
  try {
    let endpoint = '/api/parent/schedule'

    if (selectedStudentId.value) {
      endpoint = `/api/parent/schedule/${selectedStudentId.value}`
    }

    const { data, error } = await useFetch(endpoint)

    if (error.value) {
      throw error.value
    }

    if (data.value) {
      const response = data.value as any
      scheduleEvents.value = response.schedule || []
    }
  } catch (error) {
    console.error('Error loading schedule:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load schedule',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function changeView() {
  const calendarApi = calendar.value?.getApi()
  if (calendarApi) {
    calendarApi.changeView(calendarView.value)
  }
}

function goToToday() {
  const calendarApi = calendar.value?.getApi()
  if (calendarApi) {
    calendarApi.today()
  }
}

function handleEventClick(clickInfo: EventClickArg) {
  selectedClass.value = {
    ...clickInfo.event,
    startStr: clickInfo.event.start?.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    endStr: clickInfo.event.end?.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  }
  showClassDetail.value = true
}

async function exportToIcal() {
  try {
    const params: any = {}
    if (selectedStudentId.value) {
      params.student_id = selectedStudentId.value
    }

    const queryString = new URLSearchParams(params).toString()
    const url = `/api/parent/schedule/export${queryString ? '?' + queryString : ''}`

    window.open(url, '_blank')

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Calendar exported successfully',
      life: 3000,
    })
  } catch (error) {
    console.error('Error exporting calendar:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to export calendar',
      life: 3000,
    })
  }
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek]
}
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow p-6;
}

:deep(.fc) {
  font-family: inherit;
}

:deep(.fc-toolbar-title) {
  font-size: 1.5rem !important;
  font-weight: bold;
}

:deep(.fc-button) {
  background-color: #6366f1 !important;
  border-color: #6366f1 !important;
}

:deep(.fc-button:hover) {
  background-color: #4f46e5 !important;
  border-color: #4f46e5 !important;
}

:deep(.fc-button-active) {
  background-color: #4338ca !important;
  border-color: #4338ca !important;
}

:deep(.fc-event) {
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
}

:deep(.fc-event:hover) {
  opacity: 0.9;
}
</style>
