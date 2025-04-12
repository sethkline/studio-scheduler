<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-bold">{{ seriesData?.name || 'Recital Shows' }}</h1>
        <p v-if="seriesData?.theme" class="text-gray-600">Theme: {{ seriesData.theme }}</p>
      </div>
      
      <div class="flex gap-2">
        <Button 
          label="Back to Series" 
          icon="pi pi-arrow-left" 
          outlined
          @click="router.push('/recitals/series')"
        />
        <Button 
          label="Add Show" 
          icon="pi pi-plus" 
          @click="showCreateDialog = true"
        />
      </div>
    </div>
    
    <div v-if="loading" class="flex justify-center p-6">
      <i class="pi pi-spin pi-spinner text-2xl"></i>
    </div>
    
    <div v-else-if="shows.length === 0" class="p-4 text-center bg-gray-50 rounded-lg">
      <i class="pi pi-calendar-times text-4xl text-gray-400 mb-2"></i>
      <p class="text-lg text-gray-600">No shows have been created for this recital series.</p>
      <Button 
        label="Create First Show" 
        icon="pi pi-plus" 
        class="mt-4"
        @click="showCreateDialog = true" 
      />
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div 
        v-for="show in shows" 
        :key="show.id" 
        class="card p-0 overflow-hidden flex flex-col"
      >
        <div 
          class="p-4 flex-1 flex flex-col"
          :class="{'bg-green-50': show.status === 'ready', 'bg-yellow-50': show.status === 'rehearsal', 'bg-blue-50': show.status === 'planning', 'bg-gray-50': show.status === 'completed'}"
        >
          <div class="flex justify-between items-start">
            <h2 class="text-xl font-semibold">{{ show.name }}</h2>
            <Tag :value="show.status" :severity="getStatusSeverity(show.status)" />
          </div>
          
          <div class="mt-2 space-y-1">
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar text-gray-500"></i>
              <span>{{ formatDate(show.date) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-clock text-gray-500"></i>
              <span>{{ formatTime(show.start_time) }} - {{ show.end_time ? formatTime(show.end_time) : 'TBD' }}</span>
            </div>
            <div v-if="show.location" class="flex items-center gap-2">
              <i class="pi pi-map-marker text-gray-500"></i>
              <span>{{ show.location }}</span>
            </div>
          </div>
          
          <div class="mt-4 flex items-center gap-2">
            <i class="pi pi-ticket text-gray-500"></i>
            <div>
              <div v-if="show.general_tickets_start_at" class="text-sm">
                <span class="font-medium">Ticket Sales:</span> {{ formatDate(show.general_tickets_start_at) }}
              </div>
              <div v-else class="text-sm text-gray-500">
                Ticket sales not configured
              </div>
            </div>
          </div>
          
          <div class="mt-2">
            <div v-if="show.program" class="mt-2 flex items-center gap-1 text-green-600">
              <i class="pi pi-check-circle"></i>
              <span class="text-sm">Program created</span>
            </div>
            <div v-else class="mt-2 flex items-center gap-1 text-gray-500">
              <i class="pi pi-file"></i>
              <span class="text-sm">No program yet</span>
            </div>
          </div>
        </div>
        
        <div class="p-3 bg-gray-50 border-t flex justify-between">
          <Button 
            label="Manage Program" 
            icon="pi pi-file" 
            outlined
            class="p-button-sm"
            @click="navigateToProgramEditor(show.id)"
          />
          
          <div class="flex gap-2">
            <Button 
              icon="pi pi-pencil" 
              severity="secondary" 
              text 
              rounded 
              aria-label="Edit" 
              @click="editShow(show)"
            />
            <Button 
              icon="pi pi-trash" 
              severity="danger" 
              text 
              rounded 
              aria-label="Delete" 
              @click="confirmDeleteShow(show)"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Create/Edit Show Dialog -->
    <Dialog 
      v-model:visible="showCreateDialog" 
      :header="editMode ? 'Edit Recital Show' : 'Create Recital Show'" 
      modal 
      class="w-full max-w-2xl"
    >
      <Form
        v-slot="$form"
        :initialValues="showForm"
        :resolver="formResolver"
        @submit="saveShow"
        class="space-y-4"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="field md:col-span-2">
            <label for="name" class="font-medium text-sm mb-1 block">Show Name*</label>
            <InputText 
              id="name" 
              name="name"
              class="w-full" 
              aria-describedby="name-error"
              placeholder="e.g., Morning Show, Afternoon Performance"
            />
            <Message 
              v-if="$form.name?.invalid && $form.name?.touched" 
              severity="error" 
              size="small"
              variant="simple"
            >
              {{ $form.name.error?.message }}
            </Message>
          </div>
          
          <div class="field">
            <label for="date" class="font-medium text-sm mb-1 block">Date*</label>
            <DatePicker 
              id="date" 
              name="date"
              class="w-full" 
              dateFormat="mm/dd/yy"
              :minDate="new Date()"
              :formControl="{
                transform: {
                  input: stringToDate,
                  output: dateToString
                }
              }"
              aria-describedby="date-error"
            />
            <Message 
              v-if="$form.date?.invalid && $form.date?.touched" 
              severity="error" 
              size="small"
              variant="simple"
            >
              {{ $form.date.error?.message }}
            </Message>
          </div>
          
          <div class="field">
            <label for="status" class="font-medium text-sm mb-1 block">Status*</label>
            <Dropdown
              id="status"
              name="status"
              class="w-full"
              :options="statusOptions"
              optionLabel="name"
              optionValue="value"
              placeholder="Select status"
              aria-describedby="status-error"
            />
            <Message 
              v-if="$form.status?.invalid && $form.status?.touched" 
              severity="error" 
              size="small"
              variant="simple"
            >
              {{ $form.status.error?.message }}
            </Message>
          </div>
          
          <div class="field">
            <label for="start_time" class="font-medium text-sm mb-1 block">Start Time*</label>
            <DatePicker 
              id="start_time" 
              name="start_time"
              class="w-full" 
              timeOnly 
              :showTime="true"
              hourFormat="12"
              :formControl="{
                transform: {
                  input: stringToTime,
                  output: timeToString
                }
              }"
              aria-describedby="start_time-error"
            />
            <Message 
              v-if="$form.start_time?.invalid && $form.start_time?.touched" 
              severity="error" 
              size="small"
              variant="simple"
            >
              {{ $form.start_time.error?.message }}
            </Message>
          </div>
          
          <div class="field">
            <label for="end_time" class="font-medium text-sm mb-1 block">End Time</label>
            <DatePicker 
              id="end_time" 
              name="end_time"
              class="w-full" 
              timeOnly 
              :showTime="true"
              hourFormat="12"
              :formControl="{
                transform: {
                  input: stringToTime,
                  output: timeToString
                }
              }"
            />
          </div>
          
          <div class="field md:col-span-2">
            <label for="location" class="font-medium text-sm mb-1 block">Location</label>
            <InputText 
              id="location" 
              name="location"
              class="w-full" 
              placeholder="Venue name and address"
            />
          </div>
          
          <div class="field md:col-span-2">
            <h3 class="font-medium text-base mb-2">Ticket Sales Schedule</h3>
          </div>
          
          <div class="field">
            <label for="volunteer_tickets_start_at" class="font-medium text-sm mb-1 block">Volunteer Ticket Sales</label>
            <DatePicker 
              id="volunteer_tickets_start_at" 
              name="volunteer_tickets_start_at"
              class="w-full" 
              dateFormat="mm/dd/yy"
              :showTime="true"
              hourFormat="12"
              :formControl="{
                transform: {
                  input: stringToDateTime,
                  output: dateTimeToString
                }
              }"
            />
          </div>
          
          <div class="field">
            <label for="senior_tickets_start_at" class="font-medium text-sm mb-1 block">Senior Student Ticket Sales</label>
            <DatePicker 
              id="senior_tickets_start_at" 
              name="senior_tickets_start_at"
              class="w-full" 
              dateFormat="mm/dd/yy"
              :showTime="true"
              hourFormat="12"
              :formControl="{
                transform: {
                  input: stringToDateTime,
                  output: dateTimeToString
                }
              }"
            />
          </div>
          
          <div class="field md:col-span-2">
            <label for="general_tickets_start_at" class="font-medium text-sm mb-1 block">General Ticket Sales</label>
            <DatePicker 
              id="general_tickets_start_at" 
              name="general_tickets_start_at"
              class="w-full" 
              dateFormat="mm/dd/yy"
              :showTime="true"
              hourFormat="12"
              :formControl="{
                transform: {
                  input: stringToDateTime,
                  output: dateTimeToString
                }
              }"
            />
          </div>
          
          <div class="field md:col-span-2">
            <label for="description" class="font-medium text-sm mb-1 block">Description</label>
            <Textarea 
              id="description" 
              name="description"
              class="w-full" 
              rows="3"
              placeholder="Additional details about this performance"
            />
          </div>
        </div>
        
        <div class="flex justify-end gap-2 pt-4">
          <Button 
            type="button" 
            label="Cancel" 
            class="p-button-text" 
            @click="closeDialog"
            :disabled="saving"
          />
          <Button 
            type="submit" 
            label="Save" 
            icon="pi pi-save"
            :loading="saving"
          />
        </div>
      </Form>
    </Dialog>
    
    <!-- Delete Confirmation -->
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { Form } from '@primevue/forms';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

const route = useRoute();
const router = useRouter();
const seriesId = computed(() => route.params.id);

// State
const seriesData = ref(null);
const shows = ref([]);
const loading = ref(true);
const saving = ref(false);
const showCreateDialog = ref(false);
const editMode = ref(false);
const currentShowId = ref(null);

const showForm = ref({
  name: '',
  date: '',
  start_time: '',
  end_time: '',
  location: '',
  status: 'planning',
  description: '',
  volunteer_tickets_start_at: '',
  senior_tickets_start_at: '',
  general_tickets_start_at: '',
  series_id: seriesId.value
});

// Services
const toast = useToast();
const confirm = useConfirm();
const { 
  fetchRecitalSeries,
  fetchRecitalShows, 
  createRecitalShow, 
  updateRecitalShow, 
  deleteRecitalShow 
} = useApiService();

// Form validation
const showSchema = z.object({
  name: z.string().min(1, 'Show name is required'),
  date: z.union([
    z.string().min(1, 'Date is required'),
    z.date().transform(date => date.toISOString().split('T')[0])
  ]),
  start_time: z.union([
    z.string().min(1, 'Start time is required'), 
    z.date().transform(date => 
      `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`
    )
  ]),
  end_time: z.union([
    z.string().optional(),
    z.date().transform(date => 
      `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`
    ).optional()
  ]),
  location: z.string().optional(),
  status: z.enum(['planning', 'rehearsal', 'ready', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Please select a valid status' })
  }),
  description: z.string().optional(),
  volunteer_tickets_start_at: z.string().optional(),
  senior_tickets_start_at: z.string().optional(),
  general_tickets_start_at: z.string().optional(),
  series_id: z.string().min(1, 'Series ID is required')
});

const formResolver = zodResolver(showSchema);

// Options
const statusOptions = [
  { name: 'Planning', value: 'planning' },
  { name: 'Rehearsal', value: 'rehearsal' },
  { name: 'Ready', value: 'ready' },
  { name: 'Completed', value: 'completed' },
  { name: 'Cancelled', value: 'cancelled' }
];

// Utility functions for date/time handling
// For dates only
function stringToDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr);
}

function dateToString(date) {
  if (!date) return '';
  // Make sure this always returns a string
  return typeof date === 'string' ? date : date.toISOString().split('T')[0];
}

// For time values
function stringToTime(timeStr) {
  if (!timeStr) return null;
  const today = new Date();
  if (typeof timeStr === 'string') {
    const [hours, minutes] = timeStr.split(':');
    today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  }
  return today;
}

function timeToString(date) {
  if (!date) return '';
  // Make sure this always returns a string
  if (typeof date === 'string') return date;
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`;
}

// For datetime values
function stringToDateTime(datetimeStr) {
  if (!datetimeStr) return null;
  return new Date(datetimeStr);
}

function dateTimeToString(date) {
  if (!date) return '';
  // Make sure this always returns a string
  return typeof date === 'string' ? date : date.toISOString();
}

// Format functions for display
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString();
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getStatusSeverity(status) {
  switch (status) {
    case 'planning': return 'info';
    case 'rehearsal': return 'warning';
    case 'ready': return 'success';
    case 'completed': return 'secondary';
    case 'cancelled': return 'danger';
    default: return 'info';
  }
}

// Methods
const loadData = async () => {
  loading.value = true;
  try {
    // Load series data
    const { data: seriesResponse, error: seriesError } = await fetchRecitalSeries(seriesId.value);
    
    if (seriesError.value) {
      throw new Error(seriesError.value.message || 'Failed to load recital series');
    }
    
    seriesData.value = seriesResponse.value.series;
    
    // Load shows for this series
    const { data: showsResponse, error: showsError } = await fetchRecitalShows(seriesId.value);
    
    if (showsError.value) {
      throw new Error(showsError.value.message || 'Failed to load recital shows');
    }
    
    shows.value = showsResponse.value.shows;
  } catch (error) {
    console.error('Error loading data:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load data',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const editShow = (show) => {
  console.log('Editing show, original data:', show);
  currentShowId.value = show.id;
  showForm.value = { ...show, series_id: seriesId.value };
  console.log('Form data after setting:', showForm.value);
  editMode.value = true;
  showCreateDialog.value = true;
};

const closeDialog = () => {
  showCreateDialog.value = false;
  // Reset form after dialog closes
  setTimeout(() => {
    editMode.value = false;
    currentShowId.value = null;
    showForm.value = {
      name: '',
      date: '',
      start_time: '',
      end_time: '',
      location: '',
      status: 'planning',
      description: '',
      volunteer_tickets_start_at: '',
      senior_tickets_start_at: '',
      general_tickets_start_at: '',
      series_id: seriesId.value
    };
  }, 300);
};

const saveShow = async (event) => {
  console.log('Form submission event:', event);
  
  // Check if the form is valid
  if (!event.valid) {
    console.error('Form validation errors:', event.errors);
    return;
  }
  
  // Extract values from the states object
  const values = {
    name: event.states.name?.value || '',
    date: event.states.date?.value || '',
    start_time: event.states.start_time?.value || '',
    end_time: event.states.end_time?.value || '',
    location: event.states.location?.value || '',
    status: event.states.status?.value || 'planning',
    description: event.states.description?.value || '',
    volunteer_tickets_start_at: event.states.volunteer_tickets_start_at?.value || '',
    senior_tickets_start_at: event.states.senior_tickets_start_at?.value || '',
    general_tickets_start_at: event.states.general_tickets_start_at?.value || '',
    series_id: seriesId.value // Make sure to include this from your computed property
  };
  
  console.log('Extracted form values:', values);
  
  // Now process these values with your date/time conversion if needed
  const processedValues = {
    ...values,
    date: typeof values.date === 'object' ? dateToString(values.date) : values.date,
    start_time: typeof values.start_time === 'object' ? timeToString(values.start_time) : values.start_time,
    end_time: values.end_time ? (typeof values.end_time === 'object' ? timeToString(values.end_time) : values.end_time) : undefined,
    // Process other datetime fields if needed
  };
  
  console.log('Processed values for API:', processedValues);
  
  saving.value = true;
  try {
    if (editMode.value) {
      const { data, error } = await updateRecitalShow(currentShowId.value, processedValues);
      
      if (error.value) {
        throw new Error(error.value.message || 'Failed to update recital show');
      }
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Recital show updated successfully',
        life: 3000
      });
    } else {
      const { data, error } = await createRecitalShow(processedValues);
      
      if (error.value) {
        throw new Error(error.value.message || 'Failed to create recital show');
      }
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Recital show created successfully',
        life: 3000
      });
    }
    
    // Reload data and close dialog
    await loadData();
    closeDialog();
  } catch (error) {
    console.error('Error saving recital show:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save recital show',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
};

const confirmDeleteShow = (show) => {
  confirm.require({
    message: `Are you sure you want to delete "${show.name}"? This action will remove all program content and cannot be undone.`,
    header: 'Delete Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteShow(show.id)
  });
};

const deleteShow = async (id) => {
  try {
    const { error } = await deleteRecitalShow(id);
    
    if (error.value) {
      throw new Error(error.value.message || 'Failed to delete recital show');
    }
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Recital show deleted successfully',
      life: 3000
    });
    
    // Reload data
    await loadData();
  } catch (error) {
    console.error('Error deleting recital show:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete recital show',
      life: 3000
    });
  }
};

const navigateToProgramEditor = (showId) => {
  router.push(`/recitals/shows/${showId}/program`);
};

// Load data on component mount
onMounted(() => {
  loadData();
});
</script>