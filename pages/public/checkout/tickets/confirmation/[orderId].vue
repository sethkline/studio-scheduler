<script setup lang="ts">
import type { TicketOrder } from '~/types/ticketing'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const orderId = route.params.orderId as string

// Services
const { getOrder, formatPrice } = useTicketCheckout()

// State
const loading = ref(true)
const order = ref<TicketOrder | null>(null)
const showDetails = ref<any>(null)

// Fetch order on mount
onMounted(async () => {
  await loadOrder()
})

// Load order details
const loadOrder = async () => {
  if (!orderId) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No order ID provided',
      life: 5000
    })
    router.push('/')
    return
  }

  loading.value = true

  try {
    order.value = await getOrder(orderId)

    // TODO: Fetch show details if needed
    // For now, we'll use basic info from the order
  } catch (error: any) {
    console.error('Error loading order:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load order details',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

// Computed
const ticketCount = computed(() => {
  return order.value?.tickets?.length || 0
})

const orderTotal = computed(() => {
  return order.value?.total_amount_in_cents || 0
})

// Group tickets by section
const ticketsBySection = computed(() => {
  if (!order.value?.tickets) return []

  const grouped = new Map<string, typeof order.value.tickets>()

  order.value.tickets.forEach((ticket: any) => {
    const section = ticket.show_seat?.section || 'Unknown Section'
    if (!grouped.has(section)) {
      grouped.set(section, [])
    }
    grouped.get(section)!.push(ticket)
  })

  return Array.from(grouped.entries()).map(([section, tickets]) => ({
    section,
    tickets: tickets.sort((a: any, b: any) => {
      const aRow = a.show_seat?.row_name || ''
      const bRow = b.show_seat?.row_name || ''
      const aSeat = a.show_seat?.seat_number || ''
      const bSeat = b.show_seat?.seat_number || ''

      if (aRow === bRow) {
        return parseInt(aSeat) - parseInt(bSeat)
      }
      return aRow.localeCompare(bRow)
    })
  }))
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <ProgressSpinner />
      </div>

      <!-- Confirmation Content -->
      <div v-else-if="order" class="space-y-6">
        <!-- Success Header -->
        <Card class="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
          <template #content>
            <div class="text-center py-6">
              <div class="flex justify-center mb-4">
                <div class="bg-green-500 text-white rounded-full p-4">
                  <i class="pi pi-check text-4xl"></i>
                </div>
              </div>

              <h1 class="text-3xl font-bold text-gray-900 mb-2">Purchase Complete!</h1>
              <p class="text-lg text-gray-700 mb-4">
                Your tickets have been successfully purchased.
              </p>

              <div class="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
                <div class="flex items-center gap-2 text-gray-700">
                  <i class="pi pi-ticket"></i>
                  <span
                    ><strong>{{ ticketCount }}</strong> Ticket{{
                      ticketCount !== 1 ? 's' : ''
                    }}</span
                  >
                </div>
                <div class="hidden sm:block text-gray-400">|</div>
                <div class="flex items-center gap-2 text-gray-700">
                  <i class="pi pi-hashtag"></i>
                  <span>Order <strong>{{ order.order_number }}</strong></span>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Email Notification -->
        <Message severity="info" :closable="false">
          <div class="flex items-start gap-3">
            <i class="pi pi-envelope text-xl mt-0.5"></i>
            <div>
              <p class="font-medium">Confirmation email sent!</p>
              <p class="text-sm mt-1">
                We've sent a confirmation email to
                <strong>{{ order.customer_email }}</strong>
                with your order details and tickets.
              </p>
            </div>
          </div>
        </Message>

        <!-- Order Details -->
        <Card>
          <template #title>
            <h2 class="text-xl font-semibold text-gray-900">Order Details</h2>
          </template>

          <template #content>
            <div class="space-y-4">
              <!-- Customer Information -->
              <div class="pb-4 border-b border-gray-200">
                <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Customer Information
                </h3>
                <dl class="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <dt class="text-gray-600">Name</dt>
                    <dd class="font-medium text-gray-900">{{ order.customer_name }}</dd>
                  </div>
                  <div>
                    <dt class="text-gray-600">Email</dt>
                    <dd class="font-medium text-gray-900">{{ order.customer_email }}</dd>
                  </div>
                  <div v-if="order.customer_phone">
                    <dt class="text-gray-600">Phone</dt>
                    <dd class="font-medium text-gray-900">{{ order.customer_phone }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Tickets -->
              <div class="pb-4 border-b border-gray-200">
                <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Your Tickets
                </h3>

                <div v-for="group in ticketsBySection" :key="group.section" class="space-y-2 mb-4">
                  <div class="text-sm font-medium text-gray-600">{{ group.section }}</div>

                  <div
                    v-for="ticket in group.tickets"
                    :key="ticket.id"
                    class="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg"
                  >
                    <div class="flex items-center gap-3">
                      <i class="pi pi-ticket text-primary-600"></i>
                      <div>
                        <div class="text-sm font-medium text-gray-900">
                          Row {{ ticket.show_seat?.row_name }}, Seat
                          {{ ticket.show_seat?.seat_number }}
                        </div>
                        <div class="text-xs text-gray-500">
                          Ticket #{{ ticket.ticket_number }}
                        </div>
                      </div>
                    </div>
                    <div class="text-sm font-semibold text-gray-900">
                      {{ formatPrice(ticket.show_seat?.price_in_cents || 0) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Payment Summary -->
              <div>
                <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Payment Summary
                </h3>

                <div class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Total Paid</span>
                    <span class="text-lg font-bold text-gray-900">
                      {{ formatPrice(orderTotal) }}
                    </span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Payment Method</span>
                    <span class="text-gray-900">Credit Card</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Payment Status</span>
                    <span class="inline-flex items-center gap-1 text-green-600 font-medium">
                      <i class="pi pi-check-circle"></i>
                      Paid
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Next Steps -->
        <Card>
          <template #title>
            <h2 class="text-xl font-semibold text-gray-900">What's Next?</h2>
          </template>

          <template #content>
            <div class="space-y-4">
              <div class="flex items-start gap-3">
                <div class="bg-primary-100 text-primary-600 rounded-full p-2 mt-1">
                  <i class="pi pi-envelope text-sm"></i>
                </div>
                <div>
                  <h4 class="font-medium text-gray-900">Check Your Email</h4>
                  <p class="text-sm text-gray-600 mt-1">
                    We've sent your tickets to {{ order.customer_email }}. The email includes QR
                    codes for each ticket.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <div class="bg-primary-100 text-primary-600 rounded-full p-2 mt-1">
                  <i class="pi pi-mobile text-sm"></i>
                </div>
                <div>
                  <h4 class="font-medium text-gray-900">Save Your Tickets</h4>
                  <p class="text-sm text-gray-600 mt-1">
                    Download or print your tickets before the show. You can also display them on
                    your mobile device.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <div class="bg-primary-100 text-primary-600 rounded-full p-2 mt-1">
                  <i class="pi pi-calendar text-sm"></i>
                </div>
                <div>
                  <h4 class="font-medium text-gray-900">Arrive Early</h4>
                  <p class="text-sm text-gray-600 mt-1">
                    Please arrive at least 15 minutes before the show starts to allow time for
                    check-in.
                  </p>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4">
          <Button
            label="View Order Details"
            icon="pi pi-file"
            @click="
              router.push(`/public/orders/${orderId}`)
            "
            class="flex-1"
            severity="primary"
            outlined
          />
          <Button
            label="Print Tickets"
            icon="pi pi-print"
            @click="window.print()"
            class="flex-1"
            severity="secondary"
            outlined
          />
        </div>
      </div>

      <!-- Error State -->
      <div v-else class="text-center py-12">
        <i class="pi pi-exclamation-triangle text-6xl text-gray-400 mb-4"></i>
        <h2 class="text-2xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
        <p class="text-gray-600 mb-6">We couldn't find the order you're looking for.</p>
        <Button label="Go Home" icon="pi pi-home" @click="router.push('/')" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Print styles */
@media print {
  .no-print {
    display: none !important;
  }
}
</style>
