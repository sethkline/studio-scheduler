<script setup lang="ts">
import type { PriceZone } from '~/types'

/**
 * PriceZonePanel - Panel showing price zones and allowing assignment to seats
 */

const store = useSeatMapBuilderStore()

const formatPrice = (priceInCents: number) => {
  return `$${(priceInCents / 100).toFixed(2)}`
}

const selectPriceZone = (zoneId: string) => {
  store.selectedPriceZoneId = zoneId
}

const applyPriceZoneToSelected = async () => {
  if (!store.selectedPriceZoneId || store.selectedSeats.length === 0) {
    return
  }

  const toast = useToast()

  try {
    // Update all selected seats with the selected price zone
    for (const seatId of store.selectedSeats) {
      await store.updateSeat(seatId, {
        price_zone_id: store.selectedPriceZoneId
      })
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Price zone applied to ${store.selectedSeats.length} seat(s)`,
      life: 3000
    })
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to apply price zone',
      life: 3000
    })
  }
}

const getSeatCountForZone = (zoneId: string) => {
  return store.seatsByPriceZone(zoneId).length
}
</script>

<template>
  <div class="price-zone-panel bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Price Zones</h3>

    <!-- Price Zone List -->
    <div class="space-y-2 mb-4">
      <div
        v-for="zone in store.priceZones"
        :key="zone.id"
        class="price-zone-item p-3 rounded-lg border cursor-pointer transition-all"
        :class="{
          'border-blue-500 bg-blue-50': store.selectedPriceZoneId === zone.id,
          'border-gray-200 hover:border-gray-300 hover:bg-gray-50': store.selectedPriceZoneId !== zone.id
        }"
        @click="selectPriceZone(zone.id)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- Color Indicator -->
            <div
              class="w-6 h-6 rounded border border-gray-300"
              :style="{ backgroundColor: zone.color || '#10B981' }"
            />

            <!-- Zone Info -->
            <div>
              <div class="font-medium text-gray-900">{{ zone.name }}</div>
              <div class="text-sm text-gray-500">{{ formatPrice(zone.price_in_cents) }}</div>
            </div>
          </div>

          <!-- Seat Count Badge -->
          <div class="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {{ getSeatCountForZone(zone.id) }} seats
          </div>
        </div>

        <!-- Selected Indicator -->
        <div
          v-if="store.selectedPriceZoneId === zone.id"
          class="mt-2 flex items-center gap-1 text-xs text-blue-600"
        >
          <i class="pi pi-check-circle" />
          <span>Selected</span>
        </div>
      </div>

      <!-- No Price Zones Message -->
      <div v-if="store.priceZones.length === 0" class="text-center text-gray-500 py-8">
        <i class="pi pi-info-circle text-2xl mb-2" />
        <p class="text-sm">No price zones configured</p>
        <p class="text-xs mt-1">Add price zones in the venue settings</p>
      </div>
    </div>

    <!-- Apply Button -->
    <Button
      v-if="store.selectedPriceZoneId && store.selectedSeats.length > 0"
      label="Apply to Selected Seats"
      icon="pi pi-check"
      class="w-full"
      :disabled="store.saving"
      :loading="store.saving"
      @click="applyPriceZoneToSelected"
    />

    <!-- Seat Type Legend -->
    <div class="mt-6 pt-4 border-t border-gray-200">
      <h4 class="text-sm font-semibold text-gray-700 mb-2">Seat Types</h4>
      <div class="space-y-2 text-xs">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded bg-green-500" />
          <span>Regular</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded bg-blue-500" />
          <span>ADA (Accessible)</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded bg-purple-500" />
          <span>House (Complimentary)</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded bg-gray-500" />
          <span>Blocked (Not for sale)</span>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <h4 class="text-sm font-semibold text-gray-700 mb-2">Statistics</h4>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="bg-gray-50 p-2 rounded">
          <div class="text-gray-500">Total Seats</div>
          <div class="text-lg font-bold text-gray-900">{{ store.totalSeats }}</div>
        </div>
        <div class="bg-green-50 p-2 rounded">
          <div class="text-gray-500">Sellable</div>
          <div class="text-lg font-bold text-green-700">
            {{ store.seats.filter(s => s.is_sellable).length }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.price-zone-item {
  transition: all 0.15s ease;
}
</style>
