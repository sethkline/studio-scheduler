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
import { ref, computed, watch } from 'vue';
import { Form } from '@primevue/forms';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';

const props = defineProps({
  showData: {
    type: Object,
    required: true
  },
  saving: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['save', 'cancel']);

// Create a computed prop for form values to ensure they're reactive
const formValues = computed(() => ({
  name: props.showData.name || '',
  date: props.showData.date || '',
  start_time: props.showData.start_time || '',
  end_time: props.showData.end_time || '',
  location: props.showData.location || '',
  description: props.showData.description || '',
  status: props.showData.status || 'planning'
}));

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
  status: z.string().min(1, "Status is required")
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
    status: values.status
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