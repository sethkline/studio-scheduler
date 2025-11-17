<script setup lang="ts">
import type { ReservationDetails } from '~/types/ticketing'

interface Props {
  reservation: ReservationDetails
  showTitle?: string
  showDate?: string
  showTime?: string
  venueName?: string
}

const props = defineProps<Props>()

const { formatPrice } = useTicketCheckout()

// Calculate totals
const subtotal = computed(() => {
  return props.reservation.seats.reduce((sum, seat) => sum + seat.price_in_cents, 0)
})

const fees = computed(() => {
  // TODO: Add fee calculation logic if needed
  // For now, no fees
  return 0
})

const total = computed(() => {
  return subtotal.value + fees.value
})

// Group seats by section for better display
const seatsBySection = computed(() => {
  const grouped = new Map<string, typeof props.reservation.seats>()

  props.reservation.seats.forEach((seat) => {
    const section = seat.section || 'Unknown Section'
    if (!grouped.has(section)) {
      grouped.set(section, [])
    }
    grouped.get(section)!.push(seat)
  })

  return Array.from(grouped.entries()).map(([section, seats]) => ({
    section,
    seats: seats.sort((a, b) => {
      if (a.row_name === b.row_name) {
        return parseInt(a.seat_number) - parseInt(b.seat_number)
      }
      return a.row_name.localeCompare(b.row_name)
    })
  }))
})
</script>

<template>
  <Card class="mb-4">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-shopping-cart text-primary-600"></i>
        <h2 class="text-xl font-semibold text-gray-900">Order Summary</h2>
      </div>
    </template>

    <template #content>
      <div class="space-y-4">
        <!-- Show Details (if provided) -->
        <div v-if="showTitle || showDate || venueName" class="pb-4 border-b border-gray-200">
          <h3 v-if="showTitle" class="font-semibold text-gray-900">{{ showTitle }}</h3>
          <div class="text-sm text-gray-600 space-y-1 mt-2">
            <div v-if="showDate" class="flex items-center gap-2">
              <i class="pi pi-calendar text-xs"></i>
              <span>{{ showDate }}</span>
            </div>
            <div v-if="showTime" class="flex items-center gap-2">
              <i class="pi pi-clock text-xs"></i>
              <span>{{ showTime }}</span>
            </div>
            <div v-if="venueName" class="flex items-center gap-2">
              <i class="pi pi-map-marker text-xs"></i>
              <span>{{ venueName }}</span>
            </div>
          </div>
        </div>

        <!-- Seats List -->
        <div class="space-y-3">
          <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Selected Seats ({{ reservation.seat_count }})
          </h4>

          <div v-for="group in seatsBySection" :key="group.section" class="space-y-2">
            <div class="text-sm font-medium text-gray-600">{{ group.section }}</div>

            <div
              v-for="seat in group.seats"
              :key="seat.id"
              class="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-2">
                <i
                  class="pi pi-ticket text-primary-600"
                  :class="{ 'pi-wheelchair': seat.handicap_access }"
                ></i>
                <span class="text-sm text-gray-900">
                  Row {{ seat.row_name }}, Seat {{ seat.seat_number }}
                </span>
                <span
                  v-if="seat.handicap_access"
                  class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded"
                >
                  ADA
                </span>
              </div>
              <span class="text-sm font-semibold text-gray-900">
                {{ formatPrice(seat.price_in_cents) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Price Breakdown -->
        <div class="pt-4 border-t border-gray-200 space-y-2">
          <!-- Subtotal -->
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600">Subtotal</span>
            <span class="text-gray-900">{{ formatPrice(subtotal) }}</span>
          </div>

          <!-- Fees (if any) -->
          <div v-if="fees > 0" class="flex justify-between items-center text-sm">
            <span class="text-gray-600">Service Fees</span>
            <span class="text-gray-900">{{ formatPrice(fees) }}</span>
          </div>

          <!-- Total -->
          <div class="flex justify-between items-center pt-2 border-t border-gray-200">
            <span class="text-base font-semibold text-gray-900">Total</span>
            <span class="text-xl font-bold text-primary-600">{{ formatPrice(total) }}</span>
          </div>
        </div>

        <!-- Reservation Timer Notice -->
        <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-start gap-2">
            <i class="pi pi-info-circle text-yellow-600 mt-0.5"></i>
            <div class="text-sm text-yellow-800">
              <p class="font-medium">Seats are temporarily held</p>
              <p class="text-xs mt-1">
                Complete your purchase before the timer expires to secure your seats.
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
/* Add any custom styles here if needed */
</style>
