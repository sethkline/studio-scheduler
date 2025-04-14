<template>
  <div class="seating-chart">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-8">
      <ProgressSpinner class="w-12 h-12" />
      <p class="ml-4 text-gray-500">Loading seating chart...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
      <div class="flex items-center">
        <i class="pi pi-exclamation-triangle text-red-500 text-2xl mr-3"></i>
        <div>
          <h3 class="font-bold">Error Loading Seating Chart</h3>
          <p>{{ error }}</p>
          <Button label="Try Again" class="mt-3" @click="fetchSeatingData" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!sections.length" class="p-6 text-center bg-gray-50 rounded-lg">
      <i class="pi pi-info-circle text-3xl text-gray-400 mb-3"></i>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">No Seating Chart Available</h3>
      <p class="text-gray-500 mb-4">This show doesn't have a seating chart configured yet.</p>
      <Button label="Generate Seats" icon="pi pi-plus" @click="$emit('generate-seats')" />
    </div>

    <!-- Actual Seating Chart -->
    <div v-else class="seating-chart-container">
      <!-- Controls and Legend -->
      <div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <!-- Filters -->
        <div class="flex flex-wrap gap-2">
          <Dropdown v-model="selectedSection" :options="sectionOptions" 
                  optionLabel="name" class="w-48" placeholder="All Sections" />
                  
          <MultiSelect v-model="selectedStatuses" :options="statusOptions" 
                      optionLabel="label" display="chip" class="w-48"
                      placeholder="All Statuses" />
        </div>
        
        <!-- Legend -->
        <div class="flex flex-wrap gap-3">
          <div class="flex items-center">
            <div class="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span class="text-sm">Available</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 bg-red-500 rounded mr-2"></div>
            <span class="text-sm">Sold</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
            <span class="text-sm">Reserved</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span class="text-sm">Handicap</span>
          </div>
        </div>
      </div>

      <!-- Stage Area -->
      <div class="stage-area mb-8">
        <div class="stage-platform">STAGE</div>
      </div>

      <!-- Sections -->
      <div class="sections-container">
        <div v-for="section in filteredSections" :key="section.id" class="section-block mb-10">
          <h3 class="text-lg font-semibold mb-3">{{ section.name }}</h3>
          
          <div class="rows-container">
            <div v-for="row in section.rows" :key="row.id" class="row-block mb-4">
              <div class="row-label">{{ row.name }}</div>
              
              <div class="seats-container flex flex-wrap gap-1">
                <div v-for="seat in row.seats" :key="seat.id"
                    class="seat"
                    :class="getSeatClasses(seat)"
                    @click="selectSeat(seat)">
                  {{ seat.seat_number }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Seat Detail Sidebar -->
    <Sidebar v-model:visible="seatDetailVisible" position="right" class="p-sidebar-lg">
      <template #header>
        <div class="flex justify-between items-center w-full">
          <h2 class="text-xl font-bold">Seat Details</h2>
          <Button icon="pi pi-times" class="p-button-rounded p-button-text" @click="seatDetailVisible = false" />
        </div>
      </template>
      
      <div v-if="selectedSeat" class="p-4">
        <div class="mb-6">
          <div class="text-sm text-gray-500">Section</div>
          <div class="font-medium">{{ selectedSeat.section }}</div>
          
          <div class="text-sm text-gray-500 mt-3">Row</div>
          <div class="font-medium">{{ selectedSeat.row_name }}</div>
          
          <div class="text-sm text-gray-500 mt-3">Seat Number</div>
          <div class="font-medium">{{ selectedSeat.seat_number }}</div>
          
          <div class="text-sm text-gray-500 mt-3">Status</div>
          <div class="font-medium">
            <Tag :value="selectedSeat.status" 
                :severity="getStatusSeverity(selectedSeat.status)" />
          </div>
          
          <div class="text-sm text-gray-500 mt-3">Type</div>
          <div class="font-medium">
            {{ selectedSeat.seat_type === 'handicap' ? 'Handicap Accessible' : 'Regular' }}
          </div>
        </div>
        
        <!-- Customer Information if sold -->
        <div v-if="selectedSeat.status === 'sold' && selectedSeat.customer" class="mb-6 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <h3 class="font-semibold mb-2">Customer Information</h3>
          <div class="text-sm text-gray-500">Name</div>
          <div class="font-medium">{{ selectedSeat.customer.name }}</div>
          
          <div class="text-sm text-gray-500 mt-2">Email</div>
          <div class="font-medium">{{ selectedSeat.customer.email }}</div>
          
          <div class="text-sm text-gray-500 mt-2">Order #</div>
          <div class="font-medium">{{ selectedSeat.customer.order_id }}</div>
        </div>
        
        <!-- Actions -->
        <div class="space-y-3">
          <h3 class="font-semibold mb-2">Actions</h3>
          
          <!-- Change Status -->
          <div>
            <label class="text-sm text-gray-500 block mb-1">Change Status</label>
            <Dropdown v-model="selectedSeatStatus" :options="seatStatusOptions"
                      optionLabel="label" optionValue="value" class="w-full" />
          </div>
          
          <!-- Toggle Handicap -->
          <div class="flex items-center mt-4">
            <ToggleButton v-model="selectedSeatHandicap" 
                         onLabel="Handicap Accessible" 
                         offLabel="Regular Seat" 
                         class="w-full" />
          </div>
          
          <!-- Reserve for Customer Form -->
          <div v-if="selectedSeatStatus === 'reserved'" class="mt-4 border-t pt-4">
            <h4 class="font-medium mb-2">Reserve for Customer</h4>
            
            <div class="field mb-3">
              <label class="text-sm text-gray-500 block mb-1">Customer Name</label>
              <InputText v-model="reservationForm.name" class="w-full" />
            </div>
            
            <div class="field mb-3">
              <label class="text-sm text-gray-500 block mb-1">Email</label>
              <InputText v-model="reservationForm.email" class="w-full" />
            </div>
            
            <div class="field mb-3">
              <label class="text-sm text-gray-500 block mb-1">Phone</label>
              <InputText v-model="reservationForm.phone" class="w-full" />
            </div>
            
            <div class="field mb-3">
              <label class="text-sm text-gray-500 block mb-1">Notes</label>
              <Textarea v-model="reservationForm.notes" rows="2" class="w-full" />
            </div>
          </div>
          
          <!-- Save Button -->
          <div class="flex justify-end mt-4 pt-3 border-t">
            <Button label="Cancel" class="p-button-text mr-2" @click="seatDetailVisible = false" />
            <Button label="Save Changes" icon="pi pi-check" 
                   :loading="savingSeat"
                   @click="saveSeatChanges" />
          </div>
        </div>
      </div>
    </Sidebar>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  showId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['generate-seats', 'update-seat']);

// Services
const toast = useToast();
const { fetchShowSeats, updateSeat } = useApiService();

// State
const loading = ref(true);
const error = ref(null);
const sections = ref([]);
const selectedSection = ref(null);
const selectedStatuses = ref([]);
const seatDetailVisible = ref(false);
const selectedSeat = ref(null);
const savingSeat = ref(false);

// Form state
const selectedSeatStatus = ref('available');
const selectedSeatHandicap = ref(false);
const reservationForm = ref({
  name: '',
  email: '',
  phone: '',
  notes: ''
});

// Options
const statusOptions = [
  { label: 'Available', value: 'available' },
  { label: 'Reserved', value: 'reserved' },
  { label: 'Sold', value: 'sold' }
];

const seatStatusOptions = [
  { label: 'Available', value: 'available' },
  { label: 'Reserved', value: 'reserved' },
  { label: 'Sold', value: 'sold' }
];

// Computed
const sectionOptions = computed(() => {
  return sections.value.map(section => ({
    id: section.id,
    name: section.name
  }));
});

const filteredSections = computed(() => {
  let result = [...sections.value];
  
  // Filter by selected section
  if (selectedSection.value) {
    result = result.filter(section => section.id === selectedSection.value.id);
  }
  
  // Filter by selected statuses
  if (selectedStatuses.value.length > 0) {
    const statusValues = selectedStatuses.value.map(status => status.value);
    
    result = result.map(section => {
      const filteredRows = section.rows.map(row => {
        const filteredSeats = row.seats.filter(seat => 
          statusValues.includes(seat.status)
        );
        
        return {
          ...row,
          seats: filteredSeats
        };
      }).filter(row => row.seats.length > 0);
      
      return {
        ...section,
        rows: filteredRows
      };
    }).filter(section => section.rows.length > 0);
  }
  
  return result;
});

// Lifecycle
onMounted(() => {
  fetchSeatingData();
});

// Watch for selected seat changes
watch(selectedSeat, (newSeat) => {
  if (newSeat) {
    selectedSeatStatus.value = newSeat.status;
    selectedSeatHandicap.value = newSeat.seat_type === 'handicap';
    
    // Reset reservation form
    reservationForm.value = {
      name: newSeat.customer?.name || '',
      email: newSeat.customer?.email || '',
      phone: newSeat.customer?.phone || '',
      notes: newSeat.customer?.notes || ''
    };
  }
});

// Methods
async function fetchSeatingData() {
  loading.value = true;
  error.value = null;
  
  try {
    // Call the API endpoint through our service
    const { data, error: apiError } = await fetchShowSeats(props.showId);
    
    if (apiError.value) {
      throw new Error(apiError.value.statusMessage || 'Failed to fetch seats');
    }
    
    if (!data.value || !data.value.seats || data.value.seats.length === 0) {
      sections.value = [];
      loading.value = false;
      return;
    }
    
    // Process the data to organize by sections and rows
    const seatsBySection = {};
    
    // Group seats by section and row
    for (const seat of data.value.seats) {
      if (!seatsBySection[seat.section]) {
        seatsBySection[seat.section] = {
          id: seat.section,
          name: seat.section,
          type: seat.section_type,
          rows: {}
        };
      }
      
      if (!seatsBySection[seat.section].rows[seat.row_name]) {
        seatsBySection[seat.section].rows[seat.row_name] = {
          id: `${seat.section}-${seat.row_name}`,
          name: seat.row_name,
          seats: []
        };
      }
      
      seatsBySection[seat.section].rows[seat.row_name].seats.push(seat);
    }
    
    // Convert to arrays and sort
    const processedSections = Object.values(seatsBySection).map(section => {
      section.rows = Object.values(section.rows).sort((a, b) => 
        a.name.localeCompare(b.name, undefined, {numeric: true})
      );
      
      section.rows.forEach(row => {
        row.seats.sort((a, b) => 
          parseInt(a.seat_number) - parseInt(b.seat_number)
        );
      });
      
      return section;
    }).sort((a, b) => a.name.localeCompare(b.name));
    
    sections.value = processedSections;
    
    // Simulate customer data for sold seats
    await simulateCustomerData();
    
  } catch (err) {
    console.error('Error fetching seating data:', err);
    error.value = err.message || 'Failed to load seating chart';
  } finally {
    loading.value = false;
  }
}

async function simulateCustomerData() {
  // This would fetch customer information for sold/reserved seats via an API call
  // For now, we'll simulate with some dummy data
  
  // Find all sold/reserved seats
  const allSeats = sections.value.flatMap(section => 
    section.rows.flatMap(row => row.seats)
  );
  
  const soldSeats = allSeats.filter(seat => seat.status === 'sold');
  
  // Simulate customer data
  for (const seat of soldSeats) {
    // Add simulated customer info
    seat.customer = {
      name: `Customer ${Math.floor(Math.random() * 100)}`,
      email: `customer${Math.floor(Math.random() * 100)}@example.com`,
      phone: `555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      order_id: `ORD-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
    };
  }
}

function selectSeat(seat) {
  selectedSeat.value = seat;
  seatDetailVisible.value = true;
}

function getSeatClasses(seat) {
  const classes = ['cursor-pointer'];
  
  // Base classes
  if (seat.status === 'available') {
    classes.push('seat-available');
  } else if (seat.status === 'sold') {
    classes.push('seat-sold');
  } else if (seat.status === 'reserved') {
    classes.push('seat-reserved');
  }
  
  // Handicap class
  if (seat.seat_type === 'handicap' || seat.handicap_access) {
    classes.push('seat-handicap');
  }
  
  return classes;
}

function getStatusSeverity(status) {
  const map = {
    'available': 'success',
    'sold': 'danger',
    'reserved': 'warning'
  };
  
  return map[status] || 'info';
}

async function saveSeatChanges() {
  if (!selectedSeat.value) return;
  
  savingSeat.value = true;
  
  try {
    // Prepare update data
    const updateData = {
      status: selectedSeatStatus.value,
      seat_type: selectedSeatHandicap.value ? 'handicap' : 'regular',
      handicap_access: selectedSeatHandicap.value
    };
    
    // If reserving, add customer information
    if (selectedSeatStatus.value === 'reserved') {
      updateData.customer = {
        name: reservationForm.value.name,
        email: reservationForm.value.email,
        phone: reservationForm.value.phone,
        notes: reservationForm.value.notes
      };
    }
    
    // Call API through service
    const { data, error: apiError } = await updateSeat(
      props.showId, 
      selectedSeat.value.id, 
      updateData
    );
    
    if (apiError.value) {
      throw new Error(apiError.value.statusMessage || 'Failed to update seat');
    }
    
    const updatedSeat = data.value.seat;
    
    // Update local state
    // Find and update the seat in our sections data
    sections.value.forEach(section => {
      if (section.name === selectedSeat.value.section) {
        section.rows.forEach(row => {
          if (row.name === selectedSeat.value.row_name) {
            const seatIndex = row.seats.findIndex(s => s.id === updatedSeat.id);
            if (seatIndex !== -1) {
              // Update the seat while preserving any customer data we have locally
              const customerData = selectedSeatStatus.value === 'sold' ? 
                row.seats[seatIndex].customer : 
                selectedSeatStatus.value === 'reserved' ? reservationForm.value : null;
                
              row.seats[seatIndex] = {
                ...updatedSeat,
                section: selectedSeat.value.section,
                row_name: selectedSeat.value.row_name,
                customer: customerData
              };
            }
          }
        });
      }
    });
    
    // Emit event for parent components
    emit('update-seat', updatedSeat);
    
    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Seat Updated',
      detail: `Seat ${selectedSeat.value.section} ${selectedSeat.value.row_name}-${selectedSeat.value.seat_number} has been updated`,
      life: 3000
    });
    
    // Close sidebar
    seatDetailVisible.value = false;
    
  } catch (err) {
    console.error('Error updating seat:', err);
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: err.message || 'Failed to update seat',
      life: 3000
    });
  } finally {
    savingSeat.value = false;
  }
}
</script>

<style scoped>
.seating-chart-container {
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 0.5rem;
}

.stage-area {
  display: flex;
  justify-content: center;
  align-items: center;
}

.stage-platform {
  background-color: #ddd;
  padding: 1rem 4rem;
  font-weight: bold;
  border-radius: 5px;
  text-align: center;
  width: 50%;
  max-width: 300px;
}

.row-block {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.row-label {
  width: 2rem;
  font-weight: bold;
  text-align: center;
  margin-right: 1rem;
}

.seats-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.seat {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 4px;
  transition: all 0.2s;
  border: 2px solid #ccc;
}

.seat:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.seat-available {
  background-color: #4ade80; /* green-500 */
  color: white;
}

.seat-sold {
  background-color: #ef4444; /* red-500 */
  color: white;
}

.seat-reserved {
  background-color: #facc15; /* yellow-500 */
  color: black;
}

.seat-handicap {
  position: relative;
}

.seat-handicap::after {
  content: "♿";
  position: absolute;
  top: -8px;
  right: -5px;
  font-size: 12px;
  color: #3b82f6; /* blue-500 */
  background-color: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>