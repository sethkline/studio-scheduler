<script setup lang="ts">
import type { OrderDetails } from '~/types'

/**
 * Order details display component
 * Shows comprehensive order information for admin
 */

interface Props {
  order: OrderDetails
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  'status-changed': [status: string]
  'resend-email': []
}>()

const { formatCurrency, formatStatus, getStatusSeverity } = useTicketOrders()
const toast = useToast()

// Format date/time
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

// Calculate totals
const ticketSubtotal = computed(() => {
  return props.order.tickets.reduce((sum, ticket) => {
    return sum + (ticket.show_seat?.price_in_cents || 0)
  }, 0)
})

const upsellSubtotal = computed(() => {
  return props.order.order_items
    .filter((item) => item.item_type !== 'ticket')
    .reduce((sum, item) => sum + item.price_in_cents * item.quantity, 0)
})

// Copy to clipboard
const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: `${label} copied to clipboard`,
      life: 2000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to copy to clipboard'
    })
  }
}

// Resend email
const handleResendEmail = () => {
  emit('resend-email')
}

// Get seat display name
const getSeatDisplay = (ticket: any) => {
  const seat = ticket.show_seat?.seat
  if (!seat) return 'Unknown'

  const section = seat.section?.name || ''
  return `${section} Row ${seat.row_name} Seat ${seat.seat_number}`
}

// Get ticket status icon
const getTicketStatusIcon = (ticket: any) => {
  if (ticket.scanned_at) return 'pi-check-circle'
  if (ticket.pdf_generated_at) return 'pi-file-pdf'
  return 'pi-circle'
}

// Get ticket status color
const getTicketStatusColor = (ticket: any) => {
  if (ticket.scanned_at) return 'text-green-600'
  if (ticket.pdf_generated_at) return 'text-blue-600'
  return 'text-gray-400'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Card -->
    <Card>
      <template #content>
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h2 class="text-2xl font-bold text-gray-900">
                Order {{ order.order_number }}
              </h2>
              <Tag
                :value="formatStatus(order.status)"
                :severity="getStatusSeverity(order.status)"
                class="text-base"
              />
            </div>
            <p class="text-sm text-gray-500">
              Placed on {{ formatDateTime(order.created_at) }}
            </p>
          </div>

          <div class="flex gap-2">
            <Button
              label="Resend Email"
              icon="pi pi-envelope"
              severity="secondary"
              outlined
              :loading="loading"
              @click="handleResendEmail"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Show Information -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-calendar text-primary-500" />
          <span>Show Information</span>
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-gray-500">Show Title</label>
            <p class="text-lg font-semibold text-gray-900">{{ order.show.title }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Venue</label>
            <p class="text-lg font-semibold text-gray-900">{{ order.show.venue_name }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Date</label>
            <p class="text-lg font-semibold text-gray-900">{{ formatDate(order.show.show_date) }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Time</label>
            <p class="text-lg font-semibold text-gray-900">{{ order.show.show_time }}</p>
          </div>
        </div>
      </template>
    </Card>

    <!-- Customer Information -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-user text-primary-500" />
          <span>Customer Information</span>
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-gray-500">Name</label>
            <p class="text-lg font-semibold text-gray-900">{{ order.customer_name }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Email</label>
            <div class="flex items-center gap-2">
              <p class="text-lg font-semibold text-gray-900">{{ order.customer_email }}</p>
              <Button
                icon="pi pi-copy"
                text
                rounded
                size="small"
                @click="copyToClipboard(order.customer_email, 'Email')"
              />
            </div>
          </div>
          <div v-if="order.customer_phone">
            <label class="text-sm font-medium text-gray-500">Phone</label>
            <div class="flex items-center gap-2">
              <p class="text-lg font-semibold text-gray-900">{{ order.customer_phone }}</p>
              <Button
                icon="pi pi-copy"
                text
                rounded
                size="small"
                @click="copyToClipboard(order.customer_phone, 'Phone')"
              />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Tickets -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-ticket text-primary-500" />
          <span>Tickets ({{ order.tickets.length }})</span>
        </div>
      </template>
      <template #content>
        <div class="space-y-3">
          <div
            v-for="ticket in order.tickets"
            :key="ticket.id"
            class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center gap-4">
              <i
                :class="[getTicketStatusIcon(ticket), getTicketStatusColor(ticket), 'text-xl']"
              />
              <div>
                <p class="font-semibold text-gray-900">{{ getSeatDisplay(ticket) }}</p>
                <p class="text-sm text-gray-500 font-mono">{{ ticket.ticket_number }}</p>
                <p v-if="ticket.scanned_at" class="text-xs text-green-600 mt-1">
                  Scanned on {{ formatDateTime(ticket.scanned_at) }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-semibold text-gray-900">
                {{ formatCurrency(ticket.show_seat?.price_in_cents || 0) }}
              </p>
              <div v-if="ticket.pdf_url" class="mt-1">
                <a
                  :href="ticket.pdf_url"
                  target="_blank"
                  class="text-xs text-primary-600 hover:text-primary-700 hover:underline"
                >
                  View PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Order Items (Upsells) -->
    <Card v-if="order.order_items && order.order_items.length > 0">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-shopping-bag text-primary-500" />
          <span>Additional Items</span>
        </div>
      </template>
      <template #content>
        <div class="space-y-2">
          <div
            v-for="item in order.order_items.filter(i => i.item_type !== 'ticket')"
            :key="item.id"
            class="flex justify-between items-center p-3 border-b border-gray-100 last:border-0"
          >
            <div>
              <p class="font-medium text-gray-900">{{ item.item_name }}</p>
              <p class="text-sm text-gray-500">Quantity: {{ item.quantity }}</p>
            </div>
            <p class="font-semibold text-gray-900">
              {{ formatCurrency(item.price_in_cents * item.quantity) }}
            </p>
          </div>
        </div>
      </template>
    </Card>

    <!-- Payment Information -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-credit-card text-primary-500" />
          <span>Payment Information</span>
        </div>
      </template>
      <template #content>
        <div class="space-y-4">
          <!-- Order Summary -->
          <div class="space-y-2">
            <div class="flex justify-between text-gray-700">
              <span>Tickets Subtotal</span>
              <span>{{ formatCurrency(ticketSubtotal) }}</span>
            </div>
            <div v-if="upsellSubtotal > 0" class="flex justify-between text-gray-700">
              <span>Additional Items</span>
              <span>{{ formatCurrency(upsellSubtotal) }}</span>
            </div>
            <Divider />
            <div class="flex justify-between text-xl font-bold text-gray-900">
              <span>Total</span>
              <span>{{ formatCurrency(order.total_amount_in_cents) }}</span>
            </div>
          </div>

          <!-- Payment Details -->
          <Divider />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Payment Status</label>
              <p class="text-lg font-semibold text-gray-900 capitalize">
                {{ order.payment_status }}
              </p>
            </div>
            <div v-if="order.stripe_payment_intent_id">
              <label class="text-sm font-medium text-gray-500">Payment Intent ID</label>
              <div class="flex items-center gap-2">
                <p class="text-sm font-mono text-gray-900 truncate">
                  {{ order.stripe_payment_intent_id }}
                </p>
                <Button
                  icon="pi pi-copy"
                  text
                  rounded
                  size="small"
                  @click="copyToClipboard(order.stripe_payment_intent_id, 'Payment Intent ID')"
                />
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="order.notes">
            <Divider />
            <div>
              <label class="text-sm font-medium text-gray-500">Notes</label>
              <p class="text-gray-900 mt-1">{{ order.notes }}</p>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
