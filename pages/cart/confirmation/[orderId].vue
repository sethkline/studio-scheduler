<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <i class="pi pi-spin pi-spinner text-4xl"></i>
        <p class="mt-2">Loading order details...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <i class="pi pi-exclamation-triangle text-5xl text-red-500 mb-4"></i>
        <h2 class="text-2xl font-bold mb-2">Order Not Found</h2>
        <p class="mb-4">{{ error }}</p>
        <Button label="Browse Shows" icon="pi pi-search" @click="router.push('/public/recitals')" />
      </div>

      <!-- Success State -->
      <div v-else class="space-y-6">
        <!-- Success Header -->
        <div class="card p-8 text-center">
          <i class="pi pi-check-circle text-green-500 text-6xl mb-4"></i>
          <h1 class="text-3xl font-bold mb-2">Thank You for Your Purchase!</h1>
          <p class="text-gray-600 mb-4">
            Your tickets have been reserved and a confirmation has been sent to {{ order.customer_email }}
          </p>

          <div class="inline-block bg-gray-100 px-6 py-3 rounded-lg">
            <div class="text-sm text-gray-600">Order Number</div>
            <div class="text-xl font-bold">{{ order.order_number }}</div>
          </div>
        </div>

        <!-- Order Details -->
        <div class="card p-6">
          <h2 class="text-xl font-bold mb-4">Order Details</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <div class="text-sm text-gray-600 mb-1">Customer Name</div>
              <div class="font-medium">{{ order.customer_name }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-600 mb-1">Email</div>
              <div class="font-medium">{{ order.customer_email }}</div>
            </div>
            <div v-if="order.customer_phone">
              <div class="text-sm text-gray-600 mb-1">Phone</div>
              <div class="font-medium">{{ order.customer_phone }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-600 mb-1">Order Date</div>
              <div class="font-medium">{{ formatDate(order.created_at) }}</div>
            </div>
          </div>

          <!-- Shows and Tickets -->
          <div class="border-t pt-4">
            <h3 class="font-semibold mb-4">Your Tickets</h3>

            <div class="space-y-4">
              <div
                v-for="(showGroup, showId) in groupedTickets"
                :key="showId"
                class="border border-gray-200 rounded-lg p-4"
              >
                <h4 class="font-semibold text-lg mb-2">{{ showGroup.show_name }}</h4>
                <p class="text-sm text-gray-600 mb-3">
                  {{ formatDate(showGroup.show_date) }} at {{ formatTime(showGroup.show_time) }}
                </p>
                <p v-if="showGroup.show_location" class="text-sm text-gray-600 mb-3">
                  {{ showGroup.show_location }}
                </p>

                <div class="space-y-2">
                  <div
                    v-for="ticket in showGroup.tickets"
                    :key="ticket.id"
                    class="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                  >
                    <div>
                      <span class="font-medium">{{ ticket.section }}</span>
                      - Row {{ ticket.row_name }}, Seat {{ ticket.seat_number }}
                    </div>
                    <div class="font-medium">${{ formatPrice(ticket.price_in_cents) }}</div>
                  </div>
                </div>

                <div class="flex justify-between items-center mt-3 pt-3 border-t">
                  <span class="font-semibold">Show Subtotal</span>
                  <span class="font-semibold">${{ formatPrice(showGroup.subtotal) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Order Total -->
          <div class="border-t-2 border-gray-300 pt-4 mt-4">
            <div class="flex justify-between items-center text-lg font-bold">
              <span>Total Paid</span>
              <span>${{ formatPrice(order.total_amount_in_cents) }}</span>
            </div>
            <div class="text-sm text-gray-600 mt-1">
              {{ totalTicketCount }} ticket{{ totalTicketCount > 1 ? 's' : '' }} for {{ showCount }} show{{ showCount > 1 ? 's' : '' }}
            </div>
          </div>
        </div>

        <!-- Next Steps -->
        <div class="card p-6">
          <h2 class="text-xl font-bold mb-4">What's Next?</h2>

          <div class="space-y-4">
            <div class="flex items-start">
              <i class="pi pi-envelope text-primary-600 text-xl mr-3 mt-1"></i>
              <div>
                <h3 class="font-semibold mb-1">Check Your Email</h3>
                <p class="text-sm text-gray-600">
                  Your tickets have been sent to <strong>{{ order.customer_email }}</strong>.
                  Please check your spam folder if you don't see it.
                </p>
              </div>
            </div>

            <div class="flex items-start">
              <i class="pi pi-ticket text-primary-600 text-xl mr-3 mt-1"></i>
              <div>
                <h3 class="font-semibold mb-1">Download Your Tickets</h3>
                <p class="text-sm text-gray-600 mb-2">
                  Each ticket includes a unique QR code for entry. Please have your tickets ready on your mobile device or printed.
                </p>
                <Button
                  label="View All Tickets"
                  icon="pi pi-download"
                  size="small"
                  @click="router.push('/public/tickets')"
                />
              </div>
            </div>

            <div class="flex items-start">
              <i class="pi pi-calendar text-primary-600 text-xl mr-3 mt-1"></i>
              <div>
                <h3 class="font-semibold mb-1">Add to Calendar</h3>
                <p class="text-sm text-gray-600 mb-2">
                  Don't forget about your shows! Add them to your calendar.
                </p>
                <Button
                  label="Download Calendar Events"
                  icon="pi pi-calendar-plus"
                  size="small"
                  outlined
                  @click="downloadCalendarEvents"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            label="Browse More Shows"
            icon="pi pi-search"
            outlined
            @click="router.push('/public/recitals')"
          />
          <Button
            label="Print Order Confirmation"
            icon="pi pi-print"
            outlined
            @click="window.print()"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const toast = useToast()

const orderId = route.params.orderId

const loading = ref(true)
const error = ref('')
const order = ref<any>(null)
const groupedTickets = ref<any>({})

// Fetch order details
onMounted(async () => {
  try {
    const { data, error: fetchError } = await useFetch(`/api/ticket-orders/${orderId}`)

    if (fetchError.value || !data.value || !data.value.order) {
      throw new Error('Order not found')
    }

    order.value = data.value.order

    // Group tickets by show
    if (order.value.tickets && order.value.tickets.length > 0) {
      const grouped: any = {}

      for (const ticket of order.value.tickets) {
        const showId = ticket.show_seat?.recital_show_id

        if (!showId) continue

        if (!grouped[showId]) {
          grouped[showId] = {
            show_id: showId,
            show_name: ticket.show_seat?.recital_shows?.name || 'Unknown Show',
            show_date: ticket.show_seat?.recital_shows?.date || '',
            show_time: ticket.show_seat?.recital_shows?.start_time || '',
            show_location: ticket.show_seat?.recital_shows?.location || '',
            tickets: [],
            subtotal: 0
          }
        }

        grouped[showId].tickets.push({
          id: ticket.id,
          section: ticket.show_seat?.seats?.venue_sections?.name || 'Unknown',
          row_name: ticket.show_seat?.seats?.row_name || '',
          seat_number: ticket.show_seat?.seats?.seat_number || '',
          price_in_cents: ticket.show_seat?.price_in_cents || 0
        })

        grouped[showId].subtotal += ticket.show_seat?.price_in_cents || 0
      }

      groupedTickets.value = grouped
    }
  } catch (err: any) {
    console.error('Error fetching order:', err)
    error.value = err.message || 'Failed to load order details'
  } finally {
    loading.value = false
  }
})

// Computed
const totalTicketCount = computed(() => {
  return Object.values(groupedTickets.value).reduce((sum: number, show: any) => {
    return sum + show.tickets.length
  }, 0)
})

const showCount = computed(() => {
  return Object.keys(groupedTickets.value).length
})

// Methods
function formatPrice(cents: number) {
  return (cents / 100).toFixed(2)
}

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatTime(timeString: string) {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

function downloadCalendarEvents() {
  // Generate ICS files for all shows
  const shows = Object.values(groupedTickets.value)

  shows.forEach((show: any) => {
    const event = {
      title: show.show_name,
      start: new Date(`${show.show_date}T${show.show_time}`),
      duration: { hours: 2 },
      location: show.show_location,
      description: `Your tickets for ${show.show_name}. ${show.tickets.length} ticket${show.tickets.length > 1 ? 's' : ''}.`
    }

    const icsContent = generateIcsFile(event)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${show.show_name.replace(/\s+/g, '-')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  })

  toast.add({
    severity: 'success',
    summary: 'Calendar Events Downloaded',
    detail: `Downloaded ${shows.length} calendar event${shows.length > 1 ? 's' : ''}`,
    life: 3000
  })
}

function generateIcsFile(event: any) {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '')
  }

  const start = formatDate(event.start)
  const end = formatDate(new Date(event.start.getTime() + event.duration.hours * 60 * 60 * 1000))

  return `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:${event.title}
DTSTART:${start}
DTEND:${end}
LOCATION:${event.location || ''}
DESCRIPTION:${event.description || ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`
}

definePageMeta({
  layout: 'default'
})
</script>

<style scoped>
@media print {
  .no-print {
    display: none;
  }
}
</style>
