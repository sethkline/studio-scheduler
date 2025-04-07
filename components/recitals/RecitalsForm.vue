<template>
  <Form 
    v-slot="$form" 
    :initialValues="modelValue"
    :resolver="formResolver"
    @submit="onSubmit"
    class="space-y-4"
  >
    <div class="field">
      <label for="name" class="font-medium text-sm mb-1 block">Recital Name*</label>
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
      <label for="date" class="font-medium text-sm mb-1 block">Date*</label>
      <Calendar 
        id="date" 
        name="date"
        dateFormat="yy-mm-dd"
        class="w-full" 
        aria-describedby="date-error"
        showIcon
        :formControl="{
          transform: {
            input: stringToDate,
            output: dateToString
          }
        }"
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

    <div class="field">
      <label for="status" class="font-medium text-sm mb-1 block">Status*</label>
      <Dropdown 
        id="status" 
        name="status"
        :options="statusOptions" 
        optionLabel="label" 
        optionValue="value"
        class="w-full" 
        placeholder="Select Status"
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

    <div class="field">
      <label for="theme" class="font-medium text-sm mb-1 block">Theme</label>
      <InputText 
        id="theme" 
        name="theme"
        class="w-full"
      />
    </div>

    <div class="field">
      <label for="description" class="font-medium text-sm mb-1 block">Description</label>
      <Textarea 
        id="description" 
        name="description"
        rows="3" 
        class="w-full" 
        autoResize
      />
    </div>

    <div class="field">
      <label for="notes" class="font-medium text-sm mb-1 block">Notes</label>
      <Textarea 
        id="notes" 
        name="notes"
        rows="3" 
        class="w-full" 
        autoResize
      />
    </div>

    <div class="flex justify-end gap-2 pt-4">
      <Button 
        type="button" 
        label="Cancel" 
        class="p-button-text" 
        @click="$emit('cancel')"
        :disabled="loading"
      />
      <Button 
        type="submit" 
        label="Save" 
        icon="pi pi-save"
        :loading="loading"
      />
    </div>
  </Form>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Form } from '@primevue/forms';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import type { Recital } from '~/types/recitals';

// Props and emits
const props = defineProps<{
  modelValue: Partial<Recital>;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Partial<Recital>): void;
  (e: 'save'): void;
  (e: 'cancel'): void;
}>();

// Status options for dropdown
const statusOptions = [
  { label: 'Planning', value: 'planning' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' }
];

// Helper functions for date conversion
function stringToDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  return new Date(dateStr);
}

function dateToString(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

// Zod schema for form validation
const recitalSchema = z.object({
  name: z.string().min(1, 'Recital name is required'),
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(1, 'Location is required'),
  status: z.string().min(1, 'Status is required'),
  theme: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional()
});

// Create a resolver using the zod schema
const formResolver = zodResolver(recitalSchema);

// Form submission handler
function onSubmit(event: any) {
  const { values, valid } = event;
  
  if (valid) {
    // Update the model value
    emit('update:modelValue', values);
    
    // Emit save event
    emit('save');
  }
}
</script>