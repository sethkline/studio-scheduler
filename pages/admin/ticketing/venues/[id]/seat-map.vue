<script setup lang="ts">
import type { Venue } from '~/types'

/**
 * Seat Map Builder Page
 * Visual editor for creating and managing venue seat layouts
 */

definePageMeta({
  middleware: 'admin'
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { getVenue } = useVenues()

const venueId = route.params.id as string
const venue = ref<Venue | null>(null)
const loading = ref(true)

// Load venue data
onMounted(async () => {
  loading.value = true
  try {
    venue.value = await getVenue(venueId)

    if (!venue.value) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Venue not found',
        life: 3000
      })
      router.push('/admin/ticketing/venues')
      return
    }
  } catch (error) {
    console.error('Failed to load venue:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load venue data',
      life: 3000
    })
    router.push('/admin/ticketing/venues')
  } finally {
    loading.value = false
  }
})

const handleBack = () => {
  router.push(`/admin/ticketing/venues/${venueId}/edit`)
}
</script>

<template>
  <div class="seat-map-page">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Button
            icon="pi pi-arrow-left"
            text
            severity="secondary"
            @click="handleBack"
          />
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Seat Map Builder</h1>
            <p v-if="venue" class="text-gray-600 mt-1">
              {{ venue.name }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Help Button -->
          <Button
            icon="pi pi-question-circle"
            label="Help"
            text
            severity="secondary"
            @click="() => {
              toast.add({
                severity: 'info',
                summary: 'Seat Map Builder Help',
                detail: 'Use the toolbar to add seats and rows. Click and drag seats to reposition them. Hold Ctrl/Cmd to select multiple seats.',
                life: 5000
              })
            }"
          />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="loading" class="flex items-center justify-center h-96">
      <ProgressSpinner />
    </div>

    <div v-else-if="venue" class="seat-map-content">
      <!-- Check if venue has sections and price zones -->
      <div
        v-if="!venue.venue_sections || venue.venue_sections.length === 0 || !venue.price_zones || venue.price_zones.length === 0"
        class="p-6"
      >
        <Card>
          <template #content>
            <div class="text-center py-12">
              <i class="pi pi-exclamation-triangle text-5xl text-yellow-500 mb-4" />
              <h3 class="text-xl font-semibold text-gray-900 mb-2">
                Configuration Required
              </h3>
              <p class="text-gray-600 mb-6">
                Before creating a seat map, you need to configure sections and price zones for this venue.
              </p>

              <div class="flex justify-center gap-3">
                <Button
                  label="Back to Venue Settings"
                  icon="pi pi-arrow-left"
                  severity="secondary"
                  @click="handleBack"
                />
              </div>

              <div class="mt-8 text-left max-w-md mx-auto bg-blue-50 p-4 rounded-lg">
                <h4 class="font-semibold text-blue-900 mb-2">What you need:</h4>
                <ul class="space-y-1 text-sm text-blue-800">
                  <li v-if="!venue.venue_sections || venue.venue_sections.length === 0" class="flex items-start gap-2">
                    <i class="pi pi-times-circle mt-0.5" />
                    <span>At least one section (e.g., Orchestra, Balcony)</span>
                  </li>
                  <li v-else class="flex items-start gap-2">
                    <i class="pi pi-check-circle mt-0.5" />
                    <span>{{ venue.venue_sections.length }} section(s) configured</span>
                  </li>

                  <li v-if="!venue.price_zones || venue.price_zones.length === 0" class="flex items-start gap-2">
                    <i class="pi pi-times-circle mt-0.5" />
                    <span>At least one price zone (e.g., Premium, Standard)</span>
                  </li>
                  <li v-else class="flex items-start gap-2">
                    <i class="pi pi-check-circle mt-0.5" />
                    <span>{{ venue.price_zones.length }} price zone(s) configured</span>
                  </li>
                </ul>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Seat Map Builder -->
      <SeatMapBuilder
        v-else
        :venue-id="venueId"
      />
    </div>
  </div>
</template>

<style scoped>
.seat-map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.seat-map-content {
  flex: 1;
  overflow: hidden;
}
</style>
