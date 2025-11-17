<script setup lang="ts">
import type { OrderDetails } from '~/types'

/**
 * Refund confirmation dialog
 * Allows admin to process full or partial refunds
 */

interface Props {
  visible: boolean
  order: OrderDetails | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'refund-confirmed': [amountInCents: number, reason: string]
}>()

const { formatCurrency } = useTicketOrders()

// State
const refundType = ref<'full' | 'partial'>('full')
const partialAmount = ref<number>(0)
const reason = ref<string>('')
const processing = ref(false)

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const maxRefundAmount = computed(() => {
  return props.order?.total_amount_in_cents || 0
})

const refundAmount = computed(() => {
  if (refundType.value === 'full') {
    return maxRefundAmount.value
  }
  return Math.min(partialAmount.value * 100, maxRefundAmount.value)
})

const isValidRefund = computed(() => {
  if (!props.order) return false
  if (refundType.value === 'full') return true
  return refundAmount.value > 0 && refundAmount.value <= maxRefundAmount.value
})

// Methods
const handleConfirm = () => {
  if (!isValidRefund.value) return

  emit('refund-confirmed', refundAmount.value, reason.value)
}

const handleCancel = () => {
  dialogVisible.value = false
  resetForm()
}

const resetForm = () => {
  refundType.value = 'full'
  partialAmount.value = 0
  reason.value = ''
}

// Watch for dialog visibility
watch(dialogVisible, (isVisible) => {
  if (!isVisible) {
    resetForm()
  }
})
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :closable="!processing"
    :dismissableMask="!processing"
    class="w-full max-w-2xl"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <i class="pi pi-replay text-red-600 text-2xl" />
        <div>
          <h3 class="text-xl font-bold text-gray-900 m-0">Issue Refund</h3>
          <p v-if="order" class="text-sm text-gray-500 m-0 mt-1">
            Order #{{ order.order_number }}
          </p>
        </div>
      </div>
    </template>

    <div v-if="order" class="space-y-6">
      <!-- Warning Message -->
      <Message severity="warn" :closable="false">
        <p class="m-0">
          <strong>Warning:</strong> This action will process a refund through Stripe.
          {{ refundType === 'full' ? 'All seats will be released back to available.' : 'Seats will remain sold for partial refunds.' }}
        </p>
      </Message>

      <!-- Order Summary -->
      <Card class="bg-gray-50">
        <template #content>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Customer</label>
              <p class="text-base font-semibold text-gray-900">{{ order.customer_name }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Order Total</label>
              <p class="text-base font-semibold text-gray-900">
                {{ formatCurrency(order.total_amount_in_cents) }}
              </p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Show</label>
              <p class="text-base font-semibold text-gray-900">{{ order.show.title }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Tickets</label>
              <p class="text-base font-semibold text-gray-900">{{ order.tickets.length }}</p>
            </div>
          </div>
        </template>
      </Card>

      <!-- Refund Type Selection -->
      <div class="space-y-3">
        <label class="text-sm font-semibold text-gray-900">Refund Type</label>
        <div class="flex gap-4">
          <div class="flex items-center">
            <RadioButton
              v-model="refundType"
              inputId="refund-full"
              value="full"
              :disabled="processing"
            />
            <label for="refund-full" class="ml-2 cursor-pointer">
              Full Refund ({{ formatCurrency(maxRefundAmount) }})
            </label>
          </div>
          <div class="flex items-center">
            <RadioButton
              v-model="refundType"
              inputId="refund-partial"
              value="partial"
              :disabled="processing"
            />
            <label for="refund-partial" class="ml-2 cursor-pointer">
              Partial Refund
            </label>
          </div>
        </div>
      </div>

      <!-- Partial Amount Input -->
      <div v-if="refundType === 'partial'" class="space-y-2">
        <label for="partial-amount" class="text-sm font-semibold text-gray-900">
          Refund Amount
        </label>
        <div class="flex gap-2 items-center">
          <span class="text-gray-700 font-medium">$</span>
          <InputNumber
            id="partial-amount"
            v-model="partialAmount"
            :min="0.01"
            :max="maxRefundAmount / 100"
            :minFractionDigits="2"
            :maxFractionDigits="2"
            :disabled="processing"
            class="flex-1"
            placeholder="0.00"
          />
        </div>
        <p class="text-xs text-gray-500">
          Maximum: {{ formatCurrency(maxRefundAmount) }}
        </p>
      </div>

      <!-- Reason Input -->
      <div class="space-y-2">
        <label for="refund-reason" class="text-sm font-semibold text-gray-900">
          Reason (Optional)
        </label>
        <Textarea
          id="refund-reason"
          v-model="reason"
          :disabled="processing"
          rows="3"
          class="w-full"
          placeholder="Enter reason for refund (e.g., event cancelled, customer request, etc.)"
        />
      </div>

      <!-- Refund Summary -->
      <Card v-if="isValidRefund" class="bg-red-50 border border-red-200">
        <template #content>
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm font-medium text-gray-700">Total Refund Amount</p>
              <p class="text-xs text-gray-500 mt-1">
                {{ refundType === 'full' ? 'Full refund - all seats will be released' : 'Partial refund - seats remain sold' }}
              </p>
            </div>
            <p class="text-2xl font-bold text-red-600">
              {{ formatCurrency(refundAmount) }}
            </p>
          </div>
        </template>
      </Card>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="handleCancel"
          :disabled="processing"
        />
        <Button
          label="Process Refund"
          severity="danger"
          @click="handleConfirm"
          :disabled="!isValidRefund || processing"
          :loading="processing"
        />
      </div>
    </template>
  </Dialog>
</template>
