<template>
  <div class="card">
    <h1 class="text-2xl font-bold text-primary-800 mb-4">Edit Show Details</h1>
    
    <Form 
      v-slot="$form" 
      :initialValues="formValues"
      :resolver="generalFormResolver"
      @submit="handleSubmit"
      class="space-y-4"
    >
      <!-- Show Information -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="field">
          <label for="name" class="font-medium text-sm mb-1 block">Show Name*</label>
          <InputText 
            id="name" 
            name="name"
            class="w-full" 
            aria-describedby="name-error" 
          />
          <Message 
            v-if="$form.name?.invalid" 
            severity="error" 
            size="small" 
            variant="simple"
          >
            {{ $form.name.error?.message }}
          </Message>
        </div>

        <div class="field">
          <label for="status" class="font-medium text-sm mb-1 block">Status*</label>
          <Dropdown
            id="status"
            name="status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            aria-describedby="status-error"
          />
          <Message
            v-if="$form.status?.invalid"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ $form.status.error?.message }}
          </Message>
        </div>
      </div>

      <!-- Venue Selection -->
      <div class="grid grid-cols-1 gap-4">
        <div class="field">
          <label for="venue_id" class="font-medium text-sm mb-1 block">Venue</label>
          <Dropdown
            id="venue_id"
            name="venue_id"
            :options="venues"
            optionLabel="name"
            optionValue="id"
            placeholder="Select a venue (optional)"
            class="w-full"
            :loading="loadingVenues"
            showClear
          />
          <small class="text-gray-500 mt-1 block">
            Select the venue where this show will be performed. Required for seat generation.
          </small>
        </div>
      </div>

      <!-- Venue Info Display (when venue is selected) -->
      <div v-if="selectedVenue" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div class="flex items-start">
          <i class="pi pi-map-marker text-blue-500 text-xl mr-3 mt-1"></i>
          <div class="flex-1">
            <h4 class="font-semibold text-blue-900 mb-2">{{ selectedVenue.name }}</h4>
            <div class="text-sm text-blue-800 space-y-1">
              <p v-if="selectedVenue.address">
                <i class="pi pi-map text-xs mr-1"></i>
                {{ selectedVenue.address }}
                <span v-if="selectedVenue.city">, {{ selectedVenue.city }}</span>
                <span v-if="selectedVenue.state">, {{ selectedVenue.state }}</span>
                <span v-if="selectedVenue.zip_code"> {{ selectedVenue.zip_code }}</span>
              </p>
              <p v-if="selectedVenue.capacity">
                <i class="pi pi-users text-xs mr-1"></i>
                Capacity: {{ selectedVenue.capacity }} seats
              </p>
              <p v-if="selectedVenue.description" class="text-xs mt-2">
                {{ selectedVenue.description }}
              </p>
            </div>

            <!-- Seat Statistics (if seats exist) -->
            <div v-if="seatStats.total > 0" class="mt-4 pt-4 border-t border-blue-300">
              <h5 class="font-semibold text-blue-900 mb-2 text-sm">Seat Availability</h5>
              <div class="grid grid-cols-5 gap-2">
                <div class="text-center">
                  <div class="text-lg font-bold text-blue-900">{{ seatStats.total }}</div>
                  <div class="text-xs text-blue-700">Total</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-green-700">{{ seatStats.available }}</div>
                  <div class="text-xs text-blue-700">Available</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-orange-700">{{ seatStats.reserved }}</div>
                  <div class="text-xs text-blue-700">Reserved</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-purple-700">{{ seatStats.held }}</div>
                  <div class="text-xs text-blue-700">Held</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-red-700">{{ seatStats.sold }}</div>
                  <div class="text-xs text-blue-700">Sold</div>
                </div>
              </div>

              <!-- Section Breakdown -->
              <div v-if="sectionStats.length > 0" class="mt-3">
                <div class="text-xs font-semibold text-blue-900 mb-2">By Section:</div>
                <div class="space-y-1">
                  <div
                    v-for="section in sectionStats"
                    :key="section.id"
                    class="flex justify-between items-center text-xs bg-white/50 px-2 py-1 rounded"
                  >
                    <span class="font-medium">{{ section.name }}</span>
                    <span class="text-blue-700">
                      {{ section.available }}/{{ section.total }} available
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="field">
          <label for="date" class="font-medium text-sm mb-1 block">Show Date*</label>
          <Calendar 
            id="date" 
            name="date"
            class="w-full" 
            dateFormat="mm/dd/yy"
            :formControl="{
              transform: {
                input: stringToDate,
                output: dateToString
              }
            }"
            aria-describedby="date-error" 
          />
          <Message 
            v-if="$form.date?.invalid" 
            severity="error" 
            size="small" 
            variant="simple"
          >
            {{ $form.date.error?.message }}
          </Message>
        </div>

        <div class="field">
          <label for="start_time" class="font-medium text-sm mb-1 block">Start Time*</label>
          <Calendar 
            id="start_time" 
            name="start_time"
            class="w-full" 
            timeOnly 
            :formControl="{
              transform: {
                input: stringToTime,
                output: timeToString
              }
            }"
            aria-describedby="start_time-error" 
          />
          <Message 
            v-if="$form.start_time?.invalid" 
            severity="error" 
            size="small" 
            variant="simple"
          >
            {{ $form.start_time.error?.message }}
          </Message>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="field">
          <label for="end_time" class="font-medium text-sm mb-1 block">End Time</label>
          <Calendar 
            id="end_time" 
            name="end_time"
            class="w-full" 
            timeOnly 
            :formControl="{
              transform: {
                input: stringToTime,
                output: timeToString
              }
            }"
          />
        </div>

        <div class="field">
          <label for="location" class="font-medium text-sm mb-1 block">Location*</label>
          <InputText 
            id="location" 
            name="location"
            class="w-full" 
            aria-describedby="location-error" 
          />
          <Message 
            v-if="$form.location?.invalid" 
            severity="error" 
            size="small" 
            variant="simple"
          >
            {{ $form.location.error?.message }}
          </Message>
        </div>
      </div>

      <div class="field">
        <label for="description" class="font-medium text-sm mb-1 block">Description</label>
        <Textarea 
          id="description" 
          name="description"
          rows="4" 
          class="w-full" 
        />
      </div>

      <div class="flex justify-end gap-2 pt-4">
        <Button 
          type="button" 
          label="Cancel" 
          class="p-button-text" 
          @click="$emit('cancel')"
          :disabled="saving"
        />
        <Button 
          type="submit" 
          label="Save Show Details" 
          icon="pi pi-save"
          :loading="saving"
        />
      </div>
    </Form>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { Form } from '@primevue/forms';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import type { Venue } from '~/types';

const props = defineProps({
  showData: {
    type: Object,
    required: true
  },
  saving: {
    type: Boolean,
    default: false
  },
  seatStats: {
    type: Object,
    default: () => ({ total: 0, available: 0, sold: 0, reserved: 0, held: 0 })
  },
  sectionStats: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['save', 'cancel']);

// Composables
const { listVenues } = useVenues();

// State
const venues = ref<Venue[]>([]);
const loadingVenues = ref(false);

// Load venues on mount
onMounted(async () => {
  await loadVenues();
});

async function loadVenues() {
  loadingVenues.value = true;
  try {
    venues.value = await listVenues();
  } catch (error) {
    console.error('Error loading venues:', error);
  } finally {
    loadingVenues.value = false;
  }
}

// Create a computed prop for form values to ensure they're reactive
const formValues = computed(() => ({
  name: props.showData.name || '',
  date: props.showData.date || '',
  start_time: props.showData.start_time || '',
  end_time: props.showData.end_time || '',
  location: props.showData.location || '',
  description: props.showData.description || '',
  status: props.showData.status || 'planning',
  venue_id: props.showData.venue_id || null
}));

// Computed property for selected venue
const selectedVenue = computed(() => {
  if (!props.showData.venue_id) return null;
  return venues.value.find(v => v.id === props.showData.venue_id) || null;
});

// Status options
const statusOptions = [
  { label: 'Planning', value: 'planning' },
  { label: 'Rehearsal', value: 'rehearsal' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' }
];

// Form validation schema
const generalFormSchema = z.object({
  name: z.string().min(1, "Show name is required"),
  date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  venue_id: z.string().nullable().optional()
});

// Create resolver
const generalFormResolver = zodResolver(generalFormSchema);

// Handle form submission
function handleSubmit(event) {
  const { values, valid } = event;
  if (!valid) return;

  // Create updated data object
  const updatedData = {
    name: values.name,
    date: values.date,
    start_time: values.start_time,
    end_time: values.end_time || null,
    location: values.location,
    description: values.description || '',
    status: values.status,
    venue_id: values.venue_id || null
  };

  // Emit save event with updated data
  emit('save', updatedData);
}

// Helper functions for date/time transformation
function stringToDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr);
}

function dateToString(date) {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}

function stringToTime(timeStr) {
  if (!timeStr) return null;
  
  // Create a date object with today's date and the time from the string
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
  date.setSeconds(0);
  
  return date;
}

function timeToString(date) {
  if (!date) return '';
  if (typeof date === 'string') return date;
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}:00`;
}
</script>

<style scoped>
.field {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
}
</style>