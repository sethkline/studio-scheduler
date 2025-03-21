<template>
  <div class="flex flex-col h-full">
    <!-- Header with schedule info and controls -->
    <div class="mb-4">
      <div v-if="schedule" class="flex justify-between items-center mb-4">
        <div>
          <h1 class="text-2xl font-bold">{{ schedule.name }} Schedule Builder</h1>
          <p class="text-gray-600">{{ formatDate(schedule.start_date) }} - {{ formatDate(schedule.end_date) }}</p>
        </div>
        <div class="flex space-x-3">
          <div class="flex items-center">
            <Dropdown
              v-model="selectedLocationId"
              :options="locationOptions"
              optionLabel="name"
              optionValue="id"
              placeholder="All Locations"
              class="w-40"
            />
          </div>

          <Button
            label="Add Class"
            icon="pi pi-plus"
            @click="openAddClassDialog"
            :disabled="!hasPermission || !schedule"
          />

          <Button
            label="Save Schedule"
            icon="pi pi-save"
            :loading="isSaving"
            @click="saveSchedule"
            :disabled="!hasPermission || !schedule || !hasChanges"
          />
        </div>
      </div>

      <div v-if="loading" class="flex justify-center p-6">
        <i class="pi pi-spin pi-spinner text-3xl"></i>
      </div>
    </div>

    <!-- Calendar grid -->
    <div v-if="!loading && schedule" class="flex-grow">
      <FullCalendar ref="fullCalendar" :options="calendarOptions" class="h-full" />
    </div>

    <!-- Add/Edit Class Dialog -->
    <Dialog
      v-model:visible="classDialog.visible"
      :style="{ width: '600px' }"
      :header="classDialog.isEdit ? 'Edit Scheduled Class' : 'Add Class to Schedule'"
      :modal="true"
      :closable="true"
    >
      <div class="space-y-4">
        <div class="field">
          <label for="classInstance" class="font-medium">Class*</label>
          <Dropdown
            id="classInstance"
            v-model="classDialog.formData.class_instance_id"
            :options="classInstanceOptions"
            optionLabel="name"
            optionValue="id"
            placeholder="Select a class"
            class="w-full"
            :class="{ 'p-invalid': classDialog.submitted && !classDialog.formData.class_instance_id }"
            :filter="true"
            @change="handleClassInstanceChange"
          >
            <template #option="slotProps">
              <div class="flex items-center">
                <span
                  class="inline-block w-3 h-3 rounded-full mr-2"
                  :style="{ backgroundColor: getClassColor(slotProps.option) }"
                ></span>
                <div>
                  <div>{{ slotProps.option.name }}</div>
                  <div class="text-xs text-gray-500">
                    {{ slotProps.option.dance_style?.name || 'No style' }} | {{ slotProps.option.duration }} min
                  </div>
                </div>
              </div>
            </template>
          </Dropdown>
          <small v-if="classDialog.submitted && !classDialog.formData.class_instance_id" class="p-error">
            Class is required.
          </small>
        </div>

        <div class="field">
          <label for="dayOfWeek" class="font-medium">Day of Week*</label>
          <Dropdown
            id="dayOfWeek"
            v-model="classDialog.formData.day_of_week"
            :options="dayOfWeekOptions"
            optionLabel="name"
            optionValue="value"
            placeholder="Select day"
            class="w-full"
            :class="{ 'p-invalid': classDialog.submitted && classDialog.formData.day_of_week === null }"
          />
          <small v-if="classDialog.submitted && classDialog.formData.day_of_week === null" class="p-error">
            Day is required.
          </small>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label for="startTime" class="font-medium">Start Time*</label>
            <Calendar
              id="startTime"
              v-model="classDialog.formData.start_time"
              timeOnly
              hourFormat="12"
              class="w-full"
              :class="{ 'p-invalid': classDialog.submitted && !classDialog.formData.start_time }"
              @update:modelValue="updateEndTime"
            />
            <small v-if="classDialog.submitted && !classDialog.formData.start_time" class="p-error">
              Start time is required.
            </small>
          </div>

          <div class="field">
            <label for="endTime" class="font-medium">End Time*</label>
            <Calendar
              id="endTime"
              v-model="classDialog.formData.end_time"
              timeOnly
              hourFormat="12"
              class="w-full"
              :class="{ 'p-invalid': classDialog.submitted && !classDialog.formData.end_time }"
              :minDate="classDialog.formData.start_time"
              disabled
            />
            <small v-if="classDialog.submitted && !classDialog.formData.end_time" class="p-error">
              End time is required.
            </small>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label for="teacherId" class="font-medium">Teacher</label>
            <Dropdown
              id="teacherId"
              v-model="classDialog.formData.teacher_id"
              :options="teacherOptions"
              optionLabel="name"
              optionValue="id"
              placeholder="Select a teacher"
              class="w-full"
              :filter="true"
            />
          </div>

          <div class="field">
            <label for="studioId" class="font-medium">Studio/Room*</label>

            <Dropdown
              id="studioId"
              v-model="classDialog.formData.studio_id"
              :options="studioOptions"
              optionLabel="name"
              optionValue="id"
              placeholder="Select a studio"
              class="w-full"
              :class="{ 'p-invalid': classDialog.submitted && !classDialog.formData.studio_id }"
              :filter="true"
            />
            <small v-if="classDialog.submitted && !classDialog.formData.studio_id" class="p-error">
              Studio is required.
            </small>
          </div>
        </div>

        <div v-if="conflicts.length > 0" class="bg-red-50 border border-red-200 rounded p-3 mt-4">
          <h4 class="text-red-700 font-medium mb-2">Scheduling Conflicts:</h4>
          <ul class="list-disc pl-5 text-red-600 text-sm">
            <li v-for="(conflict, index) in conflicts" :key="index">
              {{ conflict.message }}
            </li>
          </ul>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <Button v-if="classDialog.isEdit" 
            label="Delete" 
            icon="pi pi-trash" 
            class="p-button-danger" 
            @click="confirmDeleteFromDialog" />
          </div>
          <div class="flex justify-end w-full">
          <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="closeClassDialog" />
          <Button label="Save" icon="pi pi-check" class="p-button-primary" @click="saveClassSchedule" />
          </div>
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog></ConfirmDialog>

    <!-- Context Menu for class items -->
    <ContextMenu id="classContextMenu" ref="classContextMenu" :model="contextMenuItems" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useScheduleTermStore } from '~/stores/useScheduleTermStore';
import { useScheduleStore } from '~/stores/schedule';
import { useAuthStore } from '~/stores/auth';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import FullCalendar from '@fullcalendar/vue3';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useScheduleManager } from '~/composables/useScheduleManager';
import type { ScheduleClass } from '~/types';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const authStore = useAuthStore();
const scheduleTermStore = useScheduleTermStore();
const scheduleStore = useScheduleStore();
const { createDraggableItem, handleItemDrop, checkConflicts } = useScheduleManager();

// Permissions check
const hasPermission = computed(() => {
  // TODO change this back after roles created
  return true;
  // return authStore.hasRole(['admin', 'staff']);
});

// State
const loading = ref(true);
const isSaving = ref(false);
const hasChanges = ref(false);
const schedule = ref(null);
const classInstances = ref([]);
const teachers = ref([]);
const studios = ref([]);
const locations = ref([]);
const events = ref([]);
const conflicts = ref([]);
const selectedLocationId = ref(null);
const fullCalendar = ref(null);
const selectedEvent = ref(null);

// Context menu
const contextMenuItems = ref([
  {
    label: 'Edit',
    icon: 'pi pi-pencil',
    command: () => {
      if (selectedEvent.value) {
        editScheduledClass(selectedEvent.value);
      }
    }
  },
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => {
      if (selectedEvent.value) {
        deleteScheduledClass(selectedEvent.value);
      }
    }
  }
]);

// Add/Edit Class Dialog
const classDialog = reactive({
  visible: false,
  isEdit: false,
  submitted: false,
  formData: {
    id: null,
    schedule_id: null,
    class_instance_id: null,
    day_of_week: null,
    start_time: null,
    end_time: null,
    teacher_id: null,
    studio_id: null
  },
  originalData: null
});

// Options for form dropdowns
const dayOfWeekOptions = [
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
  { name: 'Sunday', value: 0 }
];

// Computed properties for dropdown options
const classInstanceOptions = computed(() => {
  return classInstances.value.map((cls) => ({
    id: cls.id,
    name: cls.name || cls.class_definition?.name || 'Unnamed Class',
    dance_style: cls.class_definition?.dance_style,
    duration: cls.class_definition?.duration || 60
  }));
});

const teacherOptions = computed(() => {
  return teachers.value.map((teacher) => ({
    id: teacher.id,
    name: `${teacher.first_name} ${teacher.last_name}`
  }));
});

const studioOptions = computed(() => {
  if (selectedLocationId.value) {
    return studios.value
      .filter((studio) => studio.location_id === selectedLocationId.value)
      .map((studio) => ({
        id: studio.id,
        name: studio.name
      }));
  }
  return studios.value.map((studio) => ({
    id: studio.id,
    name: studio.name
  }));
});

const locationOptions = computed(() => {
  return [
    { id: null, name: 'All Locations' },
    ...locations.value.map((location) => ({
      id: location.id,
      name: location.name
    }))
  ];
});

// Function to generate tooltip content for an event
function getTooltipContent(event) {
  const eventData = event.extendedProps;
  const dayName = dayOfWeekOptions.find((d) => d.value === eventData.dayOfWeek)?.name || '';
  const formattedStart = formatTimeForDisplay(event.start);
  const formattedEnd = formatTimeForDisplay(event.end);

  return `
    <div class="p-2">
      <div class="font-bold">${event.title}</div>
      <div>${eventData.teacherName || 'No teacher'}</div>
      <div>${eventData.danceStyle || 'No style'}</div>
      <div>${dayName} ${formattedStart} - ${formattedEnd}</div>
      <div>${eventData.studioName || 'No studio'}</div>
    </div>
  `;
}

// Calendar configuration
const calendarOptions = computed(() => ({
  plugins: [timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  headerToolbar: {
    left: '',
    center: '',
    right: ''
  },
  allDaySlot: false,
  slotMinTime: '08:00:00',
  slotMaxTime: '22:00:00',
  weekends: true,
  dayHeaderFormat: { weekday: 'long' },
  editable: hasPermission.value,
  droppable: true,
  eventDurationEditable: false,
  eventResize: onEventResize,
  eventDrop: onEventDrop,
  eventClick: onEventClick,
  eventDidMount: (info) => {
    // Add PrimeVue tooltip to each event
    const tooltip = {
      value: getTooltipContent(info.event),
      showDelay: 200,
      hideDelay: 100
    };

    // Use the v-tooltip directive programmatically
    if (typeof window !== 'undefined') {
      // const tooltipDirective = app.__VUE_DEVTOOLS_GLOBAL_HOOK__?.plugins?.vTooltip?.directive;
      const tooltipDirective = null;

      if (tooltipDirective) {
        tooltipDirective.mounted(info.el, {
          value: tooltip,
          modifiers: { top: true }
        });
      } else {
        // Fallback to a simpler title attribute if directive isn't available
        info.el.setAttribute(
          'title',
          info.event.title + ' - ' + (info.event.extendedProps.teacherName || 'No teacher')
        );
      }
    }
  },
  eventContent: (eventInfo) => {
    return {
      html: `
        <div class="fc-event-main-content">
          <div class="fc-event-title font-semibold">${eventInfo.event.title}</div>
          <div class="text-xs">${eventInfo.event.extendedProps.teacherName || 'No teacher'}</div>
          <div class="text-xs">${eventInfo.event.extendedProps.studioName || 'No studio'}</div>
        </div>
      `
    };
  },
  eventContextMenu: onContextMenu,
  events: events.value,
  height: '100%',
  expandRows: true,
  stickyHeaderDates: true,
  slotDuration: '00:15:00',
  slotLabelInterval: '01:00:00',
  slotLabelFormat: {
    hour: 'numeric',
    minute: '2-digit',
    omitZeroMinute: true,
    meridiem: 'short'
  }
}));

// Watch for location filter changes
watch(selectedLocationId, () => {
  filterEventsByLocation();
});

// Load data on component mount
onMounted(async () => {
  const scheduleId = route.params.id;

  try {
    loading.value = true;

    // Fetch schedule term details
    await scheduleTermStore.fetchSchedule(scheduleId);
    schedule.value = scheduleTermStore.currentSchedule;

    if (!schedule.value) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Schedule not found',
        life: 3000
      });
      return;
    }

    // Fetch schedule classes
    await scheduleStore.fetchCurrentSchedule(scheduleId);

    // Fetch reference data (class instances, teachers, studios)
    await fetchReferenceData();

    // Create calendar events from schedule classes

    // events.value = testEvents;
    createCalendarEvents();
    console.log('Events:', events.value);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load schedule data',
      life: 5000
    });
  } finally {
    loading.value = false;
  }
});

function handleClassInstanceChange(event) {
  const selectedClassId = event.value;
  if (!selectedClassId) return;

  // Find the selected class instance
  const classInstance = classInstances.value.find((cls) => cls.id === selectedClassId);
  if (!classInstance) return;

  // Set the teacher if available from class instance
  if (classInstance.teacher_id) {
    classDialog.formData.teacher_id = classInstance.teacher_id;
    console.log('Set teacher to:', classInstance.teacher_id);
  }

  // Update the end time based on class duration
  updateEndTime();
}

// Improve the updateEndTime function
function updateEndTime() {
  if (!classDialog.formData.start_time || !classDialog.formData.class_instance_id) return;

  const classInstance = classInstances.value.find((c) => c.id === classDialog.formData.class_instance_id);
  // Check both class_definition.duration and a direct duration property
  const duration = classInstance?.class_definition?.duration || classInstance?.duration || 60; // Default to 60 minutes if no duration found

  console.log('Class duration:', duration, 'minutes');

  const startTime = new Date(classDialog.formData.start_time);
  const endTime = new Date(startTime);
  endTime.setMinutes(startTime.getMinutes() + duration);

  classDialog.formData.end_time = endTime;
  console.log('End time set to:', endTime);
}

async function fetchReferenceData() {
  console.log('Fetching reference data...');
  const client = useSupabaseClient();

  try {
    // Fetch class instances
    // This part may need adjustment based on your actual data structure
    const { data: classInstanceData, error: classError } = await client
      .from('class_instances')
      .select(
        `
        id,
        name,
        teacher_id,
        class_definition_id (
          id,
          name,
          duration,
          dance_style_id (
            id,
            name,
            color
          )
        )
      `
      )
      .eq('status', 'active');

    if (classError) {
      console.error('Error fetching class instances:', classError);
      throw classError;
    }

    classInstances.value = classInstanceData || [];
    console.log('Class instances loaded:', classInstances.value);

    // Fetch teachers using the API endpoint
    const teacherResponse = await useFetch('/api/teachers', {
      params: {
        limit: 100
      }
    });

    console.log('Teacher API response:', teacherResponse);

    if (teacherResponse.error.value) {
      console.error('Error fetching teachers:', teacherResponse.error.value);
      throw teacherResponse.error.value;
    }

    // Correctly assign the teachers data to your ref
    teachers.value = teacherResponse.data.value?.teachers || [];
    console.log('Teachers loaded:', teachers.value);

    // Fetch locations
    const { data: locationData, error: locationError } = await client
      .from('studio_locations')
      .select('id, name, is_active')
      .eq('is_active', true);

    console.log('Location query result:', locationData, locationError);

    if (locationError) {
      console.error('Error fetching locations:', locationError);
      throw locationError;
    }

    locations.value = locationData || [];
    console.log('Locations loaded:', locations.value);

    // Fetch studios
    const { data: studioData, error: studioError } = await client
      .from('studio_rooms')
      .select('id, name, location_id, is_active')
      .eq('is_active', true);

    if (studioError) {
      console.error('Error fetching studios:', studioError);
      throw studioError;
    }

    studios.value = studioData || [];
    console.log('Studios loaded:', studios.value);
  } catch (error) {
    console.error('Error in fetchReferenceData:', error);
    throw error;
  }
}

// Filter events by selected location
function filterEventsByLocation() {
  if (!selectedLocationId.value) {
    // If no location filter, show all events
    createCalendarEvents();
    return;
  }

  // Filter events by studio's location
  const filteredItems = scheduleStore.scheduleItems.filter((item) => {
    const studio = studios.value.find((s) => s.id === item.studioId);
    return studio && studio.location_id === selectedLocationId.value;
  });

  events.value = filteredItems.map((item) => createDraggableItem(item));
}

// Handle event resize on calendar
async function onEventResize(info) {
  if (!hasPermission.value) {
    info.revert();
    return;
  }

  hasChanges.value = true;
  const event = info.event;
  const id = event.id;
  const newEndTime = formatTime(event.end);

  // Update the local event data only - will be saved on Save Schedule button click
  const index = scheduleStore.scheduleItems.findIndex((item) => item.id === id);
  if (index !== -1) {
    scheduleStore.scheduleItems[index].endTime = newEndTime;
  }
}

// Handle event drag and drop on calendar
async function onEventDrop(info) {
  if (!hasPermission.value) {
    info.revert();
    return;
  }

  hasChanges.value = true;
  const event = info.event;
  const id = event.id;

  // Calculate new day and times
  const newDayOfWeek = event.start.getDay();
  const newStartTime = formatTime(event.start);
  const newEndTime = formatTime(event.end);

  // Update the local event data only - will be saved on Save Schedule button click
  const index = scheduleStore.scheduleItems.findIndex((item) => item.id === id);
  if (index !== -1) {
    scheduleStore.scheduleItems[index].dayOfWeek = newDayOfWeek;
    scheduleStore.scheduleItems[index].startTime = newStartTime;
    scheduleStore.scheduleItems[index].endTime = newEndTime;
  }
}

// Handle event click (for editing)
function onEventClick(info) {
  if (!hasPermission.value) return;

  const eventId = info.event.id;
  const scheduleItem = scheduleStore.scheduleItems.find((item) => item.id === eventId);

  if (scheduleItem) {
    editScheduledClass(scheduleItem);
  }
}

// Open the add class dialog
function openAddClassDialog() {
  classDialog.isEdit = false;
  classDialog.submitted = false;
  conflicts.value = [];

  // Reset form data
  classDialog.formData = {
    id: null,
    schedule_id: schedule.value.id,
    class_instance_id: null,
    day_of_week: 1, // Default to Monday
    start_time: null,
    end_time: null,
    teacher_id: null,
    studio_id: null
  };

  classDialog.visible = true;
}

// Edit a scheduled class
function editScheduledClass(scheduleItem) {
  classDialog.isEdit = true;
  classDialog.submitted = false;
  conflicts.value = [];

  // Convert times to Date objects for the time picker
  const startTime = new Date(`2000-01-01T${scheduleItem.startTime}`);
  const endTime = new Date(`2000-01-01T${scheduleItem.endTime}`);

  // Set form data
  classDialog.formData = {
    id: scheduleItem.id,
    schedule_id: schedule.value.id,
    class_instance_id: scheduleItem.classInstanceId,
    day_of_week: scheduleItem.dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    teacher_id: scheduleItem.teacherId,
    studio_id: scheduleItem.studioId
  };

  // Store original data for comparison
  classDialog.originalData = { ...classDialog.formData };

  // If teacherId is not in the scheduleItem, try to get it from class instance
  if (!classDialog.formData.teacher_id) {
    const classInstance = classInstances.value.find((c) => c.id === scheduleItem.classInstanceId);
    if (classInstance && classInstance.teacher_id) {
      classDialog.formData.teacher_id = classInstance.teacher_id;
      console.log('Set teacher from class instance:', classInstance.teacher_id);
    }
  }

  classDialog.visible = true;
}

// Delete a scheduled class
function confirmDeleteFromDialog() {
  if (!classDialog.formData.id) return;
  
  confirm.require({
    message: 'Are you sure you want to remove this class from the schedule?',
    header: 'Confirm Removal',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await scheduleStore.deleteScheduleItem(classDialog.formData.id, schedule.value.id);

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Class removed from schedule successfully',
          life: 3000
        });

        // Close dialog after successful deletion
        closeClassDialog();
        createCalendarEvents();
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to remove class from schedule',
          life: 5000
        });
      }
    }
  });
}

// Close class dialog
function closeClassDialog() {
  classDialog.visible = false;
  classDialog.submitted = false;
  conflicts.value = [];
}

// Save a scheduled class
async function saveClassSchedule() {
  classDialog.submitted = true;

  // Validate form
  if (
    !classDialog.formData.class_instance_id ||
    classDialog.formData.day_of_week === null ||
    !classDialog.formData.start_time ||
    !classDialog.formData.end_time ||
    !classDialog.formData.studio_id
  ) {
    return;
  }

  // Format times
  const formattedStartTime = formatTime(classDialog.formData.start_time);
  const formattedEndTime = formatTime(classDialog.formData.end_time);

  // Prepare data
  const scheduleClassData = {
    schedule_id: classDialog.formData.schedule_id,
    class_instance_id: classDialog.formData.class_instance_id,
    day_of_week: classDialog.formData.day_of_week,
    start_time: formattedStartTime,
    end_time: formattedEndTime,
    studio_id: classDialog.formData.studio_id,
    teacher_id: classDialog.formData.teacher_id
  };

  // Check for conflicts
  conflicts.value = checkConflicts(scheduleStore.scheduleItems, {
    ...scheduleClassData,
    id: classDialog.formData.id // Include ID for conflict checking to exclude the current item
  });

  if (conflicts.value.length > 0) {
    // Show conflicts but don't prevent saving
    toast.add({
      severity: 'warn',
      summary: 'Scheduling Conflicts',
      detail: 'There are scheduling conflicts. Review them before saving.',
      life: 5000
    });
    return;
  }

  try {
    if (classDialog.isEdit) {
      // Update existing schedule class
      await scheduleStore.updateScheduleItem(classDialog.formData.id, scheduleClassData);

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Class schedule updated successfully',
        life: 3000
      });
    } else {
      // Create new schedule class
      await scheduleStore.createScheduleItem(scheduleClassData);

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Class added to schedule successfully',
        life: 3000
      });
    }

    // Close dialog and update calendar
    closeClassDialog();
    createCalendarEvents();
    hasChanges.value = false;
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save class schedule',
      life: 5000
    });
  }
}

// Delete a scheduled class
function deleteScheduledClass(scheduleItem) {
  confirm.require({
    message: 'Are you sure you want to remove this class from the schedule?',
    header: 'Confirm Removal',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await scheduleStore.deleteScheduleItem(scheduleItem.id, schedule.value.id);

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Class removed from schedule successfully',
          life: 3000
        });

        createCalendarEvents();
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to remove class from schedule',
          life: 5000
        });
      }
    }
  });
}

// Save all schedule changes
async function saveSchedule() {
  if (!hasChanges.value) return;

  try {
    isSaving.value = true;

    // Loop through all modified items and save them
    const updatePromises = scheduleStore.scheduleItems.map(async (item) => {
      // Prepare data
      const scheduleClassData = {
        schedule_id: schedule.value.id,
        class_instance_id: item.classInstanceId,
        day_of_week: item.dayOfWeek,
        start_time: item.startTime,
        end_time: item.endTime,
        studio_id: item.studioId
      };

      // Update the item
      return scheduleStore.updateScheduleItem(item.id, scheduleClassData);
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Schedule saved successfully',
      life: 3000
    });

    // Refresh the schedule data
    await scheduleStore.fetchCurrentSchedule(schedule.value.id);
    createCalendarEvents();

    // Reset the changes flag
    hasChanges.value = false;
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save schedule changes',
      life: 5000
    });
  } finally {
    isSaving.value = false;
  }
}

// Format a date for display
function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

// Format a time for storage
function formatTime(date: Date | string | null): string | null {
  if (!date) return null;

  // Ensure we have a date object
  const timeDate = new Date(date);

  return timeDate.toTimeString().split(' ')[0];
}

// Format time for display
function formatTimeForDisplay(date: Date | string | null): string {
  if (!date) return '';

  // Ensure we have a date object
  const timeDate = new Date(date);

  return timeDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getClassColor(classOption: any): string {
  if (classOption && classOption.dance_style && classOption.dance_style.color) {
    return classOption.dance_style.color;
  }
  return '#cccccc'; // Default color
}

// Handle right-click context menu for events
function onContextMenu(event: any) {
  if (!hasPermission.value) return;

  event.jsEvent.preventDefault(); // Prevent default browser context menu

  // Find the schedule item corresponding to the clicked event
  const eventId = event.el.fcSeg.eventRange.def.publicId;
  const scheduleItem = scheduleStore.scheduleItems.find((item) => item.id === eventId);

  if (scheduleItem) {
    selectedEvent.value = scheduleItem;

    // Show PrimeVue context menu at click position
    const contextMenu = document.getElementById('classContextMenu') as any;
    if (contextMenu && contextMenu.show) {
      contextMenu.show(event.jsEvent);
    }
  }
}

// Create calendar events from schedule classes
function createCalendarEvents() {
  // If no schedule items or FullCalendar isn't ready, return empty events
  if (!scheduleStore.scheduleItems || scheduleStore.scheduleItems.length === 0) {
    console.log('No schedule items or FullCalendar not ready');
    events.value = [];
    return;
  }

  // If location filter is active, apply it
  let itemsToShow = scheduleStore.scheduleItems;
  if (selectedLocationId.value) {
    itemsToShow = scheduleStore.scheduleItems.filter((item) => {
      const studio = studios.value.find((s) => s.id === item.studioId);
      return studio && studio.location_id === selectedLocationId.value;
    });
  }

  // Map schedule items to calendar events
  events.value = itemsToShow.map((item) => {
    // Look up relevant information
    const classInstance = classInstances.value.find((cls) => cls.id === item.classInstanceId);

    // Find teacher name if we have teacher_id
    let teacherName = 'No teacher';
    if (item.teacherId) {
      const teacher = teachers.value.find((t) => t.id === item.teacherId);
      if (teacher) {
        teacherName = `${teacher.first_name} ${teacher.last_name}`;
      }
    }

    // Create a draggable calendar event using the schedule manager
    const calendarEvent = createDraggableItem({...item, teacherName: teacherName});

    // Add any additional properties needed
    return {
      ...calendarEvent,
      // Add any extra properties here if needed
      extendedProps: {
        ...calendarEvent.extendedProps,
        teacherName: teacherName,
      }
    };
  });

  // If FullCalendar is initialized, update its events
  if (fullCalendar.value && fullCalendar.value.getApi) {
    const calendarApi = fullCalendar.value.getApi();
    calendarApi.removeAllEvents();
    calendarApi.addEventSource(events.value);
  }
}
</script>
<style>
.fc-event {
  cursor: grab;
  padding: 5px;
  margin: 3px 0;
  border-radius: 3px;
}

.fc-event:active {
  cursor: grabbing;
}

.fc-event.fc-dragging {
  opacity: 0.7;
}
</style>
