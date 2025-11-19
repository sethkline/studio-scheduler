<script setup lang="ts">
import { z } from 'zod'
import type { Venue } from '~/types'

definePageMeta({
  middleware: 'admin'
})

const { getVenue, updateVenue } = useVenues()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const venueId = route.params.id as string

const loading = ref(true)
const saving = ref(false)
const venue = ref<Venue | null>(null)

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

// Load venue data
onMounted(async () => {
  loading.value = true
  try {
    venue.value = await getVenue(venueId)
    if (venue.value) {
      // Populate form with existing data
      formData.value = {
        name: venue.value.name || '',
        address: venue.value.address || '',
        city: venue.value.city || '',
        state: venue.value.state || '',
        zip_code: venue.value.zip_code || '',
        capacity: venue.value.capacity,
        description: venue.value.description || ''
      }
    }
  } catch (error) {
    console.error('Failed to load venue:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load venue data',
      life: 3000
    })
    // Navigate back if venue not found
    router.push('/admin/ticketing/venues')
  } finally {
    loading.value = false
  }
})

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
    await updateVenue(venueId, {
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
    console.error('Failed to update venue:', error)
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  router.push('/admin/ticketing/venues')
}

// Refresh venue data after section/price zone changes
const refreshVenue = async () => {
  try {
    venue.value = await getVenue(venueId)
  } catch (error) {
    console.error('Failed to refresh venue:', error)
  }
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="mb-6">
      <Button
        icon="pi pi-arrow-left"
        label="Back to Venues"
        text
        @click="handleCancel"
        class="mb-4"
      />
      <h1 class="text-3xl font-bold text-gray-900">Edit Venue</h1>
      <p class="text-gray-600 mt-1">Update venue information</p>
    </div>

    <!-- Loading State -->
    <Card v-if="loading">
      <template #content>
        <div class="flex justify-center items-center py-12">
          <ProgressSpinner />
        </div>
      </template>
    </Card>

    <!-- Form -->
    <form v-else @submit.prevent="handleSubmit">
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
              label="Save Changes"
              type="submit"
              :loading="saving"
              icon="pi pi-check"
            />
          </div>
        </template>
      </Card>

      <!-- Section and Price Zone Management -->
      <div v-if="venue" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <!-- Section Manager -->
        <Card>
          <template #content>
            <VenueSectionManager
              :venue-id="venueId"
              :sections="venue.venue_sections || []"
              @refresh="refreshVenue"
            />
          </template>
        </Card>

        <!-- Price Zone Manager -->
        <Card>
          <template #content>
            <VenuePriceZoneManager
              :venue-id="venueId"
              :price-zones="venue.price_zones || []"
              @refresh="refreshVenue"
            />
          </template>
        </Card>
      </div>

      <!-- Seat Map Builder -->
      <Card v-if="venue" class="mt-6">
        <template #content>
          <div class="text-center py-8">
            <i class="pi pi-th text-5xl text-blue-500 mb-4" />
            <h3 class="text-xl font-semibold text-gray-900 mb-2">
              Seat Map Builder
            </h3>
            <p class="text-gray-600 mb-6">
              Create and manage the visual seat layout for this venue
            </p>

            <!-- Requirements Check -->
            <div
              v-if="!venue.venue_sections || venue.venue_sections.length === 0 || !venue.price_zones || venue.price_zones.length === 0"
              class="max-w-md mx-auto mb-6 bg-yellow-50 p-4 rounded-lg text-left"
            >
              <h4 class="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <i class="pi pi-exclamation-triangle" />
                Configuration Required
              </h4>
              <ul class="space-y-1 text-sm text-yellow-800">
                <li v-if="!venue.venue_sections || venue.venue_sections.length === 0">
                  • Add at least one section above
                </li>
                <li v-if="!venue.price_zones || venue.price_zones.length === 0">
                  • Add at least one price zone above
                </li>
              </ul>
            </div>

            <Button
              label="Open Seat Map Builder"
              icon="pi pi-external-link"
              size="large"
              :disabled="!venue.venue_sections || venue.venue_sections.length === 0 || !venue.price_zones || venue.price_zones.length === 0"
              @click="router.push(`/admin/ticketing/venues/${venueId}/seat-map`)"
            />
          </div>
        </template>
      </Card>
    </form>
  </div>
</template>
