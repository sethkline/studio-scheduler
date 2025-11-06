<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

    <!-- Redirect if cart is empty -->
    <div v-if="cartStore.isEmpty" class="text-center py-20">
      <i class="pi pi-shopping-cart text-6xl text-gray-300 mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h3>
      <p class="text-gray-500 mb-6">Add some items before checking out</p>
      <Button
        label="Shop Now"
        icon="pi pi-shopping-bag"
        @click="navigateTo('/merchandise')"
      />
    </div>

    <!-- Checkout Form -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Checkout Details -->
      <div class="lg:col-span-2">
        <Card>
          <template #title>
            Checkout Information
          </template>

          <template #content>
            <form @submit.prevent="processOrder">
              <!-- Customer Information -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold mb-4">Contact Information</h3>

                <div class="grid grid-cols-1 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span class="text-red-500">*</span>
                    </label>
                    <InputText
                      v-model="checkoutForm.customer_name"
                      required
                      class="w-full"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Email <span class="text-red-500">*</span>
                    </label>
                    <InputText
                      v-model="checkoutForm.email"
                      type="email"
                      required
                      class="w-full"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <InputText
                      v-model="checkoutForm.phone"
                      type="tel"
                      class="w-full"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <Divider />

              <!-- Fulfillment Method -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold mb-4">Fulfillment Method</h3>

                <div class="space-y-2">
                  <div class="flex items-center">
                    <RadioButton
                      v-model="checkoutForm.fulfillment_method"
                      input-id="pickup"
                      value="pickup"
                    />
                    <label for="pickup" class="ml-2">
                      Pickup at Studio (Free)
                    </label>
                  </div>

                  <div class="flex items-center">
                    <RadioButton
                      v-model="checkoutForm.fulfillment_method"
                      input-id="shipping"
                      value="shipping"
                    />
                    <label for="shipping" class="ml-2">
                      Shipping ($10.00)
                    </label>
                  </div>
                </div>
              </div>

              <!-- Shipping Address -->
              <div v-if="checkoutForm.fulfillment_method === 'shipping'" class="mb-6">
                <h3 class="text-lg font-semibold mb-4">Shipping Address</h3>

                <div class="grid grid-cols-1 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Street Address <span class="text-red-500">*</span>
                    </label>
                    <InputText
                      v-model="shippingAddress.street"
                      required
                      class="w-full"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Apartment, Suite, etc.
                    </label>
                    <InputText
                      v-model="shippingAddress.street2"
                      class="w-full"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        City <span class="text-red-500">*</span>
                      </label>
                      <InputText
                        v-model="shippingAddress.city"
                        required
                        class="w-full"
                      />
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        State <span class="text-red-500">*</span>
                      </label>
                      <InputText
                        v-model="shippingAddress.state"
                        required
                        class="w-full"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code <span class="text-red-500">*</span>
                      </label>
                      <InputText
                        v-model="shippingAddress.postal_code"
                        required
                        class="w-full"
                      />
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Country <span class="text-red-500">*</span>
                      </label>
                      <InputText
                        v-model="shippingAddress.country"
                        required
                        class="w-full"
                        value="USA"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Divider />

              <!-- Order Notes -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Order Notes (Optional)
                </label>
                <Textarea
                  v-model="checkoutForm.notes"
                  rows="3"
                  class="w-full"
                  placeholder="Any special instructions?"
                />
              </div>

              <!-- Error Message -->
              <Message v-if="error" severity="error" class="mb-4">
                {{ error }}
              </Message>

              <!-- Submit Button -->
              <Button
                type="submit"
                label="Place Order"
                icon="pi pi-check"
                :loading="processing"
                :disabled="!canPlaceOrder"
                class="w-full"
                size="large"
              />
            </form>
          </template>
        </Card>
      </div>

      <!-- Order Summary -->
      <div>
        <Card>
          <template #title>
            Order Summary
          </template>

          <template #content>
            <div class="space-y-4">
              <!-- Cart Items -->
              <div class="space-y-2">
                <div
                  v-for="item in cartStore.items"
                  :key="item.variant_id"
                  class="flex justify-between text-sm"
                >
                  <span class="text-gray-600">
                    {{ item.product_name }} x {{ item.quantity }}
                  </span>
                  <span class="font-medium">
                    {{ formatPrice(item.unit_price_in_cents * item.quantity) }}
                  </span>
                </div>
              </div>

              <Divider />

              <div class="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{{ formatPrice(cartStore.subtotalInCents) }}</span>
              </div>

              <div class="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{{ formatPrice(cartStore.taxInCents) }}</span>
              </div>

              <div class="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{{ formatPrice(shippingCost) }}</span>
              </div>

              <Divider />

              <div class="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span class="text-primary-600">
                  {{ formatPrice(totalWithShipping) }}
                </span>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCartStore } from '~/stores/cart'
import { useToast } from 'primevue/usetoast'
import type { CheckoutFormData, ShippingAddress } from '~/types/merchandise'

// Page meta
definePageMeta({
  layout: 'default'
})

// Store
const cartStore = useCartStore()
const toast = useToast()

// State
const checkoutForm = ref<CheckoutFormData>({
  customer_name: '',
  email: '',
  phone: '',
  fulfillment_method: 'pickup',
  notes: ''
})

const shippingAddress = ref<ShippingAddress>({
  street: '',
  street2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'USA'
})

const processing = ref(false)
const error = ref<string | null>(null)

// Services
const { createOrder, createPaymentIntent, confirmPayment } = useMerchandiseService()

// Computed
const shippingCost = computed(() => {
  return checkoutForm.value.fulfillment_method === 'shipping' ? 1000 : 0
})

const totalWithShipping = computed(() => {
  return cartStore.totalInCents + shippingCost.value
})

const canPlaceOrder = computed(() => {
  if (!checkoutForm.value.customer_name || !checkoutForm.value.email) {
    return false
  }

  if (checkoutForm.value.fulfillment_method === 'shipping') {
    return !!(
      shippingAddress.value.street &&
      shippingAddress.value.city &&
      shippingAddress.value.state &&
      shippingAddress.value.postal_code
    )
  }

  return true
})

// Methods
const processOrder = async () => {
  processing.value = true
  error.value = null

  try {
    // Prepare checkout data
    const checkoutData = {
      ...checkoutForm.value,
      shipping_address: checkoutForm.value.fulfillment_method === 'shipping'
        ? shippingAddress.value
        : undefined
    }

    // Create the order
    const { data: orderData, error: orderError } = await createOrder({
      items: cartStore.items,
      checkout: checkoutData
    })

    if (orderError.value) {
      throw new Error(orderError.value.message)
    }

    if (!orderData.value?.order) {
      throw new Error('Failed to create order')
    }

    // For now, we'll skip Stripe integration and just show success
    // In production, you would integrate Stripe Elements here

    // Clear cart
    cartStore.clearCart()

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Order Placed',
      detail: `Order ${orderData.value.order.order_number} has been created successfully!`,
      life: 5000
    })

    // Redirect to order confirmation or history
    setTimeout(() => {
      navigateTo('/merchandise/orders')
    }, 2000)

  } catch (err: any) {
    error.value = err.message || 'Failed to process order'
    console.error('Checkout error:', err)

    toast.add({
      severity: 'error',
      summary: 'Order Failed',
      detail: error.value,
      life: 5000
    })
  } finally {
    processing.value = false
  }
}

const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`
}

// Initialize cart
onMounted(() => {
  cartStore.initializeCart()
})
</script>
