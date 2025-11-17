<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useTicketPdf } from '~/composables/useTicketPdf'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  totalAmount: number
  status: string
  createdAt: string
  show: {
    id: string
    name: string
    date: string
    time: string
    venue: {
      name: string
      address: string
      city: string
      state: string
    } | null
  } | null
}

interface OrderDetail extends Order {
  tickets: Array<{
    id: string
    ticketNumber: string
    qrCode: string
    pdfUrl: string | null
    price: number
    seat: {
      section: string
      row: string
      number: string
      type: string
    } | null
  }>
}

const toast = useToast()
const { downloadTicketPdf } = useTicketPdf()

// State
const email = ref('')
const loading = ref(false)
const searching = ref(false)
const orders = ref<Order[]>([])
const selectedOrder = ref<OrderDetail | null>(null)
const showOrderDetails = ref(false)
const resendingEmail = ref(false)

// Computed
const hasSearched = computed(() => orders.value.length > 0 || searching.value)

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (timeString: string) => {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const date = new Date()
  date.setHours(parseInt(hours))
  date.setMinutes(parseInt(minutes))
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'pending':
      return 'warning'
    case 'failed':
    case 'cancelled':
      return 'danger'
    case 'refunded':
      return 'info'
    default:
      return 'secondary'
  }
}

// Methods
const searchOrders = async () => {
  if (!email.value) {
    toast.add({
      severity: 'warn',
      summary: 'Email Required',
      detail: 'Please enter your email address',
      life: 3000
    })
    return
  }

  searching.value = true
  try {
    const response = await $fetch<{ success: boolean; data: { orders: Order[] } }>(
      `/api/public/orders/lookup?email=${encodeURIComponent(email.value)}`
    )

    if (response.success) {
      orders.value = response.data.orders

      if (orders.value.length === 0) {
        toast.add({
          severity: 'info',
          summary: 'No Orders Found',
          detail: 'No orders were found for this email address',
          life: 5000
        })
      } else {
        toast.add({
          severity: 'success',
          summary: 'Orders Found',
          detail: `Found ${orders.value.length} order(s)`,
          life: 3000
        })
      }
    }
  } catch (error: any) {
    console.error('Error searching orders:', error)
    toast.add({
      severity: 'error',
      summary: 'Search Failed',
      detail: error.data?.message || 'Failed to search for orders',
      life: 5000
    })
    orders.value = []
  } finally {
    searching.value = false
  }
}

const viewOrderDetails = async (order: Order) => {
  loading.value = true
  try {
    // SECURITY: Include email for verification
    const response = await $fetch<{ success: boolean; data: OrderDetail }>(
      `/api/public/orders/${order.id}?email=${encodeURIComponent(email.value)}`
    )

    if (response.success) {
      selectedOrder.value = response.data
      showOrderDetails.value = true
    }
  } catch (error: any) {
    console.error('Error fetching order details:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.data?.message || 'Failed to load order details',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

const downloadTicket = async (ticketId: string, ticketNumber: string) => {
  await downloadTicketPdf(ticketId, ticketNumber)
}

const downloadAllTickets = async () => {
  if (!selectedOrder.value) return

  for (const ticket of selectedOrder.value.tickets) {
    await downloadTicket(ticket.id, ticket.ticketNumber)
    // Small delay between downloads
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

const resendConfirmationEmail = async () => {
  if (!selectedOrder.value) return

  resendingEmail.value = true
  try {
    // SECURITY: Include email for verification
    const response = await $fetch<{ success: boolean; message: string }>(
      `/api/public/orders/${selectedOrder.value.id}/resend-email`,
      {
        method: 'POST',
        body: {
          email: email.value
        }
      }
    )

    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Email Sent',
        detail: response.message || 'Confirmation email sent successfully',
        life: 5000
      })
    }
  } catch (error: any) {
    console.error('Error resending email:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.data?.message || 'Failed to resend confirmation email',
      life: 5000
    })
  } finally {
    resendingEmail.value = false
  }
}

const closeOrderDetails = () => {
  showOrderDetails.value = false
  selectedOrder.value = null
}

const resetSearch = () => {
  email.value = ''
  orders.value = []
  selectedOrder.value = null
  showOrderDetails.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          Ticket Lookup
        </h1>
        <p class="text-lg text-gray-600">
          Enter your email address to view your ticket orders
        </p>
      </div>

      <!-- Search Form -->
      <Card class="mb-8">
        <template #content>
          <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-1">
              <InputText
                v-model="email"
                type="email"
                placeholder="Enter your email address"
                class="w-full"
                :disabled="searching"
                @keyup.enter="searchOrders"
              />
            </div>
            <div class="flex gap-2">
              <Button
                label="Search"
                icon="pi pi-search"
                @click="searchOrders"
                :loading="searching"
                :disabled="!email"
                class="whitespace-nowrap"
              />
              <Button
                v-if="hasSearched"
                label="Reset"
                icon="pi pi-refresh"
                severity="secondary"
                @click="resetSearch"
                :disabled="searching"
                outlined
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- Orders List -->
      <div v-if="orders.length > 0" class="space-y-4">
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">
          Your Orders ({{ orders.length }})
        </h2>

        <Card
          v-for="order in orders"
          :key="order.id"
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="viewOrderDetails(order)"
        >
          <template #content>
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-xl font-semibold text-gray-900">
                    {{ order.show?.name || 'Event' }}
                  </h3>
                  <Tag
                    :value="order.status"
                    :severity="getStatusSeverity(order.status)"
                    class="capitalize"
                  />
                </div>

                <div class="space-y-1 text-sm text-gray-600">
                  <div class="flex items-center gap-2">
                    <i class="pi pi-calendar text-gray-400" />
                    <span>
                      {{ formatDate(order.show?.date || '') }}
                      at {{ formatTime(order.show?.time || '') }}
                    </span>
                  </div>

                  <div v-if="order.show?.venue" class="flex items-center gap-2">
                    <i class="pi pi-map-marker text-gray-400" />
                    <span>
                      {{ order.show.venue.name }}
                      <template v-if="order.show.venue.city">
                        - {{ order.show.venue.city }}, {{ order.show.venue.state }}
                      </template>
                    </span>
                  </div>

                  <div class="flex items-center gap-2">
                    <i class="pi pi-tag text-gray-400" />
                    <span>Order #{{ order.orderNumber }}</span>
                  </div>

                  <div class="flex items-center gap-2">
                    <i class="pi pi-clock text-gray-400" />
                    <span>Ordered {{ formatDateTime(order.createdAt) }}</span>
                  </div>
                </div>
              </div>

              <div class="text-right">
                <div class="text-2xl font-bold text-purple-600 mb-2">
                  {{ formatCurrency(order.totalAmount) }}
                </div>
                <Button
                  label="View Details"
                  icon="pi pi-arrow-right"
                  severity="secondary"
                  text
                  @click.stop="viewOrderDetails(order)"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="hasSearched && !searching"
        class="text-center py-16"
      >
        <i class="pi pi-search text-6xl text-gray-300 mb-4" />
        <h3 class="text-xl font-semibold text-gray-700 mb-2">
          No Orders Found
        </h3>
        <p class="text-gray-500">
          We couldn't find any orders for {{ email }}
        </p>
      </div>

      <!-- Order Details Dialog -->
      <Dialog
        v-model:visible="showOrderDetails"
        :header="`Order #${selectedOrder?.orderNumber || ''}`"
        modal
        :style="{ width: '90vw', maxWidth: '800px' }"
        :closable="!loading"
      >
        <div v-if="loading" class="flex justify-center py-8">
          <ProgressSpinner />
        </div>

        <div v-else-if="selectedOrder" class="space-y-6">
          <!-- Show Information -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-semibold text-gray-900 mb-3">Event Details</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Event:</span>
                <span class="font-medium">{{ selectedOrder.show?.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Date:</span>
                <span class="font-medium">{{ formatDate(selectedOrder.show?.date || '') }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Time:</span>
                <span class="font-medium">{{ formatTime(selectedOrder.show?.time || '') }}</span>
              </div>
              <div v-if="selectedOrder.show?.venue" class="flex justify-between">
                <span class="text-gray-600">Venue:</span>
                <span class="font-medium">{{ selectedOrder.show.venue.name }}</span>
              </div>
            </div>
          </div>

          <!-- Customer Information -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-semibold text-gray-900 mb-3">Customer Information</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Name:</span>
                <span class="font-medium">{{ selectedOrder.customerName }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Email:</span>
                <span class="font-medium">{{ selectedOrder.customerEmail }}</span>
              </div>
              <div v-if="selectedOrder.customerPhone" class="flex justify-between">
                <span class="text-gray-600">Phone:</span>
                <span class="font-medium">{{ selectedOrder.customerPhone }}</span>
              </div>
            </div>
          </div>

          <!-- Tickets -->
          <div>
            <h4 class="font-semibold text-gray-900 mb-3">
              Your Tickets ({{ selectedOrder.tickets.length }})
            </h4>

            <DataTable
              :value="selectedOrder.tickets"
              class="text-sm"
              striped-rows
            >
              <Column field="ticketNumber" header="Ticket #" />
              <Column header="Seat">
                <template #body="{ data }">
                  <span v-if="data.seat">
                    {{ data.seat.section }} - Row {{ data.seat.row }}, Seat {{ data.seat.number }}
                  </span>
                  <span v-else class="text-gray-400">General Admission</span>
                </template>
              </Column>
              <Column header="Price">
                <template #body="{ data }">
                  {{ formatCurrency(data.price) }}
                </template>
              </Column>
              <Column header="Actions">
                <template #body="{ data }">
                  <Button
                    icon="pi pi-download"
                    severity="secondary"
                    text
                    rounded
                    @click="downloadTicket(data.id, data.ticketNumber)"
                    v-tooltip.top="'Download PDF'"
                  />
                </template>
              </Column>
            </DataTable>
          </div>

          <!-- Total -->
          <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div class="flex justify-between items-center">
              <span class="text-lg font-semibold text-gray-900">Total:</span>
              <span class="text-2xl font-bold text-purple-600">
                {{ formatCurrency(selectedOrder.totalAmount) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              label="Download All Tickets"
              icon="pi pi-download"
              @click="downloadAllTickets"
              class="flex-1"
            />
            <Button
              label="Resend Confirmation Email"
              icon="pi pi-envelope"
              severity="secondary"
              @click="resendConfirmationEmail"
              :loading="resendingEmail"
              class="flex-1"
              outlined
            />
          </div>
        </div>
      </Dialog>
    </div>
  </div>
</template>
