<template>
  <div class="recital-show-edit">
    <Breadcrumb :model="breadcrumbItems" :home="breadcrumbHome" class="mb-4">
      <template #item="{ item }">
        <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
          <a :href="href" class="p-menuitem-link" @click="navigate">
            <span class="p-menuitem-text">{{ item.label }}</span>
          </a>
        </router-link>
        <a v-else :href="item.url" class="p-menuitem-link">
          <span class="p-menuitem-text">{{ item.label }}</span>
        </a>
      </template>
    </Breadcrumb>

    <!-- Loading State -->
    <div v-if="loading" class="card flex justify-center items-center p-6">
      <ProgressSpinner class="w-12 h-12" />
      <p class="ml-4 text-gray-500">Loading recital show data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
      <div class="flex items-center">
        <i class="pi pi-exclamation-triangle text-red-500 text-2xl mr-3"></i>
        <div>
          <h3 class="font-bold">Error Loading Recital Show</h3>
          <p>{{ error }}</p>
          <Button label="Try Again" class="mt-3" @click="fetchRecitalShow" />
        </div>
      </div>
    </div>

    <!-- Show Edit Form -->
    <div v-else class="space-y-6">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="general">General Information</Tab>
          <Tab value="ticketSales" :disabled="!showId">Ticket Sales</Tab>
          <Tab value="seatingLayout" :disabled="!showId || !canManageSeating">Seating Layout</Tab>
        </TabList>
        
        <TabPanels>
          <!-- General Information Tab -->
          <TabPanel value="general">
            <ShowDetailsForm
              :showData="showData"
              :saving="saving"
              :seatStats="seatStats"
              :sectionStats="sectionStats"
              @save="saveGeneralInfo"
              @cancel="goBack"
            />
          </TabPanel>

          <!-- Ticket Sales Tab -->
          <TabPanel value="ticketSales">
            <TicketConfigForm 
              :ticketData="ticketData" 
              :saving="saving"
              @save="saveTicketConfig"
              @cancel="goBack"
            />
          </TabPanel>

          <!-- Seating Layout Tab -->
          <TabPanel value="seatingLayout">
            <SeatingLayoutManager 
              :showId="showId"
              :hasSeats="hasSeats"
              :seatStats="seatStats"
              :sectionStats="sectionStats"
              :selectedLayout="selectedLayout"
              :layoutOptions="layoutOptions"
              :generatingSeats="generatingSeats"
              @select-layout="selectedLayout = $event"
              @generate-seats="generateSeats"
              @regenerate-seats="confirmRegenerateSeats"
              @view-chart="viewSeatingChart"
              @download-map="downloadSeatMap"
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>

  <!-- Confirm Dialog -->
  <ConfirmDialog />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import ShowDetailsForm from './ShowDetailsForm.vue';
import TicketConfigForm from './TicketConfigForm.vue';
import SeatingLayoutManager from './SeatingLayoutManager.vue';

// Route parameters
const route = useRoute();
const router = useRouter();
const showId = route.params.id;

// Services
const toast = useToast();
const confirm = useConfirm();
const { 
  fetchShow, 
  updateShow, 
  updateTicketConfig, 
  generateSeatsForShow, 
  getSeatStatistics 
} = useApiService();

// State
const loading = ref(true);
const error = ref(null);
const saving = ref(false);
const generatingSeats = ref(false);
const hasSeats = ref(false);
const canManageSeating = ref(true); // Set based on permissions
const selectedLayout = ref(null);
const layoutOptions = ref([]);
const activeTab = ref('general'); // This is set as 'general' by default

// Breadcrumb data
const breadcrumbHome = ref({ icon: 'pi pi-home', route: '/' });
const breadcrumbItems = computed(() => [
  { label: 'Recitals', route: '/recitals' },
  { label: showData.value.series_name ? `${showData.value.series_name}` : 'Series', route: showData.value.series_id ? `/recitals/${showData.value.series_id}` : null },
  { label: showData.value.name ? showData.value.name : 'Show Details', route: `/recitals/shows/${showId}` },
  { label: 'Edit' }
]);

// Form Data - with proper initialization to match the API response structure
const showData = ref({
  name: '',
  date: '',
  start_time: '',
  end_time: '',
  location: '',
  description: '',
  status: 'planning',
  series_id: null,
  series_name: '',
  venue_id: null,
  venue: null
});

const ticketData = ref({
  can_sell_tickets: false,
  ticket_price_in_cents: 0,
  ticket_sale_start: null,
  ticket_sale_end: null,
  is_pre_sale_active: false,
  pre_sale_start: null,
  pre_sale_end: null,
  advance_ticket_sale_start: null
});

// Seating stats
const seatStats = ref({
  total: 0,
  available: 0,
  sold: 0,
  reserved: 0,
  held: 0
});

const sectionStats = ref([]);

// Load data
onMounted(async () => {
  if (showId) {
    await fetchRecitalShow();
  } else {
    loading.value = false;
  }
});

// Methods
async function fetchRecitalShow() {
  loading.value = true;
  error.value = null;
  
  try {
    // Use API service to fetch show details
    const { data, error: fetchError } = await fetchShow(showId);
    
    if (fetchError.value) throw new Error(fetchError.value.statusMessage || 'Failed to fetch show');
    
    // Set form data
    const showDetails = data?.value?.show;
    
    // Update with all the required fields
    showData.value = {
      name: showDetails?.name || '',
      date: showDetails?.date || '',
      start_time: showDetails?.start_time || '',
      end_time: showDetails?.end_time || null,
      location: showDetails?.location || '',
      description: showDetails?.description || '',
      status: showDetails?.status || 'planning',
      series_id: showDetails?.series_id || null,
      series_name: showDetails?.series?.name || '',
      venue_id: showDetails?.venue_id || null,
      venue: showDetails?.venue || null
    };

    // Load seat statistics if venue is set
    if (showDetails?.venue_id) {
      await fetchSeatStatistics();
    }
    
    // Set ticket data
    ticketData.value = {
      can_sell_tickets: showDetails?.can_sell_tickets || false,
      ticket_price_in_cents: showDetails?.ticket_price_in_cents || 0,
      ticket_sale_start: showDetails?.ticket_sale_start || null,
      ticket_sale_end: showDetails?.ticket_sale_end || null,
      is_pre_sale_active: showDetails?.is_pre_sale_active || false,
      pre_sale_start: showDetails?.pre_sale_start || null,
      pre_sale_end: showDetails?.pre_sale_end || null,
      advance_ticket_sale_start: showDetails?.advance_ticket_sale_start || null
    };
    
  } catch (err) {
    console.error('Error fetching recital show:', err);
    error.value = err.message || 'Failed to load show details';
  } finally {
    loading.value = false;
  }
}

async function saveGeneralInfo(formData) {
  try {
    saving.value = true;

    // Check if venue changed and has seats - warn user
    const venueChanged = formData.venue_id !== showData.value.venue_id;
    if (venueChanged && hasSeats.value && formData.venue_id !== showData.value.venue_id) {
      const shouldContinue = await new Promise((resolve) => {
        confirm.require({
          message: 'Changing the venue will require regenerating seats for this show. Any existing seat reservations and sales will be lost. Do you want to continue?',
          header: 'Confirm Venue Change',
          icon: 'pi pi-exclamation-triangle',
          acceptClass: 'p-button-danger',
          accept: () => resolve(true),
          reject: () => resolve(false)
        });
      });

      if (!shouldContinue) {
        saving.value = false;
        return;
      }
    }

    // Use API service to update the show
    const { data, error } = await updateShow(showId, formData);

    if (error.value) throw new Error(error.value.statusMessage || 'Failed to update show');

    // Update the local data
    Object.assign(showData.value, formData);

    // Reload show data to get updated venue info
    await fetchRecitalShow();

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Show details updated successfully',
      life: 3000
    });

  } catch (err) {
    console.error('Error updating show:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to update show details',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
}

async function fetchSeatStatistics() {
  try {
    const { data, error } = await $fetch(`/api/recital-shows/${showId}/seats/statistics`);

    if (error) throw error;

    if (data) {
      seatStats.value = {
        total: data.stats.total || 0,
        available: data.stats.available || 0,
        sold: data.stats.sold || 0,
        reserved: data.stats.reserved || 0,
        held: data.stats.held || 0
      };

      sectionStats.value = data.sections || [];
      hasSeats.value = data.stats.total > 0;
    }
  } catch (err) {
    console.error('Error fetching seat statistics:', err);
    // Don't show error toast, just set defaults
    hasSeats.value = false;
  }
}

async function saveTicketConfig(formData) {
  try {
    saving.value = true;
    
    // Use API service to update ticket configuration
    const { data, error } = await updateTicketConfig(showId, formData);
    
    if (error.value) throw new Error(error.value.statusMessage || 'Failed to update ticket configuration');
    
    // Update the local data
    Object.assign(ticketData.value, formData);
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Ticket configuration updated successfully',
      life: 3000
    });
    
  } catch (err) {
    console.error('Error updating ticket config:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to update ticket configuration',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
}

async function generateSeats() {
  try {
    generatingSeats.value = true;
    
    // Use API service to generate seats (without layoutId parameter)
    const { data, error } = await generateSeatsForShow(showId);
    
    if (error.value) throw new Error(error.value.statusMessage || 'Failed to generate seats');
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Generated ${data.value.seat_count} seats for this show`,
      life: 3000
    });
    
    // Refresh seat data
    await fetchSeatCount();
    
  } catch (err) {
    console.error('Error generating seats:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to generate seats',
      life: 3000
    });
  } finally {
    generatingSeats.value = false;
  }
}

function confirmRegenerateSeats() {
  confirm.require({
    message: 'Regenerating seats will delete any existing seat assignments and tickets. This action cannot be undone. Do you want to continue?',
    header: 'Confirm Regenerate Seats',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => {
      selectedLayout.value = null;
      hasSeats.value = false;
    },
    reject: () => {
      // Do nothing
    }
  });
}

function viewSeatingChart() {
  router.push(`/recitals/shows/${showId}/seating-chart`);
}

function downloadSeatMap() {
  // Implement seat map download
  window.open(`/api/recital-shows/${showId}/seating-chart/download`, '_blank');
}

function goBack() {
  router.back();
}
</script>