<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <Button icon="pi pi-arrow-left" class="p-button-text" @click="$router.back()" />
        <h1 class="inline-block text-2xl font-bold text-primary-800 ml-2">
          {{ teacherAvailabilityTitle }}
        </h1>
      </div>
      <div class="flex gap-2">
        <Button label="Add Exception" icon="pi pi-calendar-plus" class="p-button-outlined" @click="openExceptionModal" />
        <Button label="Add Weekly Availability" icon="pi pi-plus" @click="openAvailabilityModal" />
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Weekly Schedule -->
      <div class="lg:col-span-2">
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Weekly Availability</h2>
          
          <div v-if="loading" class="flex justify-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl"></i>
          </div>
          
          <div v-else-if="regularAvailability.length === 0" class="p-4 bg-gray-50 rounded text-center">
            <p class="text-gray-500">No regular availability set.</p>
            <Button label="Add Availability" icon="pi pi-plus" class="p-button-sm mt-2" @click="openAvailabilityModal" />
          </div>
          
          <div v-else class="weekly-schedule">
            <div v-for="day in daysOfWeek" :key="day.value" class="mb-4">
              <h3 class="font-medium mb-2">{{ day.label }}</h3>
              <div v-if="availabilityByDay(day.value).length === 0" class="text-gray-500 text-sm">
                Not available
              </div>
              <div v-else class="space-y-2">
                <div v-for="slot in availabilityByDay(day.value)" :key="slot.id" 
                     class="bg-gray-50 p-3 rounded flex justify-between items-center">
                  <div>
                    <Badge :value="slot.is_available ? 'Available' : 'Unavailable'" 
                           :severity="slot.is_available ? 'success' : 'danger'" />
                    <span class="ml-2">{{ formatTime(slot.start_time) }} - {{ formatTime(slot.end_time) }}</span>
                  </div>
                  <div class="flex gap-1">
                    <Button icon="pi pi-pencil" class="p-button-text p-button-sm" @click="editAvailability(slot)" />
                    <Button icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger" 
                           @click="confirmDeleteAvailability(slot)" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Exceptions Calendar -->
      <div class="lg:col-span-1">
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Availability Exceptions</h2>
          
          <div v-if="loading" class="flex justify-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl"></i>
          </div>
          
          <div v-else>
            <div class="mb-4">
              <Calendar v-model="selectedDate" selectionMode="single" :inline="true" 
                       :showWeek="true" dateFormat="yy-mm-dd" 
                       :manualInput="false" @date-select="onDateSelect" />
            </div>
            
            <div v-if="selectedDateExceptions.length === 0" class="p-4 bg-gray-50 rounded text-center">
              <p class="text-gray-500">No exceptions for {{ formatDate(selectedDate) }}.</p>
              <Button label="Add Exception" icon="pi pi-plus" class="p-button-sm mt-2" @click="openExceptionModal" />
            </div>
            
            <div v-else class="space-y-2 mt-4">
              <h3 class="font-medium">Exceptions for {{ formatDate(selectedDate) }}</h3>
              <div v-for="exception in selectedDateExceptions" :key="exception.id" 
                   class="bg-gray-50 p-3 rounded flex justify-between items-center">
                <div>
                  <Badge :value="exception.is_available ? 'Available' : 'Unavailable'" 
                         :severity="exception.is_available ? 'success' : 'danger'" />
                  <span class="ml-2" v-if="exception.start_time && exception.end_time">
                    {{ formatTime(exception.start_time) }} - {{ formatTime(exception.end_time) }}
                  </span>
                  <span class="ml-2" v-else>All day</span>
                  <div v-if="exception.reason" class="text-sm text-gray-500 mt-1">
                    {{ exception.reason }}
                  </div>
                </div>
                <div class="flex gap-1">
                  <Button icon="pi pi-pencil" class="p-button-text p-button-sm" @click="editException(exception)" />
                  <Button icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger" 
                         @click="confirmDeleteException(exception)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Regular Availability Modal -->
    <Dialog v-model:visible="availabilityModalVisible" :header="modalMode === 'create' ? 'Add Availability' : 'Edit Availability'" 
            modal class="p-fluid" :style="{ width: '450px' }">
      <div class="grid grid-cols-1 gap-4">
        <div class="field">
          <label for="day_of_week">Day of Week*</label>
          <Dropdown id="day_of_week" v-model="availabilityForm.day_of_week" :options="daysOfWeek" 
                   optionLabel="label" optionValue="value" placeholder="Select a day" 
                   :class="{ 'p-invalid': availabilitySubmitted && availabilityForm.day_of_week === null }" />
          <small v-if="availabilitySubmitted && availabilityForm.day_of_week === null" class="p-error">
            Day of week is required.
          </small>
        </div>
        
        <div class="field">
          <label for="start_time">Start Time*</label>
          <Calendar id="start_time" v-model="availabilityForm.startDate" timeOnly hourFormat="24" 
                   :showTime="true" :showSeconds="false" 
                   :class="{ 'p-invalid': availabilitySubmitted && !availabilityForm.startDate }" />
          <small v-if="availabilitySubmitted && !availabilityForm.startDate" class="p-error">
            Start time is required.
          </small>
        </div>
        
        <div class="field">
          <label for="end_time">End Time*</label>
          <Calendar id="end_time" v-model="availabilityForm.endDate" timeOnly hourFormat="24" 
                   :showTime="true" :showSeconds="false" 
                   :class="{ 'p-invalid': availabilitySubmitted && !availabilityForm.endDate }" />
          <small v-if="availabilitySubmitted && !availabilityForm.endDate" class="p-error">
            End time is required.
          </small>
          <small v-if="availabilityForm.startDate && availabilityForm.endDate && 
                      availabilityForm.startDate >= availabilityForm.endDate" class="p-error">
            End time must be later than start time.
          </small>
        </div>
        
        <div class="field">
          <div class="flex align-items-center">
            <Checkbox id="is_available" v-model="availabilityForm.is_available" :binary="true" />
            <label for="is_available" class="ml-2">Available during this time</label>
          </div>
        </div>
        
        <div class="field">
          <div class="flex align-items-center">
            <Checkbox id="recurring" v-model="availabilityForm.recurring" :binary="true" />
            <label for="recurring" class="ml-2">Recurring weekly</label>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="closeAvailabilityModal" />
        <Button label="Save" icon="pi pi-check" @click="saveAvailability" />
      </template>
    </Dialog>
    
    <!-- Exception Modal -->
    <Dialog v-model:visible="exceptionModalVisible" :header="modalMode === 'create' ? 'Add Exception' : 'Edit Exception'" 
            modal class="p-fluid" :style="{ width: '450px' }">
      <div class="grid grid-cols-1 gap-4">
        <div class="field">
          <label for="exception_date">Date*</label>
          <Calendar id="exception_date" v-model="exceptionForm.exception_date" 
                   :class="{ 'p-invalid': exceptionSubmitted && !exceptionForm.exception_date }" />
          <small v-if="exceptionSubmitted && !exceptionForm.exception_date" class="p-error">
            Date is required.
          </small>
        </div>
        
        <div class="field">
          <div class="flex align-items-center">
            <Checkbox id="is_all_day" v-model="exceptionForm.is_all_day" :binary="true" />
            <label for="is_all_day" class="ml-2">All day exception</label>
          </div>
        </div>
        
        <div v-if="!exceptionForm.is_all_day" class="field">
          <label for="exception_start_time">Start Time*</label>
          <Calendar id="exception_start_time" v-model="exceptionForm.startDate" timeOnly hourFormat="24" 
                   :showTime="true" :showSeconds="false" 
                   :class="{ 'p-invalid': exceptionSubmitted && !exceptionForm.is_all_day && !exceptionForm.startDate }" />
          <small v-if="exceptionSubmitted && !exceptionForm.is_all_day && !exceptionForm.startDate" class="p-error">
            Start time is required.
          </small>
        </div>
        
        <div v-if="!exceptionForm.is_all_day" class="field">
          <label for="exception_end_time">End Time*</label>
          <Calendar id="exception_end_time" v-model="exceptionForm.endDate" timeOnly hourFormat="24" 
                   :showTime="true" :showSeconds="false" 
                   :class="{ 'p-invalid': exceptionSubmitted && !exceptionForm.is_all_day && !exceptionForm.endDate }" />
          <small v-if="exceptionSubmitted && !exceptionForm.is_all_day && !exceptionForm.endDate" class="p-error">
            End time is required.
          </small>
          <small v-if="!exceptionForm.is_all_day && exceptionForm.startDate && exceptionForm.endDate && 
                      exceptionForm.startDate >= exceptionForm.endDate" class="p-error">
            End time must be later than start time.
          </small>
        </div>
        
        <div class="field">
          <div class="flex align-items-center">
            <Checkbox id="exception_is_available" v-model="exceptionForm.is_available" :binary="true" />
            <label for="exception_is_available" class="ml-2">
              {{ exceptionForm.is_available ? 'Available' : 'Unavailable' }}
            </label>
          </div>
        </div>
        
        <div class="field">
          <label for="reason">Reason</label>
          <Textarea id="reason" v-model="exceptionForm.reason" rows="3" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="closeExceptionModal" />
        <Button label="Save" icon="pi pi-check" @click="saveException" />
      </template>
    </Dialog>
    
    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { useTeacherStore } from '~/stores/teacherStore'
import { useTeacherAvailabilityStore } from '~/stores/teacherAvailabilityStore'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import type { TeacherAvailability, TeacherAvailabilityException } from '~/types'

const route = useRoute()
const teacherId = route.params.id
const teacherStore = useTeacherStore()
const availabilityStore = useTeacherAvailabilityStore()
const confirm = useConfirm()
const toast = useToast()

// State
const teacher = ref(null)
const loading = computed(() => teacherStore.loading || availabilityStore.loading)
const regularAvailability = computed(() => availabilityStore.regularAvailability)
const exceptions = computed(() => availabilityStore.exceptions)
const selectedDate = ref(new Date())

const availabilityModalVisible = ref(false)
const exceptionModalVisible = ref(false)
const modalMode = ref('create')
const availabilitySubmitted = ref(false)
const exceptionSubmitted = ref(false)

// Forms
const availabilityForm = ref({
  id: null,
  day_of_week: null,
  startDate: null,
  endDate: null,
  is_available: true,
  recurring: true
})

const exceptionForm = ref({
  id: null,
  exception_date: null,
  is_all_day: false,
  startDate: null,
  endDate: null,
  is_available: false,
  reason: ''
})

// Constants
const daysOfWeek = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
]

// Computed
const selectedDateExceptions = computed(() => {
  if (!selectedDate.value) return []
  
  const dateString = formatDate(selectedDate.value)
  return exceptions.value.filter(e => e.exception_date === dateString)
})

const teacherAvailabilityTitle = computed(() => {
  if (teacher.value) {
    return `${teacher.value.first_name} ${teacher.value.last_name}'s Availability`
  }
  return 'Teacher Availability'
})

// Lifecycle
onMounted(async () => {
  await loadTeacher()
  await loadAvailability()
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

async function loadAvailability() {
  try {
    await availabilityStore.fetchTeacherAvailability(teacherId)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load availability information',
      life: 5000
    })
  }
}

function availabilityByDay(dayOfWeek) {
  return regularAvailability.value.filter(a => a.day_of_week === dayOfWeek)
}

function formatTime(timeString) {
  if (!timeString) return ''
  
  const date = new Date(`2000-01-01T${timeString}`)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date) {
  if (!date) return ''
  
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

function openAvailabilityModal() {
  availabilityForm.value = {
    id: null,
    day_of_week: null,
    startDate: null,
    endDate: null,
    is_available: true,
    recurring: true
  }
  modalMode.value = 'create'
  availabilitySubmitted.value = false
  availabilityModalVisible.value = true
}

function editAvailability(availability) {
  // Convert string times to Date objects for the Calendar component
  const startTime = new Date(`2000-01-01T${availability.start_time}`)
  const endTime = new Date(`2000-01-01T${availability.end_time}`)
  
  availabilityForm.value = {
    id: availability.id,
    day_of_week: availability.day_of_week,
    startDate: startTime,
    endDate: endTime,
    is_available: availability.is_available,
    recurring: availability.recurring
  }
  
  modalMode.value = 'edit'
  availabilitySubmitted.value = false
  availabilityModalVisible.value = true
}

function closeAvailabilityModal() {
  availabilityModalVisible.value = false
  availabilitySubmitted.value = false
}

async function saveAvailability() {
  availabilitySubmitted.value = true
  
  // Validate form
  if (!availabilityForm.value.day_of_week && availabilityForm.value.day_of_week !== 0 || 
      !availabilityForm.value.startDate || 
      !availabilityForm.value.endDate || 
      availabilityForm.value.startDate >= availabilityForm.value.endDate) {
    return
  }
  
  try {
    // Format times
    const startTime = availabilityForm.value.startDate.toTimeString().slice(0, 8)
    const endTime = availabilityForm.value.endDate.toTimeString().slice(0, 8)
    
    const availabilityData = {
      day_of_week: availabilityForm.value.day_of_week,
      start_time: startTime,
      end_time: endTime,
      is_available: availabilityForm.value.is_available,
      recurring: availabilityForm.value.recurring
    }
    
    if (modalMode.value === 'create') {
      await availabilityStore.createAvailability(availabilityData)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Availability added successfully',
        life: 3000
      })
    } else {
      await availabilityStore.updateAvailability(availabilityForm.value.id, availabilityData)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Availability updated successfully',
        life: 3000
      })
    }
    
    closeAvailabilityModal()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save availability',
      life: 5000
    })
  }
}

function confirmDeleteAvailability(availability) {
  confirm.require({
    message: 'Are you sure you want to delete this availability slot?',
    header: 'Delete Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteAvailability(availability.id),
    reject: () => {}
  })
}

async function deleteAvailability(id) {
  try {
    await availabilityStore.deleteAvailability(id)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Availability deleted successfully',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete availability',
      life: 5000
    })
  }
}

function onDateSelect() {
  // Called when a date is selected in the calendar
}

function openExceptionModal() {
  exceptionForm.value = {
    id: null,
    exception_date: selectedDate.value,
    is_all_day: false,
    startDate: null,
    endDate: null,
    is_available: false,
    reason: ''
  }
  modalMode.value = 'create'
  exceptionSubmitted.value = false
  exceptionModalVisible.value = true
}

function editException(exception) {
  const exceptionDate = new Date(exception.exception_date)
  
  // Convert string times to Date objects for the Calendar component
  let startDate = null
  let endDate = null
  
  if (exception.start_time && exception.end_time) {
    startDate = new Date(`2000-01-01T${exception.start_time}`)
    endDate = new Date(`2000-01-01T${exception.end_time}`)
  }
  
  exceptionForm.value = {
    id: exception.id,
    exception_date: exceptionDate,
    is_all_day: !exception.start_time || !exception.end_time,
    startDate,
    endDate,
    is_available: exception.is_available,
    reason: exception.reason || ''
  }
  
  modalMode.value = 'edit'
  exceptionSubmitted.value = false
  exceptionModalVisible.value = true
}

function closeExceptionModal() {
  exceptionModalVisible.value = false
  exceptionSubmitted.value = false
}

async function saveException() {
  exceptionSubmitted.value = true
  
  // Validate form
  if (!exceptionForm.value.exception_date || 
      (!exceptionForm.value.is_all_day && 
       (!exceptionForm.value.startDate || 
        !exceptionForm.value.endDate || 
        exceptionForm.value.startDate >= exceptionForm.value.endDate))) {
    return
  }
  
  try {
    // Format date
    const exceptionDate = formatDate(exceptionForm.value.exception_date)
    
    // Format times if not all day
    let startTime = null
    let endTime = null
    
    if (!exceptionForm.value.is_all_day) {
      startTime = exceptionForm.value.startDate.toTimeString().slice(0, 8)
      endTime = exceptionForm.value.endDate.toTimeString().slice(0, 8)
    }
    
    const exceptionData = {
      exception_date: exceptionDate,
      start_time: startTime,
      end_time: endTime,
      is_available: exceptionForm.value.is_available,
      reason: exceptionForm.value.reason
    }
    
    if (modalMode.value === 'create') {
      await availabilityStore.createException(exceptionData)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Exception added successfully',
        life: 3000
      })
    } else {
      await availabilityStore.updateException(exceptionForm.value.id, exceptionData)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Exception updated successfully',
        life: 3000
      })
    }
    
    closeExceptionModal()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save exception',
      life: 5000
    })
  }
}

function confirmDeleteException(exception) {
  confirm.require({
    message: 'Are you sure you want to delete this exception?',
    header: 'Delete Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteException(exception.id),
    reject: () => {}
  })
}

async function deleteException(id) {
  try {
    await availabilityStore.deleteException(id)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Exception deleted successfully',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete exception',
      life: 5000
    })
  }
}
</script>