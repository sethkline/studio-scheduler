<script setup lang="ts">
import type { OrderDetails } from '~/types'

/**
 * Admin Order Details Page
 * View comprehensive details for a specific order
 */

definePageMeta({
  middleware: 'admin',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { getOrder, resendConfirmationEmail, refundOrder } = useTicketOrders()
const toast = useToast()

// State
const order = ref<OrderDetails | null>(null)
const loading = ref(false)
const resendingEmail = ref(false)
const refundDialogVisible = ref(false)
const processingRefund = ref(false)

const orderId = computed(() => route.params.id as string)

// Computed
const canRefund = computed(() => {
  return order.value?.status === 'paid' && order.value?.stripe_payment_intent_id
})

// Load order details
const loadOrder = async () => {
  loading.value = true
  try {
    const result = await getOrder(orderId.value)
    if (result) {
      order.value = result
    }
  } catch (error: any) {
    console.error('Failed to load order:', error)
    // If order not found, redirect to list
    if (error.statusCode === 404) {
      router.push('/admin/ticketing/orders')
    }
  } finally {
    loading.value = false
  }
}

// Resend confirmation email
const handleResendEmail = async () => {
  if (!order.value) return

  resendingEmail.value = true
  try {
    await resendConfirmationEmail(order.value.id)
  } catch (error) {
    // Error toast is shown by composable
    console.error('Failed to resend email:', error)
  } finally {
    resendingEmail.value = false
  }
}

// Handle status change (placeholder for future implementation)
const handleStatusChange = (status: string) => {
  console.log('Status change requested:', status)
  // TODO: Implement status change
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'Status change feature coming soon'
  })
}

// Open refund dialog
const openRefundDialog = () => {
  refundDialogVisible.value = true
}

// Handle refund confirmation
const handleRefundConfirmed = async (amountInCents: number, reason: string) => {
  if (!order.value) return

  processingRefund.value = true
  try {
    await refundOrder(order.value.id, amountInCents, reason)
    refundDialogVisible.value = false

    // Reload order to get updated status
    await loadOrder()
  } catch (error) {
    // Error is already handled by composable
    console.error('Refund error:', error)
  } finally {
    processingRefund.value = false
  }
}

// Back to list
const goBack = () => {
  router.push('/admin/ticketing/orders')
}

// Initial load
onMounted(() => {
  loadOrder()
})

// Meta tags
useHead({
  title: computed(() => {
    return order.value
      ? `Order ${order.value.order_number} - Admin`
      : 'Order Details - Admin'
  })
})
</script>

<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="loading && !order" class="space-y-6">
      <Skeleton height="100px" />
      <Skeleton height="200px" />
      <Skeleton height="300px" />
    </div>

    <!-- Order Details -->
    <div v-else-if="order">
      <!-- Breadcrumb / Back Button -->
      <div class="mb-6">
        <Button
          label="Back to Orders"
          icon="pi pi-arrow-left"
          text
          @click="goBack"
        />
      </div>

      <!-- Order Details Component -->
      <AdminTicketingOrderDetails
        :order="order"
        :loading="resendingEmail"
        @status-changed="handleStatusChange"
        @resend-email="handleResendEmail"
      />

      <!-- Action Buttons -->
      <Card class="mt-6">
        <template #content>
          <div class="flex justify-end gap-3">
            <Button
              label="Print Order"
              icon="pi pi-print"
              severity="secondary"
              outlined
              disabled
            />
            <Button
              label="Refund Order"
              icon="pi pi-replay"
              severity="danger"
              outlined
              :disabled="!canRefund"
              @click="openRefundDialog"
            />
          </div>
          <p v-if="!canRefund" class="text-sm text-gray-500 mt-3 text-right">
            {{ order.status === 'refunded' ? 'Order has already been refunded' : 'Only paid orders can be refunded' }}
          </p>
        </template>
      </Card>

      <!-- Refund Dialog -->
      <AdminTicketingRefundDialog
        v-model:visible="refundDialogVisible"
        :order="order"
        @refund-confirmed="handleRefundConfirmed"
      />
    </div>

    <!-- Error State -->
    <div v-else class="text-center py-12">
      <i class="pi pi-exclamation-triangle text-6xl text-gray-400 mb-4" />
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
      <p class="text-gray-600 mb-6">
        The order you're looking for doesn't exist or has been removed.
      </p>
      <Button
        label="Back to Orders"
        icon="pi pi-arrow-left"
        @click="goBack"
      />
    </div>
  </div>
</template>
