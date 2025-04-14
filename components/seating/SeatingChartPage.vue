<template>
  <div class="seating-chart-page">
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

    <!-- Header -->
    <div class="card mb-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 class="text-2xl font-bold text-primary-800">Seating Chart</h1>
          <p v-if="recitalShow" class="text-gray-600 mt-1">
            {{ recitalShow.name }} - {{ formatDate(recitalShow.date) }}
          </p>
        </div>

        <div class="flex gap-2 mt-4 md:mt-0">
          <Button icon="pi pi-arrow-left" label="Back to Show" class="p-button-outlined" @click="navigateToShow" />

          <Button
            icon="pi pi-download"
            label="Export Chart"
            class="p-button-outlined p-button-success"
            @click="exportSeatingChart"
          />
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="card bg-blue-50 p-4">
        <div class="flex justify-between">
          <div>
            <h3 class="text-lg font-semibold text-blue-800">Total Seats</h3>
            <p class="text-3xl font-bold text-blue-700 mt-2">{{ stats.total || 0 }}</p>
          </div>
          <i class="pi pi-ticket text-3xl text-blue-300"></i>
        </div>
      </div>

      <div class="card bg-green-50 p-4">
        <div class="flex justify-between">
          <div>
            <h3 class="text-lg font-semibold text-green-800">Available</h3>
            <p class="text-3xl font-bold text-green-700 mt-2">{{ stats.available || 0 }}</p>
          </div>
          <i class="pi pi-check-circle text-3xl text-green-300"></i>
        </div>
      </div>

      <div class="card bg-red-50 p-4">
        <div class="flex justify-between">
          <div>
            <h3 class="text-lg font-semibold text-red-800">Sold</h3>
            <p class="text-3xl font-bold text-red-700 mt-2">{{ stats.sold || 0 }}</p>
          </div>
          <i class="pi pi-shopping-cart text-3xl text-red-300"></i>
        </div>
      </div>

      <div class="card bg-yellow-50 p-4">
        <div class="flex justify-between">
          <div>
            <h3 class="text-lg font-semibold text-yellow-800">Reserved</h3>
            <p class="text-3xl font-bold text-yellow-700 mt-2">{{ stats.reserved || 0 }}</p>
          </div>
          <i class="pi pi-clock text-3xl text-yellow-300"></i>
        </div>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div class="card mb-6">
      <h2 class="text-xl font-semibold mb-4">Bulk Actions</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-2">Reserve Multiple Seats</h3>
          <div class="flex gap-2">
            <Button
              icon="pi pi-users"
              label="Reserve for Group"
              class="p-button-outlined"
              @click="openBulkReservationDialog"
            />
          </div>
        </div>

        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-2">Change Section Status</h3>
          <div class="flex gap-2">
            <Dropdown
              v-model="selectedSectionForBulk"
              :options="sectionOptions"
              optionLabel="name"
              placeholder="Select Section"
              class="w-48"
            />

            <Button
              icon="pi pi-sync"
              label="Update"
              :disabled="!selectedSectionForBulk"
              class="p-button-outlined"
              @click="openBulkSectionDialog"
            />
          </div>
        </div>

        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-2">Mark Handicap Seats</h3>
          <div class="flex gap-2">
            <InputNumber v-model="handicapSeatsCount" placeholder="# of seats" min="1" />
            <Button
              icon="pi pi-users"
              label="Mark Seats"
              :disabled="!handicapSeatsCount"
              class="p-button-outlined"
              @click="openHandicapSeatsDialog"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Main Seating Chart -->
    <div class="card">
      <SeatingChart :showId="showId" @generate-seats="generateSeats" @update-seat="onSeatUpdated" />
    </div>

    <!-- Dialogs -->

    <!-- Bulk Reservation Dialog -->
    <Dialog
      v-model:visible="bulkReservationDialog.visible"
      header="Reserve Multiple Seats"
      :style="{ width: '500px' }"
      modal
    >
      <div class="space-y-4">
        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">Section</label>
          <Dropdown
            v-model="bulkReservationDialog.section"
            :options="sectionOptions"
            optionLabel="name"
            class="w-full"
          />
        </div>

        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">Number of Seats</label>
          <InputNumber v-model="bulkReservationDialog.seatCount" class="w-full" min="1" :max="stats.available" />
        </div>

        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">Customer Name</label>
          <InputText v-model="bulkReservationDialog.customerName" class="w-full" />
        </div>

        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">Email</label>
          <InputText v-model="bulkReservationDialog.email" class="w-full" />
        </div>

        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">Phone</label>
          <InputText v-model="bulkReservationDialog.phone" class="w-full" />
        </div>

        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">Reservation Notes</label>
          <Textarea v-model="bulkReservationDialog.notes" rows="3" class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="bulkReservationDialog.visible = false"
        />

        <Button
          label="Reserve Seats"
          icon="pi pi-check"
          @click="reserveMultipleSeats"
          :disabled="
            !bulkReservationDialog.section ||
            !bulkReservationDialog.seatCount ||
            !bulkReservationDialog.customerName ||
            !bulkReservationDialog.email
          "
        />
      </template>
    </Dialog>

    <!-- Bulk Section Status Dialog -->
    <Dialog
      v-model:visible="bulkSectionDialog.visible"
      header="Update Section Status"
      :style="{ width: '400px' }"
      modal
    >
      <div class="space-y-4">
        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">Section</label>
          <div class="font-medium">{{ selectedSectionForBulk?.name }}</div>
        </div>

        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">New Status</label>
          <Dropdown
            v-model="bulkSectionDialog.status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">Apply To</label>
          <div class="flex flex-col gap-2">
            <div class="flex items-center">
              <RadioButton v-model="bulkSectionDialog.applyTo" name="apply_to" value="all" />
              <label for="apply_to_all" class="ml-2">All Seats</label>
            </div>
            <div class="flex items-center">
              <RadioButton v-model="bulkSectionDialog.applyTo" name="apply_to" value="available" />
              <label for="apply_to_available" class="ml-2">Available Seats Only</label>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="bulkSectionDialog.visible = false" />

        <Button
          label="Update Section"
          icon="pi pi-check"
          @click="updateSectionStatus"
          :disabled="!bulkSectionDialog.status"
        />
      </template>
    </Dialog>

    <!-- Handicap Seats Dialog -->
    <Dialog
      v-model:visible="handicapSeatsDialog.visible"
      header="Mark Handicap Accessible Seats"
      :style="{ width: '500px' }"
      modal
    >
      <div class="space-y-4">
        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">Section</label>
          <Dropdown v-model="handicapSeatsDialog.section" :options="sectionOptions" optionLabel="name" class="w-full" />
        </div>

        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">Row</label>
          <Dropdown
            v-model="handicapSeatsDialog.row"
            :options="rowOptions"
            optionLabel="name"
            class="w-full"
            :disabled="!handicapSeatsDialog.section"
          />
        </div>

        <div class="field">
          <label class="text-sm font-medium text-gray-700 block mb-1">Number of Seats</label>
          <InputNumber v-model="handicapSeatsCount" class="w-full" min="1" />
          <small class="text-gray-500">
            This will convert {{ handicapSeatsCount }} regular seats in the selected row to handicap accessible seats.
          </small>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="handicapSeatsDialog.visible = false" />

        <Button
          label="Mark as Handicap"
          icon="pi pi-check"
          @click="markHandicapSeats"
          :disabled="!handicapSeatsDialog.section || !handicapSeatsDialog.row || !handicapSeatsCount"
        />
      </template>
    </Dialog>

    <!-- Generate Seats Confirmation -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import SeatingChart from './SeatingChart.vue';

// Route parameters
const route = useRoute();
const router = useRouter();
const showId = route.params.id;

// Services
const toast = useToast();
const confirm = useConfirm();

// State
const loading = ref(true);
const error = ref(null);
const recitalShow = ref(null);
const stats = ref({
  total: 0,
  available: 0,
  sold: 0,
  reserved: 0
});
const sections = ref([]);
const selectedSectionForBulk = ref(null);
const handicapSeatsCount = ref(1);

// Breadcrumb data
const breadcrumbHome = ref({ icon: 'pi pi-home', route: '/' });
const breadcrumbItems = computed(() => [
  { label: 'Recitals', route: '/recitals' },
  { label: 'Series Details', route: recitalShow.value?.series_id ? `/recitals/${recitalShow.value.series_id}` : null },
  { label: recitalShow.value?.name || 'Show Details', route: `/recitals/shows/${showId}` },
  { label: 'Seating Chart' }
]);

// Dialog states
const bulkReservationDialog = ref({
  visible: false,
  section: null,
  seatCount: 1,
  customerName: '',
  email: '',
  phone: '',
  notes: ''
});

const bulkSectionDialog = ref({
  visible: false,
  status: 'available',
  applyTo: 'all'
});

const handicapSeatsDialog = ref({
  visible: false,
  section: null,
  row: null
});

// Options
const statusOptions = [
  { label: 'Available', value: 'available' },
  { label: 'Reserved', value: 'reserved' },
  { label: 'Sold', value: 'sold' }
];

// Computed
const sectionOptions = computed(() => {
  return sections.value.map((section) => ({
    id: section.id,
    name: section.name
  }));
});

const rowOptions = computed(() => {
  if (!handicapSeatsDialog.value.section) return [];

  const selectedSection = sections.value.find((section) => section.id === handicapSeatsDialog.value.section.id);

  if (!selectedSection) return [];

  return selectedSection.rows.map((row) => ({
    id: row.id,
    name: row.name
  }));
});

// Lifecycle
onMounted(async () => {
  await fetchRecitalShow();
  await fetchSeatStats();
  await fetchSections();
});

// Methods
async function fetchRecitalShow() {
  try {
    const client = useSupabaseClient();

    const { data, error: fetchError } = await client
      .from('recital_shows')
      .select(
        `
        *,
        series:series_id (
          id,
          name
        )
      `
      )
      .eq('id', showId)
      .single();

    if (fetchError) throw fetchError;

    recitalShow.value = data;
  } catch (err) {
    console.error('Error fetching recital show:', err);
    error.value = err.message || 'Failed to load show details';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load show details',
      life: 3000
    });
  }
}

async function fetchSeatStats() {
  try {
    const client = useSupabaseClient();

    // Get total count
    const { count: totalCount, error: totalError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', showId);

    if (totalError) throw totalError;

    // Get available count
    const { count: availableCount, error: availableError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', showId)
      .eq('status', 'available');

    if (availableError) throw availableError;

    // Get sold count
    const { count: soldCount, error: soldError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', showId)
      .eq('status', 'sold');

    if (soldError) throw soldError;

    // Get reserved count
    const { count: reservedCount, error: reservedError } = await client
      .from('show_seats')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', showId)
      .eq('status', 'reserved');

    if (reservedError) throw reservedError;

    stats.value = {
      total: totalCount,
      available: availableCount,
      sold: soldCount,
      reserved: reservedCount
    };
  } catch (err) {
    console.error('Error fetching seat stats:', err);
  }
}

async function fetchSections() {
  try {
    const client = useSupabaseClient();

    // Get distinct sections
    const { data: sectionsData, error: sectionsError } = await client
      .from('show_seats')
      .select('section')
      .eq('show_id', showId)
      .order('section')
      .distinctOn('section');

    if (sectionsError) throw sectionsError;

    // For each section, get rows
    const fetchedSections = [];

    for (const sectionData of sectionsData) {
      // Get rows for this section
      const { data: rowsData, error: rowsError } = await client
        .from('show_seats')
        .select('row_name')
        .eq('show_id', showId)
        .eq('section', sectionData.section)
        .order('row_name')
        .distinctOn('row_name');

      if (rowsError) throw rowsError;

      const rows = rowsData.map((row) => ({
        id: `${sectionData.section}-${row.row_name}`,
        name: row.row_name
      }));

      fetchedSections.push({
        id: sectionData.section,
        name: sectionData.section,
        rows: rows
      });
    }

    sections.value = fetchedSections;
  } catch (err) {
    console.error('Error fetching sections:', err);
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function navigateToShow() {
  router.push(`/recitals/shows/${showId}`);
}

function exportSeatingChart() {
  // Implement export functionality
  // This would typically generate a PDF or image file
  window.open(`/api/recital-shows/${showId}/seating-chart/export`, '_blank');
}

async function generateSeats() {
  confirm.require({
    message:
      'Are you sure you want to generate seats for this show? This will replace any existing seating configuration.',
    header: 'Generate Seats',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        const { data, error } = await useFetch(`/api/recital-shows/${showId}/seats/generate`, {
          method: 'POST'
        });

        if (error.value) throw new Error(error.value.statusMessage || 'Failed to generate seats');

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: `Generated ${data.value.seat_count} seats for this show`,
          life: 3000
        });

        // Refresh data
        await fetchSeatStats();
        await fetchSections();

        // Force reload to refresh the seating chart
        window.location.reload();
      } catch (err) {
        console.error('Error generating seats:', err);
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.message || 'Failed to generate seats',
          life: 3000
        });
      }
    }
  });
}

function onSeatUpdated(seat) {
  // Refresh stats after a seat update
  fetchSeatStats();
}

function openBulkReservationDialog() {
  bulkReservationDialog.value = {
    visible: true,
    section: null,
    seatCount: 1,
    customerName: '',
    email: '',
    phone: '',
    notes: ''
  };
}

function openBulkSectionDialog() {
  bulkSectionDialog.value = {
    visible: true,
    status: 'available',
    applyTo: 'all'
  };
}

function openHandicapSeatsDialog() {
  handicapSeatsDialog.value = {
    visible: true,
    section: null,
    row: null
  };
}

async function reserveMultipleSeats() {
  try {
    const client = useSupabaseClient();

    // Prepare request data
    const requestData = {
      section: bulkReservationDialog.value.section.name,
      count: bulkReservationDialog.value.seatCount,
      customer: {
        name: bulkReservationDialog.value.customerName,
        email: bulkReservationDialog.value.email,
        phone: bulkReservationDialog.value.phone,
        notes: bulkReservationDialog.value.notes
      }
    };

    // Call API to reserve seats
    const { data, error } = await useFetch(`/api/recital-shows/${showId}/seats/reserve-multiple`, {
      method: 'POST',
      body: requestData
    });

    if (error.value) throw new Error(error.value.statusMessage || 'Failed to reserve seats');

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Reserved ${data.value.seats.length} seats for ${bulkReservationDialog.value.customerName}`,
      life: 3000
    });

    // Refresh stats
    await fetchSeatStats();

    // Close dialog
    bulkReservationDialog.value.visible = false;

    // Force reload to refresh the seating chart
    window.location.reload();
  } catch (err) {
    console.error('Error reserving seats:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to reserve seats',
      life: 3000
    });
  }
}

async function updateSectionStatus() {
  try {
    const client = useSupabaseClient();

    // Prepare update data
    const updateData = {
      status: bulkSectionDialog.value.status
    };

    // Build query
    let query = client
      .from('show_seats')
      .update(updateData)
      .eq('show_id', showId)
      .eq('section', selectedSectionForBulk.value.name);

    // Apply filter if only updating available seats
    if (bulkSectionDialog.value.applyTo === 'available') {
      query = query.eq('status', 'available');
    }

    // Execute update
    const { data, error } = await query;

    if (error) throw error;

    toast.add({
      severity: 'success',
      summary: 'Section Updated',
      detail: `Updated seats in section ${selectedSectionForBulk.value.name}`,
      life: 3000
    });

    // Refresh stats
    await fetchSeatStats();

    // Close dialog
    bulkSectionDialog.value.visible = false;

    // Force reload to refresh the seating chart
    window.location.reload();
  } catch (err) {
    console.error('Error updating section:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to update section',
      life: 3000
    });
  }
}

async function markHandicapSeats() {
  try {
    const client = useSupabaseClient();

    // First get regular seats in the selected row
    const { data: seats, error: seatsError } = await client
      .from('show_seats')
      .select('id')
      .eq('show_id', showId)
      .eq('section', handicapSeatsDialog.value.section.name)
      .eq('row_name', handicapSeatsDialog.value.row.name)
      .eq('seat_type', 'regular')
      .eq('handicap_access', false)
      .order('seat_number')
      .limit(handicapSeatsCount.value);

    if (seatsError) throw seatsError;

    if (seats.length < handicapSeatsCount.value) {
      throw new Error(`Only ${seats.length} regular seats available in this row`);
    }

    // Update seats to handicap
    const seatIds = seats.map((seat) => seat.id);

    const { data, error } = await client
      .from('show_seats')
      .update({
        seat_type: 'handicap',
        handicap_access: true
      })
      .in('id', seatIds);

    if (error) throw error;

    toast.add({
      severity: 'success',
      summary: 'Seats Updated',
      detail: `Marked ${seatIds.length} seats as handicap accessible`,
      life: 3000
    });

    // Close dialog
    handicapSeatsDialog.value.visible = false;

    // Force reload to refresh the seating chart
    window.location.reload();
  } catch (err) {
    console.error('Error marking handicap seats:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to mark handicap seats',
      life: 3000
    });
  }
}
</script>
