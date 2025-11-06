<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <ProgressSpinner />
    </div>

    <!-- Error State -->
    <Message v-else-if="error" severity="error" class="mb-4">
      {{ error }}
    </Message>

    <!-- Empty State -->
    <div v-else-if="!orders || orders.length === 0" class="text-center py-20">
      <i class="pi pi-shopping-bag text-6xl text-gray-300 mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">No orders yet</h3>
      <p class="text-gray-500 mb-6">Start shopping to see your orders here</p>
      <Button
        label="Shop Now"
        icon="pi pi-shopping-bag"
        @click="navigateTo('/merchandise')"
      />
    </div>

    <!-- Orders List -->
    <div v-else class="space-y-6">
      <Card v-for="order in orders" :key="order.id">
        <template #title>
          <div class="flex items-center justify-between">
            <span>Order {{ order.order_number }}</span>
            <Tag
              :value="order.order_status"
              :severity="getOrderStatusSeverity(order.order_status)"
            />
          </div>
        </template>

        <template #subtitle>
          <div class="text-sm text-gray-600">
            {{ formatDate(order.order_date) }}
          </div>
        </template>

        <template #content>
          <!-- Order Items -->
          <div class="mb-4">
            <h4 class="font-semibold mb-2">Items</h4>
            <div class="space-y-2">
              <div
                v-for="item in order.items"
                :key="item.id"
                class="flex items-center gap-4 p-2 bg-gray-50 rounded"
              >
                <img
                  :src="item.product_snapshot.image_url || '/placeholder-product.png'"
                  :alt="item.product_snapshot.product_name"
                  class="w-16 h-16 object-cover rounded"
                />

                <div class="flex-1">
                  <div class="font-medium">{{ item.product_snapshot.product_name }}</div>
                  <div class="text-sm text-gray-600">
                    <span v-if="item.product_snapshot.variant_size">
                      Size: {{ item.product_snapshot.variant_size }}
                    </span>
                    <span v-if="item.product_snapshot.variant_color" class="ml-2">
                      Color: {{ item.product_snapshot.variant_color }}
                    </span>
                  </div>
                  <div class="text-sm text-gray-600">
                    Quantity: {{ item.quantity }}
                  </div>
                </div>

                <div class="font-semibold">
                  {{ formatPrice(item.total_price_in_cents) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Order Summary -->
          <div class="bg-gray-50 p-4 rounded space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Subtotal:</span>
              <span>{{ formatPrice(order.subtotal_in_cents) }}</span>
            </div>

            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Tax:</span>
              <span>{{ formatPrice(order.tax_in_cents) }}</span>
            </div>

            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Shipping:</span>
              <span>{{ formatPrice(order.shipping_cost_in_cents) }}</span>
            </div>

            <Divider />

            <div class="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span class="text-primary-600">{{ formatPrice(order.total_in_cents) }}</span>
            </div>
          </div>

          <!-- Fulfillment Info -->
          <div class="mt-4 text-sm text-gray-600">
            <div>
              <strong>Fulfillment Method:</strong>
              {{ order.fulfillment_method === 'pickup' ? 'Pickup at Studio' : 'Shipping' }}
            </div>

            <div v-if="order.shipping_address" class="mt-2">
              <strong>Shipping Address:</strong><br>
              {{ order.shipping_address.street }}<br>
              <span v-if="order.shipping_address.street2">
                {{ order.shipping_address.street2 }}<br>
              </span>
              {{ order.shipping_address.city }}, {{ order.shipping_address.state }}
              {{ order.shipping_address.postal_code }}
            </div>

            <div v-if="order.notes" class="mt-2">
              <strong>Notes:</strong> {{ order.notes }}
            </div>
          </div>

          <!-- Payment Status -->
          <div class="mt-4">
            <Tag
              :value="`Payment: ${order.payment_status}`"
              :severity="getPaymentStatusSeverity(order.payment_status)"
            />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { OrderWithItems } from '~/types/merchandise'

// Page meta
definePageMeta({
  layout: 'default',
  middleware: 'auth' // Require authentication
})

// State
const orders = ref<OrderWithItems[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Services
const { fetchMyOrders } = useMerchandiseService()

// Methods
const loadOrders = async () => {
  loading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await fetchMyOrders()

    if (fetchError.value) {
      throw new Error(fetchError.value.message)
    }

    if (data.value) {
      orders.value = data.value.orders
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load orders'
    console.error('Error loading orders:', err)
  } finally {
    loading.value = false
  }
}

const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getOrderStatusSeverity = (status: string): string => {
  const severityMap: Record<string, string> = {
    pending: 'warning',
    processing: 'info',
    ready: 'success',
    completed: 'success',
    cancelled: 'danger'
  }
  return severityMap[status] || 'secondary'
}

const getPaymentStatusSeverity = (status: string): string => {
  const severityMap: Record<string, string> = {
    pending: 'warning',
    completed: 'success',
    failed: 'danger',
    refunded: 'info'
  }
  return severityMap[status] || 'secondary'
}

// Lifecycle
onMounted(() => {
  loadOrders()
})
</script>
