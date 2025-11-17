<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  middleware: 'admin'
})

const { createVenue } = useVenues()
const router = useRouter()
const toast = useToast()

const saving = ref(false)

// Form state
const formData = ref({
  name: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  capacity: null as number | null,
  description: ''
})

// Validation schema
const venueSchema = z.object({
  name: z.string().min(1, 'Venue name is required').max(255, 'Name is too long'),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  zip_code: z.string().max(10).optional().or(z.literal('')),
  capacity: z.number().positive('Capacity must be positive').optional().nullable(),
  description: z.string().optional().or(z.literal(''))
})

// Form errors
const errors = ref<Record<string, string>>({})

const validateForm = () => {
  errors.value = {}
  try {
    venueSchema.parse(formData.value)
    return true
  } catch (error: any) {
    if (error.errors) {
      error.errors.forEach((err: any) => {
        errors.value[err.path[0]] = err.message
      })
    }
    return false
  }
}

const handleSubmit = async () => {
  if (!validateForm()) {
    toast.add({
      severity: 'warn',
      summary: 'Validation Error',
      detail: 'Please fix the errors in the form',
      life: 3000
    })
    return
  }

  saving.value = true
  try {
    await createVenue({
      name: formData.value.name,
      address: formData.value.address || undefined,
      city: formData.value.city || undefined,
      state: formData.value.state || undefined,
      zip_code: formData.value.zip_code || undefined,
      capacity: formData.value.capacity || undefined,
      description: formData.value.description || undefined
    })

    // Navigate back to venues list
    router.push('/admin/ticketing/venues')
  } catch (error) {
    // Error already shown by composable
    console.error('Failed to create venue:', error)
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  router.push('/admin/ticketing/venues')
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="mb-6">
      <Button
        icon="pi pi-arrow-left"
        label="Back to Venues"
        text
        @click="handleCancel"
        class="mb-4"
      />
      <h1 class="text-3xl font-bold text-gray-900">Create Venue</h1>
      <p class="text-gray-600 mt-1">Add a new venue for recital ticketing</p>
    </div>

    <form @submit.prevent="handleSubmit">
      <Card>
        <template #content>
          <div class="space-y-6">
            <!-- Venue Name -->
            <div class="field">
              <label for="name" class="font-medium text-sm mb-2 block">
                Venue Name <span class="text-red-500">*</span>
              </label>
              <InputText
                id="name"
                v-model="formData.name"
                class="w-full"
                :class="{ 'p-invalid': errors.name }"
                placeholder="e.g., Central High School Auditorium"
              />
              <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
            </div>

            <!-- Address -->
            <div class="field">
              <label for="address" class="font-medium text-sm mb-2 block">
                Street Address
              </label>
              <InputText
                id="address"
                v-model="formData.address"
                class="w-full"
                :class="{ 'p-invalid': errors.address }"
                placeholder="e.g., 123 Main Street"
              />
              <small v-if="errors.address" class="p-error">{{ errors.address }}</small>
            </div>

            <!-- City, State, Zip -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="field">
                <label for="city" class="font-medium text-sm mb-2 block">
                  City
                </label>
                <InputText
                  id="city"
                  v-model="formData.city"
                  class="w-full"
                  :class="{ 'p-invalid': errors.city }"
                  placeholder="e.g., Springfield"
                />
                <small v-if="errors.city" class="p-error">{{ errors.city }}</small>
              </div>

              <div class="field">
                <label for="state" class="font-medium text-sm mb-2 block">
                  State
                </label>
                <InputText
                  id="state"
                  v-model="formData.state"
                  class="w-full"
                  :class="{ 'p-invalid': errors.state }"
                  placeholder="e.g., IL"
                  maxlength="2"
                />
                <small v-if="errors.state" class="p-error">{{ errors.state }}</small>
                <small v-else class="text-gray-500">2-letter code</small>
              </div>

              <div class="field">
                <label for="zip_code" class="font-medium text-sm mb-2 block">
                  Zip Code
                </label>
                <InputText
                  id="zip_code"
                  v-model="formData.zip_code"
                  class="w-full"
                  :class="{ 'p-invalid': errors.zip_code }"
                  placeholder="e.g., 62701"
                  maxlength="10"
                />
                <small v-if="errors.zip_code" class="p-error">{{ errors.zip_code }}</small>
              </div>
            </div>

            <!-- Capacity -->
            <div class="field">
              <label for="capacity" class="font-medium text-sm mb-2 block">
                Total Capacity
              </label>
              <InputNumber
                id="capacity"
                v-model="formData.capacity"
                class="w-full"
                :class="{ 'p-invalid': errors.capacity }"
                placeholder="e.g., 500"
                :min="1"
              />
              <small v-if="errors.capacity" class="p-error">{{ errors.capacity }}</small>
              <small v-else class="text-gray-500">Total number of seats in the venue</small>
            </div>

            <!-- Description -->
            <div class="field">
              <label for="description" class="font-medium text-sm mb-2 block">
                Description
              </label>
              <Textarea
                id="description"
                v-model="formData.description"
                class="w-full"
                :class="{ 'p-invalid': errors.description }"
                rows="4"
                placeholder="Additional information about the venue..."
              />
              <small v-if="errors.description" class="p-error">{{ errors.description }}</small>
            </div>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-3">
            <Button
              label="Cancel"
              severity="secondary"
              @click="handleCancel"
              :disabled="saving"
            />
            <Button
              label="Create Venue"
              type="submit"
              :loading="saving"
              icon="pi pi-check"
            />
          </div>
        </template>
      </Card>
    </form>
  </div>
</template>
