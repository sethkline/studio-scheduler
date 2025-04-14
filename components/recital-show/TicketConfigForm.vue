<template>
  <div class="card">
    <h2 class="text-xl font-bold text-primary-800 mb-2">Ticket Sales Configuration</h2>
    <p class="text-gray-600 mb-6">Configure ticket pricing, availability, and sales periods for this show.</p>
    
    <Form 
      v-slot="$form" 
      :initialValues="ticketData"
      :resolver="ticketFormResolver"
      @submit="handleSubmit"
      class="space-y-4"
    >
      <div class="field flex items-center gap-2 mb-6">
        <ToggleSwitch 
          name="can_sell_tickets"
          class="mr-2" 
        />
        <label for="can_sell_tickets" class="font-medium">Enable ticket sales for this show</label>
      </div>

      <div v-if="$form.can_sell_tickets?.value" class="space-y-6">
        <!-- Pricing Section -->
        <div>
          <h3 class="text-lg font-semibold mb-3 pb-2 border-b border-gray-200">Pricing</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="field">
              <label for="ticket_price_in_cents" class="font-medium text-sm mb-1 block">Ticket Price ($)*</label>
              <InputNumber 
                id="ticket_price_in_cents" 
                name="ticket_price_in_cents"
                class="w-full" 
                mode="currency" 
                currency="USD" 
                locale="en-US"
                aria-describedby="ticket_price_in_cents-error"
              />
              <Message 
                v-if="$form.ticket_price_in_cents?.invalid" 
                severity="error" 
                size="small" 
                variant="simple"
              >
                {{ $form.ticket_price_in_cents.error?.message }}
              </Message>
            </div>
          </div>
        </div>

        <!-- Regular Sales Period -->
        <div>
          <h3 class="text-lg font-semibold mb-3 pb-2 border-b border-gray-200">Regular Sales Period</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="field">
              <label for="ticket_sale_start" class="font-medium text-sm mb-1 block">Sales Start Date & Time*</label>
              <DatePicker 
                id="ticket_sale_start" 
                name="ticket_sale_start"
                class="w-full" 
                showTime
                hourFormat="12"
                :formControl="{
                  transform: {
                    input: stringToDateTime,
                    output: dateTimeToString
                  }
                }"
                aria-describedby="ticket_sale_start-error"
              />
              <Message 
                v-if="$form.ticket_sale_start?.invalid" 
                severity="error" 
                size="small" 
                variant="simple"
              >
                {{ $form.ticket_sale_start.error?.message }}
              </Message>
            </div>

            <div class="field">
              <label for="ticket_sale_end" class="font-medium text-sm mb-1 block">Sales End Date & Time*</label>
              <DatePicker 
                id="ticket_sale_end" 
                name="ticket_sale_end"
                class="w-full" 
                showTime
                hourFormat="12"
                :formControl="{
                  transform: {
                    input: stringToDateTime,
                    output: dateTimeToString
                  }
                }"
                aria-describedby="ticket_sale_end-error"
              />
              <Message 
                v-if="$form.ticket_sale_end?.invalid" 
                severity="error" 
                size="small" 
                variant="simple"
              >
                {{ $form.ticket_sale_end.error?.message }}
              </Message>
            </div>
          </div>
        </div>

        <!-- Pre-sale Configuration -->
        <div>
          <div class="field flex items-center gap-2 mb-3">
            <ToggleSwitch 
              name="is_pre_sale_active"
              class="mr-2" 
            />
            <label for="is_pre_sale_active" class="font-medium">Enable pre-sale period</label>
          </div>

          <div v-if="$form.is_pre_sale_active?.value" class="pl-8 space-y-4 mt-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="field">
                <label for="pre_sale_start" class="font-medium text-sm mb-1 block">Pre-sale Start*</label>
                <DatePicker 
                  id="pre_sale_start" 
                  name="pre_sale_start"
                  class="w-full" 
                  showTime
                  hourFormat="12"
                  :formControl="{
                    transform: {
                      input: stringToDateTime,
                      output: dateTimeToString
                    }
                  }"
                  aria-describedby="pre_sale_start-error"
                />
                <Message 
                  v-if="$form.pre_sale_start?.invalid" 
                  severity="error" 
                  size="small" 
                  variant="simple"
                >
                  {{ $form.pre_sale_start.error?.message }}
                </Message>
              </div>

              <div class="field">
                <label for="pre_sale_end" class="font-medium text-sm mb-1 block">Pre-sale End*</label>
                <DatePicker 
                  id="pre_sale_end" 
                  name="pre_sale_end"
                  class="w-full" 
                  showTime
                  hourFormat="12"
                  :formControl="{
                    transform: {
                      input: stringToDateTime,
                      output: dateTimeToString
                    }
                  }"
                  aria-describedby="pre_sale_end-error"
                />
                <Message 
                  v-if="$form.pre_sale_end?.invalid" 
                  severity="error" 
                  size="small" 
                  variant="simple"
                >
                  {{ $form.pre_sale_end.error?.message }}
                </Message>
              </div>
            </div>
          </div>
        </div>

        <!-- Advance Sales Notification -->
        <div>
          <h3 class="text-lg font-semibold mb-3 pb-2 border-b border-gray-200">Advance Notification</h3>
          <p class="text-sm text-gray-600 mb-3">Set a date when subscribers will be notified about upcoming ticket sales.</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="field">
              <label for="advance_ticket_sale_start" class="font-medium text-sm mb-1 block">Advance Notification Date</label>
              <Calendar 
                id="advance_ticket_sale_start" 
                name="advance_ticket_sale_start"
                class="w-full" 
                showTime
                hourFormat="12"
                :formControl="{
                  transform: {
                    input: isoToDateTime,
                    output: dateTimeToIso
                  }
                }"
              />
            </div>
          </div>
        </div>
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
          label="Save Ticket Configuration" 
          icon="pi pi-save"
          :loading="saving"
        />
      </div>
    </Form>
  </div>
</template>

<script setup>
import { Form } from '@primevue/forms';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import ToggleSwitch from 'primevue/toggleswitch';


const props = defineProps({
  ticketData: {
    type: Object,
    required: true
  },
  saving: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['save', 'cancel']);

// Form validation schema
const ticketFormSchema = z.object({
  can_sell_tickets: z.boolean(),
  ticket_price_in_cents: z.number().min(0, "Price must be 0 or higher").optional(),
  ticket_sale_start: z.any().optional().nullable(),
  ticket_sale_end: z.any().optional().nullable(),
  is_pre_sale_active: z.boolean(),
  pre_sale_start: z.any().optional().nullable(),
  pre_sale_end: z.any().optional().nullable(),
  advance_ticket_sale_start: z.string().optional().nullable()
}).refine(data => {
  // Only validate ticket-related fields if can_sell_tickets is true
  if (data.can_sell_tickets) {
    if (!data.ticket_price_in_cents && data.ticket_price_in_cents !== 0) {
      return false;
    }
    if (!data.ticket_sale_start || !data.ticket_sale_end) {
      return false;
    }
    // Validate pre-sale dates if pre-sale is active
    if (data.is_pre_sale_active && (!data.pre_sale_start || !data.pre_sale_end)) {
      return false;
    }
  }
  return true;
}, {
  message: "Please fill in all required ticket sales fields",
  path: ["can_sell_tickets"]
});

// Create resolver
const ticketFormResolver = zodResolver(ticketFormSchema);

// Handle form submission
function handleSubmit(event) {
  const { values, valid } = event;
  if (!valid) return;
  
  // Prepare data for API
  const updatedData = {
    can_sell_tickets: values.can_sell_tickets,
    ticket_price_in_cents: values.can_sell_tickets ? values.ticket_price_in_cents : null,
    ticket_sale_start: values.can_sell_tickets ? values.ticket_sale_start : null,
    ticket_sale_end: values.can_sell_tickets ? values.ticket_sale_end : null,
    is_pre_sale_active: values.can_sell_tickets ? values.is_pre_sale_active : false,
    pre_sale_start: (values.can_sell_tickets && values.is_pre_sale_active) ? values.pre_sale_start : null,
    pre_sale_end: (values.can_sell_tickets && values.is_pre_sale_active) ? values.pre_sale_end : null,
    advance_ticket_sale_start: values.can_sell_tickets ? values.advance_ticket_sale_start : null
  };
  
  // Emit save event with updated data
  emit('save', updatedData);
}

// Helper functions for date/time/currency transformations
function isoToDateTime(isoStr) {
  if (!isoStr) return null;
  return new Date(isoStr);
}

function dateTimeToIso(date) {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

function centsToDollars(cents) {
  console.log('Converting cents to dollars:', cents);
  if (cents === null || cents === undefined) return 0;
  return cents / 100;
}

function dollarsToCents(dollars) {
  if (dollars === null || dollars === undefined) return 0;
  return Math.round(dollars * 100);
}

function stringToDateTime(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr);
  } catch (e) {
    console.error('Error parsing date:', e);
    return null;
  }
}

function dateTimeToString(date) {
  if (!date) return null;
  if (typeof date === 'string') return date;
  try {
    return date.toISOString();
  } catch (e) {
    console.error('Error converting date to string:', e);
    return null;
  }
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

:deep(.p-toggleswitch .p-toggleswitch-slider) {
  background: #e9e9e9;
  border-radius: 30px;
  transition: background-color 0.2s;
}

:deep(.p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-slider) {
  background: var(--primary-color, #3B82F6);
}
</style>