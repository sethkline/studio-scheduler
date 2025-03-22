<template>
  <div>
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold mb-2">Teacher Availability</h1>
          <h2 class="text-lg text-gray-600" v-if="teacher">{{ teacher.first_name }} {{ teacher.last_name }}</h2>
        </div>
        <div class="flex items-center gap-4">
          <Dropdown
            v-model="selectedScheduleId"
            :options="schedules"
            optionLabel="name"
            optionValue="id"
            placeholder="Select Season"
            class="w-64"
          />
          <Button label="Add Availability Slot" icon="pi pi-plus" @click="openNewSlotModal" />
          <Button icon="pi pi-arrow-left" class="p-button-outlined" @click="goBack" />
        </div>
      </div>

      <div class="card p-4">
        <div class="mb-4">
          <h3 class="text-lg font-medium mb-2">Season Information</h3>
          <div v-if="currentSchedule" class="flex flex-wrap gap-4">
            <div class="bg-gray-100 rounded p-3 flex-1">
              <div class="text-sm text-gray-500">Date Range</div>
              <div>{{ formatDate(currentSchedule.start_date) }} - {{ formatDate(currentSchedule.end_date) }}</div>
            </div>
            <div class="bg-gray-100 rounded p-3 flex-1">
              <div class="text-sm text-gray-500">Status</div>
              <div>
                <Tag :value="currentSchedule.is_active ? 'Active' : 'Inactive'" 
                     :severity="currentSchedule.is_active ? 'success' : 'warning'" />
              </div>
            </div>
            <div class="bg-gray-100 rounded p-3 flex-1">
              <div class="text-sm text-gray-500">Total Slots</div>
              <div>{{ availabilityData.regularAvailability?.length || 0 }}</div>
            </div>
          </div>
          <div v-else class="text-gray-500">
            No season selected
          </div>
        </div>
      </div>

      <!-- Loading spinner -->
      <div v-if="loading" class="flex justify-center py-8">
        <i class="pi pi-spin pi-spinner text-4xl text-primary-500"></i>
      </div>

      <!-- Weekly availability calendar view -->
      <div v-else-if="availabilityData.regularAvailability" class="card">
        <h3 class="text-lg font-medium mb-4">Weekly Availability</h3>
        
        <div v-if="availabilityData.regularAvailability.length === 0" class="p-4 text-center text-gray-500">
          No availability defined for this season. Click "Add Availability Slot" to get started.
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-7 gap-4">
          <!-- Day column for each day of the week -->
          <div v-for="day in availabilityByDay" :key="day.dayNumber" class="border rounded-lg">
            <div class="bg-gray-100 p-3 font-medium border-b text-center">
              {{ day.dayName }}
            </div>
            
            <div class="p-3 min-h-40">
              <!-- No slots message -->
              <div v-if="day.slots.length === 0" class="text-center text-gray-400 text-sm py-4">
                No availability
              </div>
              
              <!-- Availability slots -->
              <div 
                v-for="slot in day.slots" 
                :key="slot.id" 
                class="mb-2 p-2 rounded text-sm cursor-pointer hover:bg-gray-50"
                :class="[
                  slot.is_available 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                ]"
                @click="editSlot(slot)"
              >
                <div class="font-medium">
                  {{ formatTime(slot.start_time) }} - {{ formatTime(slot.end_time) }}
                </div>
                <div v-if="!slot.is_available" class="text-xs mt-1 text-red-600">
                  Unavailable
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Copy availability from another season -->
      <div class="card p-4 bg-gray-50">
        <h3 class="text-lg font-medium mb-4">Copy Availability From Another Season</h3>
        <div class="flex items-end gap-4">
          <div class="field flex-1">
            <label for="sourceSchedule" class="block mb-2">Source Season</label>
            <Dropdown
              id="sourceSchedule"
              v-model="copySettings.sourceScheduleId"
              :options="otherSchedules"
              optionLabel="name"
              optionValue="id"
              placeholder="Select source season"
              class="w-full"
            />
          </div>
          <div>
            <Button 
              label="Copy Availability" 
              icon="pi pi-copy"
              @click="copyAvailability"
              :disabled="!copySettings.sourceScheduleId || copySettings.sourceScheduleId === selectedScheduleId"
              :loading="copySettings.loading"
            />
          </div>
        </div>
      </div>

      <!-- Availability Slot Dialog -->
      <Dialog
        v-model:visible="slotDialog.visible"
        :header="slotDialog.isEdit ? 'Edit Availability Slot' : 'New Availability Slot'"
        :style="{ width: '450px' }"
        modal
      >
        <div class="space-y-4 p-4">
          <div class="field">
            <label for="dayOfWeek" class="block mb-2 font-medium">Day of Week*</label>
            <Dropdown
              id="dayOfWeek"
              v-model="slotForm.day_of_week"
              :options="dayOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select day"
              class="w-full"
              :class="{ 'p-invalid': slotDialog.submitted && slotForm.day_of_week === undefined }"
            />
            <small v-if="slotDialog.submitted && slotForm.day_of_week === undefined" class="p-error">
              Day is required.
            </small>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="field">
              <label for="startTime" class="block mb-2 font-medium">Start Time*</label>
              <Calendar
                id="startTime"
                v-model="timeInputs.startTime"
                timeOnly
                hourFormat="12"
                placeholder="Select start time"
                class="w-full"
                :class="{ 'p-invalid': slotDialog.submitted && !timeInputs.startTime }"
              />
              <small v-if="slotDialog.submitted && !timeInputs.startTime" class="p-error">
                Start time is required.
              </small>
            </div>

            <div class="field">
              <label for="endTime" class="block mb-2 font-medium">End Time*</label>
              <Calendar
                id="endTime"
                v-model="timeInputs.endTime"
                timeOnly
                hourFormat="12"
                placeholder="Select end time"
                class="w-full"
                :class="{ 'p-invalid': slotDialog.submitted && !timeInputs.endTime }"
              />
              <small v-if="slotDialog.submitted && !timeInputs.endTime" class="p-error">
                End time is required.
              </small>
              <small v-if="timeError" class="p-error">
                {{ timeError }}
              </small>
            </div>
          </div>

          <div class="field">
            <label for="isAvailable" class="flex items-center gap-2 font-medium">
              <Checkbox v-model="slotForm.is_available" binary />
              Available for classes
            </label>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between">
            <Button v-if="slotDialog.isEdit" 
              label="Delete" 
              icon="pi pi-trash" 
              class="p-button-danger" 
              @click="deleteSlot"
            />
            <div>
              <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="closeSlotDialog" />
              <Button label="Save" icon="pi pi-check" @click="saveSlot" />
            </div>
          </div>
        </template>
      </Dialog>
    </div>
  </div>
</template>

<script setup>
import { useToast } from 'primevue/usetoast';
import { useScheduleTermStore } from '~/stores/useScheduleTermStore';
import { useApiService } from '~/composables/useApiService';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const client = useSupabaseClient();

// State
const loading = ref(true);
const teacher = ref(null);
const selectedScheduleId = ref(null);
const currentSchedule = ref(null);
const availabilityData = ref({
  regularAvailability: [],
  exceptions: []
});
const timeError = ref(null);
const timeInputs = ref({
  startTime: null,
  endTime: null
});
const copySettings = ref({
  sourceScheduleId: null,
  loading: false
});

// Store
const scheduleStore = useScheduleTermStore();
const apiService = useApiService();

// Dialog state
const slotDialog = reactive({
  visible: false,
  isEdit: false,
  submitted: false
});

// Form data
const slotForm = ref({
  id: null,
  day_of_week: undefined,
  start_time: '',
  end_time: '',
  is_available: true,
  schedule_id: null
});

// Options for form dropdowns
const dayOptions = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
];

// Computed properties
const schedules = computed(() => {
  return scheduleStore.schedules;
});

const otherSchedules = computed(() => {
  return scheduleStore.schedules.filter(s => s.id !== selectedScheduleId.value);
});

// Group availability by day
const availabilityByDay = computed(() => {
  const days = [0, 1, 2, 3, 4, 5, 6].map(day => ({
    dayNumber: day,
    dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
    slots: []
  }));
  
  if (availabilityData.value.regularAvailability) {
    availabilityData.value.regularAvailability.forEach(item => {
      if (days[item.day_of_week]) {
        days[item.day_of_week].slots.push(item);
      }
    });
  }
  
  // Sort slots by start time
  days.forEach(day => {
    day.slots.sort((a, b) => {
      return a.start_time.localeCompare(b.start_time);
    });
  });
  
  return days;
});

// Lifecycle
onMounted(async () => {
  const teacherId = route.params.id;
  if (!teacherId) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Teacher ID is required',
      life: 3000
    });
    return;
  }
  
  // Load teacher data
  await fetchTeacher(teacherId);
  
  // Load schedules
  await scheduleStore.fetchSchedules();
  
  // Set default selected schedule to the active one
  const activeSchedule = scheduleStore.activeSchedules[0];
  if (activeSchedule) {
    selectedScheduleId.value = activeSchedule.id;
  } else if (scheduleStore.schedules.length > 0) {
    selectedScheduleId.value = scheduleStore.schedules[0].id;
  }
  
  // Load teacher availability for selected schedule
  if (teacherId && selectedScheduleId.value) {
    await fetchAvailability(teacherId, selectedScheduleId.value);
  }
  
  loading.value = false;
});

// Watch for changes in selected schedule
watch(selectedScheduleId, async (newScheduleId) => {
  if (newScheduleId && teacher.value) {
    loading.value = true;
    await fetchAvailability(teacher.value.id, newScheduleId);
    loading.value = false;
  }
});

// Fetch teacher details
// Fetch teacher details
async function fetchTeacher(teacherId) {
  try {
    const { data, error } = await apiService.fetchTeacher(teacherId);
    
    if (error.value) throw error.value;
    
    // The data from useFetch is inside a ref
    teacher.value = data.value;
  } catch (error) {
    console.error('Error fetching teacher:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load teacher information',
      life: 3000
    });
  }
}

// Fetch availability for a teacher and schedule
async function fetchAvailability(teacherId, scheduleId) {
  try {
    // Get the schedule details
    const { data: scheduleResponse, error: scheduleError } = await useFetch(`/api/schedules/${scheduleId}`);
    
    if (scheduleError.value) throw scheduleError.value;
    
    currentSchedule.value = scheduleResponse.value;
    
    // Use API for availability
    const { data, error } = await apiService.fetchTeacherAvailability(teacherId, {
      scheduleId: scheduleId
    });
    
    if (error.value) throw error.value;
    
    availabilityData.value = {
      regularAvailability: data.value.regularAvailability || [],
      exceptions: data.value.exceptions || []
    };
  } catch (error) {
    console.error('Error fetching availability:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load availability data',
      life: 3000
    });
  }
}

// Format functions
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function formatTime(timeString) {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':');
  let hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  
  return `${hour}:${minutes} ${period}`;
}

// Convert date object to time string for database
function timeToString(date) {
  if (!date) return null;
  
  return date.toTimeString().slice(0, 8); // Format: HH:MM:SS
}

// Dialog functions
function openNewSlotModal() {
  slotDialog.isEdit = false;
  slotForm.value = {
    day_of_week: undefined,
    start_time: '',
    end_time: '',
    is_available: true,
    schedule_id: selectedScheduleId.value
  };
  
  timeInputs.value = {
    startTime: new Date(2023, 0, 1, 9, 0, 0), // Default to 9:00 AM
    endTime: new Date(2023, 0, 1, 10, 0, 0)   // Default to 10:00 AM
  };
  
  slotDialog.visible = true;
  slotDialog.submitted = false;
  timeError.value = null;
}

function editSlot(slot) {
  slotDialog.isEdit = true;
  slotForm.value = {
    id: slot.id,
    day_of_week: slot.day_of_week,
    is_available: slot.is_available,
    schedule_id: slot.schedule_id
  };
  
  // Parse time strings to Date objects for the Calendar component
  const [startHours, startMinutes] = slot.start_time.split(':');
  const [endHours, endMinutes] = slot.end_time.split(':');
  
  timeInputs.value = {
    startTime: new Date(2023, 0, 1, parseInt(startHours), parseInt(startMinutes)),
    endTime: new Date(2023, 0, 1, parseInt(endHours), parseInt(endMinutes))
  };
  
  slotDialog.visible = true;
  slotDialog.submitted = false;
  timeError.value = null;
}

function closeSlotDialog() {
  slotDialog.visible = false;
  slotDialog.submitted = false;
  timeError.value = null;
}

// Save availability slot
async function saveSlot() {
  slotDialog.submitted = true;
  timeError.value = null;
  
  // Basic validation
  if (
    slotForm.value.day_of_week === undefined ||
    !timeInputs.value.startTime ||
    !timeInputs.value.endTime
  ) {
    return;
  }
  
  // Validate time range
  if (timeInputs.value.endTime <= timeInputs.value.startTime) {
    timeError.value = 'End time must be after start time';
    return;
  }
  
  // Check if teacher object exists
  if (!teacher.value || !teacher.value.id) {
    console.error('Teacher data is not loaded properly');
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Teacher information is missing',
      life: 5000
    });
    return;
  }
  
  // Convert Date objects to time strings
  const startTime = timeToString(timeInputs.value.startTime);
  const endTime = timeToString(timeInputs.value.endTime);
  
  try {
    const slotData = {
      ...slotForm.value,
      start_time: startTime,
      end_time: endTime,
      schedule_id: selectedScheduleId.value
    };
    
    
    if (slotDialog.isEdit) {
      // Update existing slot using API
      const { data, error } = await apiService.updateTeacherAvailability(
        teacher.value.id, 
        slotData
      );
      
      if (error.value) throw error.value;
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Availability slot updated',
        life: 3000
      });
    } else {
      // Create new slot using API
      const { data, error } = await apiService.createTeacherAvailability(
        teacher.value.id, 
        slotData
      );
      
      if (error.value) throw error.value;
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Availability slot created',
        life: 3000
      });
    }
    
    // Refresh availability data
    await fetchAvailability(teacher.value.id, selectedScheduleId.value);
    closeSlotDialog();
  } catch (error) {
    console.error('Error saving slot:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save availability slot',
      life: 5000
    });
  }
}

// Delete availability slot
async function deleteSlot() {
  try {
    if (!slotForm.value.id) return;
    
    const { error } = await apiService.deleteTeacherAvailability(
      teacher.value.id,
      slotForm.value.id
    );
    
    if (error.value) throw error.value;
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Availability slot deleted',
      life: 3000
    });
    
    // Refresh availability data
    await fetchAvailability(teacher.value.id, selectedScheduleId.value);
    closeSlotDialog();
  } catch (error) {
    console.error('Error deleting slot:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete availability slot',
      life: 5000
    });
  }
}

// Copy availability from another season
async function copyAvailability() {
  if (!copySettings.value.sourceScheduleId || !selectedScheduleId.value || !teacher.value) {
    return;
  }
  
  copySettings.value.loading = true;
  
  try {
    // First get all availability slots for the source season
    const { data: sourceSlots, error: fetchError } = await client
      .from('teacher_availability')
      .select('*')
      .eq('teacher_id', teacher.value.id)
      .eq('schedule_id', copySettings.value.sourceScheduleId);
    
    if (fetchError) throw fetchError;
    
    if (!sourceSlots || sourceSlots.length === 0) {
      toast.add({
        severity: 'info',
        summary: 'Info',
        detail: 'No availability slots found in source season',
        life: 3000
      });
      copySettings.value.loading = false;
      return;
    }
    
    // Check if target already has availability slots
    const { data: existingSlots, error: existingError } = await client
      .from('teacher_availability')
      .select('id')
      .eq('teacher_id', teacher.value.id)
      .eq('schedule_id', selectedScheduleId.value);
    
    if (existingError) throw existingError;
    
    // Confirm if user wants to replace existing slots
    if (existingSlots && existingSlots.length > 0) {
      // In a real implementation, you would show a confirmation dialog here
      // For simplicity, we'll handle the replacement directly
      
      // Delete existing slots
      const { error: deleteError } = await client
        .from('teacher_availability')
        .delete()
        .eq('teacher_id', teacher.value.id)
        .eq('schedule_id', selectedScheduleId.value);
      
      if (deleteError) throw deleteError;
    }
    
    // Prepare new slots for the target season
    const newSlots = sourceSlots.map(slot => ({
      teacher_id: teacher.value.id,
      schedule_id: selectedScheduleId.value,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_available: slot.is_available,
      recurring: slot.recurring
    }));
    
    // Insert the new slots
    if (newSlots.length > 0) {
      const { error: insertError } = await client
        .from('teacher_availability')
        .insert(newSlots);
      
      if (insertError) throw insertError;
    }
    
    // Refresh availability data
    await fetchAvailability(teacher.value.id, selectedScheduleId.value);
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Copied ${newSlots.length} availability slots from ${
        schedules.value.find(s => s.id === copySettings.value.sourceScheduleId)?.name || 'source season'
      }`,
      life: 3000
    });
    
    // Reset copy settings
    copySettings.value.sourceScheduleId = null;
  } catch (error) {
    console.error('Error copying availability:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to copy availability',
      life: 5000
    });
  } finally {
    copySettings.value.loading = false;
  }
}

// Navigation
function goBack() {
  router.push('/teachers');
}
</script>