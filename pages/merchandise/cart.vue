<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

    <!-- Empty Cart -->
    <div v-if="cartStore.isEmpty" class="text-center py-20">
      <i class="pi pi-shopping-cart text-6xl text-gray-300 mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h3>
      <p class="text-gray-500 mb-6">Add some items to get started!</p>
      <Button
        label="Shop Now"
        icon="pi pi-shopping-bag"
        @click="navigateTo('/merchandise')"
      />
    </div>

    <!-- Cart Items -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Items List -->
      <div class="lg:col-span-2">
        <Card
          v-for="item in cartStore.items"
          :key="item.variant_id"
          class="mb-4"
        >
          <template #content>
            <div class="flex gap-4">
              <!-- Product Image -->
              <img
                :src="item.image_url || '/placeholder-product.png'"
                :alt="item.product_name"
                class="w-24 h-24 object-cover rounded"
              />

              <!-- Product Info -->
              <div class="flex-1">
                <h3 class="font-semibold text-lg mb-1">{{ item.product_name }}</h3>
                <div class="text-sm text-gray-600 space-y-1">
                  <p v-if="item.variant_size">Size: {{ item.variant_size }}</p>
                  <p v-if="item.variant_color">Color: {{ item.variant_color }}</p>
                  <p class="font-medium text-primary-600">
                    {{ formatPrice(item.unit_price_in_cents) }} each
                  </p>
                </div>

                <!-- Quantity Control -->
                <div class="mt-4 flex items-center gap-4">
                  <InputNumber
                    :model-value="item.quantity"
                    :min="1"
                    :max="item.max_quantity"
                    show-buttons
                    @update:model-value="(val) => updateQuantity(item.variant_id, val)"
                    class="w-32"
                  />

                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    @click="removeItem(item.variant_id)"
                    v-tooltip.top="'Remove item'"
                  />
                </div>
              </div>

              <!-- Item Total -->
              <div class="text-right">
                <div class="text-lg font-bold text-gray-900">
                  {{ formatPrice(item.unit_price_in_cents * item.quantity) }}
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Clear Cart Button -->
        <div class="mt-6">
          <Button
            label="Clear Cart"
            icon="pi pi-trash"
            severity="danger"
            outlined
            @click="confirmClearCart"
          />
        </div>
      </div>

      <!-- Order Summary -->
      <div>
        <Card>
          <template #title>
            Order Summary
          </template>

          <template #content>
            <div class="space-y-4">
              <div class="flex justify-between text-gray-600">
                <span>Subtotal ({{ cartStore.itemCount }} items)</span>
                <span>{{ formatPrice(cartStore.subtotalInCents) }}</span>
              </div>

              <div class="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{{ formatPrice(cartStore.taxInCents) }}</span>
              </div>

              <Divider />

              <div class="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span class="text-primary-600">
                  {{ formatPrice(cartStore.totalInCents) }}
                </span>
              </div>

              <p class="text-sm text-gray-500">
                Shipping cost will be calculated at checkout
              </p>

              <Button
                label="Proceed to Checkout"
                icon="pi pi-arrow-right"
                icon-pos="right"
                @click="navigateTo('/merchandise/checkout')"
                class="w-full"
                size="large"
              />

              <Button
                label="Continue Shopping"
                icon="pi pi-shopping-bag"
                outlined
                @click="navigateTo('/merchandise')"
                class="w-full"
              />
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Confirm Clear Cart Dialog -->
    <Dialog
      v-model:visible="showClearDialog"
      header="Clear Cart"
      :modal="true"
      class="w-96"
    >
      <p class="mb-4">Are you sure you want to remove all items from your cart?</p>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="showClearDialog = false"
        />
        <Button
          label="Clear Cart"
          severity="danger"
          @click="clearCart"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCartStore } from '~/stores/cart'
import { useToast } from 'primevue/usetoast'

// Page meta
definePageMeta({
  layout: 'default'
})

// Store
const cartStore = useCartStore()
const toast = useToast()

// State
const showClearDialog = ref(false)

// Methods
const updateQuantity = (variantId: string, quantity: number | null) => {
  if (quantity === null) return

  cartStore.updateQuantity(variantId, quantity)

  if (cartStore.error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: cartStore.error,
      life: 3000
    })
    cartStore.clearError()
  }
}

const removeItem = (variantId: string) => {
  cartStore.removeItem(variantId)

  toast.add({
    severity: 'success',
    summary: 'Item Removed',
    detail: 'Item has been removed from your cart',
    life: 3000
  })
}

const confirmClearCart = () => {
  showClearDialog.value = true
}

const clearCart = () => {
  cartStore.clearCart()
  showClearDialog.value = false

  toast.add({
    severity: 'success',
    summary: 'Cart Cleared',
    detail: 'All items have been removed from your cart',
    life: 3000
  })
}

const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`
}

// Initialize cart on mount
onMounted(() => {
  cartStore.initializeCart()
})
</script>
