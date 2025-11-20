<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Shopping Cart</h2>
        <Badge v-if="showCount > 0" :value="showCount" severity="info" />
      </div>
    </template>

    <template #content>
      <!-- Empty State -->
      <div v-if="cart.items.length === 0" class="text-center py-8">
        <i class="pi pi-shopping-cart text-5xl text-gray-300 mb-4"></i>
        <p class="text-gray-600">Your cart is empty</p>
        <Button
          label="Browse Shows"
          icon="pi pi-search"
          class="mt-4"
          outlined
          @click="router.push('/public/recitals')"
        />
      </div>

      <!-- Cart Items -->
      <div v-else class="space-y-4">
        <div
          v-for="item in cart.items"
          :key="item.show_id"
          class="border border-gray-200 rounded-lg p-4"
        >
          <!-- Show Header -->
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="font-semibold text-gray-900">{{ item.show_name }}</h3>
              <p class="text-sm text-gray-600">
                {{ formatDate(item.show_date) }} at {{ formatTime(item.show_time) }}
              </p>
              <p v-if="item.show_location" class="text-sm text-gray-500">
                {{ item.show_location }}
              </p>
            </div>
            <Button
              icon="pi pi-times"
              text
              severity="danger"
              size="small"
              @click="removeFromCart(item.show_id)"
              aria-label="Remove from cart"
            />
          </div>

          <!-- Seats -->
          <div class="space-y-2 mb-3">
            <div
              v-for="seat in item.seats"
              :key="seat.id"
              class="flex justify-between items-center text-sm"
            >
              <span class="text-gray-700">
                {{ seat.section }} - Row {{ seat.row_name }}, Seat {{ seat.seat_number }}
              </span>
              <span class="font-medium">
                ${{ formatPrice(seat.price_in_cents || 0) }}
              </span>
            </div>
          </div>

          <!-- Subtotal & Actions -->
          <div class="flex justify-between items-center pt-3 border-t border-gray-200">
            <Button
              label="Edit Seats"
              icon="pi pi-pencil"
              text
              size="small"
              @click="editShow(item.show_id)"
            />
            <span class="font-semibold">
              Subtotal: ${{ formatPrice(item.seats.reduce((sum, s) => sum + (s.price_in_cents || 0), 0)) }}
            </span>
          </div>
        </div>

        <!-- Cart Total -->
        <div class="border-t-2 border-gray-300 pt-4">
          <div class="flex justify-between items-center text-lg font-bold">
            <span>Total ({{ showCount }} show{{ showCount > 1 ? 's' : '' }})</span>
            <span>${{ formatPrice(totalAmount) }}</span>
          </div>

          <div class="text-sm text-gray-600 mt-2">
            {{ itemCount }} ticket{{ itemCount > 1 ? 's' : '' }} total
          </div>
        </div>

        <!-- Checkout Button -->
        <Button
          label="Proceed to Checkout"
          icon="pi pi-arrow-right"
          iconPos="right"
          class="w-full"
          size="large"
          @click="goToCheckout"
        />

        <!-- Continue Shopping -->
        <Button
          label="Continue Shopping"
          icon="pi pi-search"
          outlined
          class="w-full"
          @click="router.push('/public/recitals')"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
const { cart, removeFromCart, totalAmount, showCount, itemCount } = useShoppingCart()
const router = useRouter()

const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

const goToCheckout = () => {
  router.push('/cart/checkout')
}

const editShow = (showId: string) => {
  router.push(`/public/recitals/${showId}/seating`)
}
</script>
