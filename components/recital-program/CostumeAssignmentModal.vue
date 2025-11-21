<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    header="Assign Costume"
    :style="{width: '900px', maxHeight: '90vh'}"
    @update:visible="handleClose"
  >
    <div class="costume-assignment-modal">
      <!-- Search and Filters -->
      <div class="mb-4 p-4 bg-gray-50 rounded-lg">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div class="field">
            <label for="search" class="block mb-2 text-sm font-medium">Search</label>
            <InputText
              id="search"
              v-model="searchParams.search"
              placeholder="Search costumes..."
              class="w-full"
              @input="debouncedSearch"
            />
          </div>

          <div class="field">
            <label for="vendor" class="block mb-2 text-sm font-medium">Vendor</label>
            <Select
              id="vendor"
              v-model="searchParams.vendor_id"
              :options="vendors"
              optionLabel="name"
              optionValue="id"
              placeholder="All Vendors"
              class="w-full"
              showClear
              @change="searchCostumes"
            />
          </div>

          <div class="field">
            <label for="category" class="block mb-2 text-sm font-medium">Category</label>
            <Select
              id="category"
              v-model="searchParams.category"
              :options="categories"
              placeholder="All Categories"
              class="w-full"
              showClear
              @change="searchCostumes"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="field">
            <label for="gender" class="block mb-2 text-sm font-medium">Gender</label>
            <Select
              id="gender"
              v-model="searchParams.gender"
              :options="genders"
              placeholder="All Genders"
              class="w-full"
              showClear
              @change="searchCostumes"
            />
          </div>

          <div class="field">
            <label for="season" class="block mb-2 text-sm font-medium">Season</label>
            <InputText
              id="season"
              v-model="searchParams.season"
              placeholder="e.g., 2025"
              class="w-full"
              @input="debouncedSearch"
            />
          </div>

          <div class="field">
            <label for="availability" class="block mb-2 text-sm font-medium">Availability</label>
            <Select
              id="availability"
              v-model="searchParams.availability"
              :options="availabilityOptions"
              placeholder="All"
              class="w-full"
              showClear
              @change="searchCostumes"
            />
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-8">
        <ProgressSpinner class="w-12 h-12" />
      </div>

      <!-- Results Grid -->
      <div v-else-if="costumes.length > 0" class="costume-results">
        <div class="mb-3 text-sm text-gray-600">
          Found {{ totalCostumes }} costume{{ totalCostumes !== 1 ? 's' : '' }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-2">
          <div
            v-for="costume in costumes"
            :key="costume.id"
            class="costume-card border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            :class="{ 'border-primary-500 bg-primary-50': selectedCostume?.id === costume.id }"
            @click="selectCostume(costume)"
          >
            <div class="flex gap-3">
              <!-- Costume Image -->
              <div class="flex-shrink-0">
                <Image
                  :src="costume.primary_image?.url || 'https://via.placeholder.com/80'"
                  :alt="costume.name"
                  width="80"
                  height="80"
                  class="rounded object-cover"
                  imageClass="rounded"
                  preview
                />
              </div>

              <!-- Costume Info -->
              <div class="flex-grow min-w-0">
                <h4 class="font-semibold text-sm mb-1 truncate">{{ costume.name }}</h4>
                <div class="text-xs text-gray-600 mb-2">
                  <div class="flex items-center gap-1 mb-1">
                    <i class="pi pi-building text-xs"></i>
                    <span>{{ costume.vendor?.name }}</span>
                  </div>
                  <div class="flex items-center gap-1 mb-1">
                    <i class="pi pi-tag text-xs"></i>
                    <span>{{ costume.vendor_sku }}</span>
                  </div>
                  <div v-if="costume.category" class="flex items-center gap-1">
                    <i class="pi pi-bookmark text-xs"></i>
                    <span class="capitalize">{{ costume.category }}</span>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <span class="font-semibold text-primary-700">
                    {{ formatPrice(costume.price_cents, costume.currency) }}
                  </span>
                  <Tag
                    :value="costume.availability || 'Unknown'"
                    :severity="getAvailabilitySeverity(costume.availability)"
                    class="text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center mt-4">
          <Paginator
            :rows="pageSize"
            :totalRecords="totalCostumes"
            :rowsPerPageOptions="[10, 20, 50]"
            @page="onPageChange"
          />
        </div>
      </div>

      <!-- No Results -->
      <div v-else class="text-center py-8 text-gray-500">
        <i class="pi pi-search text-3xl mb-2"></i>
        <p>No costumes found. Try adjusting your search filters.</p>
      </div>

      <!-- Assignment Form (shown when costume is selected) -->
      <div v-if="selectedCostume" class="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <i class="pi pi-check-circle text-primary-600"></i>
          Selected: {{ selectedCostume.name }}
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="field">
            <label for="is_primary" class="flex items-center gap-2">
              <Checkbox
                id="is_primary"
                v-model="assignmentForm.is_primary"
                binary
              />
              <span class="text-sm font-medium">Primary Costume</span>
            </label>
            <small class="text-gray-600">Check if this is the main costume for this performance</small>
          </div>

          <div class="field">
            <label for="quantity_needed" class="block mb-2 text-sm font-medium">Quantity Needed</label>
            <InputNumber
              id="quantity_needed"
              v-model="assignmentForm.quantity_needed"
              :min="1"
              :max="100"
              showButtons
              class="w-full"
            />
          </div>
        </div>

        <div class="field mt-4">
          <label for="notes" class="block mb-2 text-sm font-medium">Notes</label>
          <Textarea
            id="notes"
            v-model="assignmentForm.notes"
            rows="3"
            placeholder="Add any notes about this costume assignment..."
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="handleClose"
        />
        <Button
          label="Assign Costume"
          icon="pi pi-check"
          :disabled="!selectedCostume"
          :loading="saving"
          @click="handleAssign"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useCostumeCatalogService } from '~/composables/useCostumeCatalogService';
import type { CatalogCostume, Vendor } from '~/types/costume-catalog';
import { COSTUME_CATEGORIES, COSTUME_GENDERS } from '~/types/costume-catalog';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  performanceId: {
    type: String,
    required: true
  }
});

// Emits
const emit = defineEmits(['update:visible', 'assigned']);

// Composables
const costumeCatalogService = useCostumeCatalogService();
const toast = useToast();

// Local state
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const loading = ref(false);
const saving = ref(false);
const vendors = ref<Vendor[]>([]);
const costumes = ref<CatalogCostume[]>([]);
const selectedCostume = ref<CatalogCostume | null>(null);
const totalCostumes = ref(0);
const totalPages = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

// Search params
const searchParams = ref({
  search: '',
  vendor_id: null,
  category: null,
  gender: null,
  season: '',
  availability: null,
  is_active: true,
  page: 1,
  page_size: 10
});

// Assignment form
const assignmentForm = ref({
  is_primary: true,
  quantity_needed: 1,
  notes: ''
});

// Constants
const categories = COSTUME_CATEGORIES;
const genders = COSTUME_GENDERS;
const availabilityOptions = ['in_stock', 'limited', 'made_to_order', 'discontinued'];

// Load vendors on mount
onMounted(async () => {
  await loadVendors();
  await searchCostumes();
});

// Watch for visibility changes
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm();
    searchCostumes();
  }
});

// Methods
async function loadVendors() {
  const result = await costumeCatalogService.getVendors();
  if (result.vendors) {
    vendors.value = result.vendors;
  }
}

async function searchCostumes() {
  loading.value = true;
  try {
    const result = await costumeCatalogService.searchCostumes(searchParams.value);
    if (result) {
      costumes.value = result.costumes;
      totalCostumes.value = result.total;
      totalPages.value = result.total_pages;
      currentPage.value = result.page;
    }
  } catch (error) {
    console.error('Error searching costumes:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to search costumes',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
}

// Debounced search for text inputs
let searchTimeout: NodeJS.Timeout;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchParams.value.page = 1; // Reset to first page
    searchCostumes();
  }, 500);
}

function selectCostume(costume: CatalogCostume) {
  selectedCostume.value = costume;
}

function onPageChange(event: any) {
  searchParams.value.page = event.page + 1;
  searchParams.value.page_size = event.rows;
  pageSize.value = event.rows;
  searchCostumes();
}

async function handleAssign() {
  if (!selectedCostume.value) return;

  saving.value = true;
  try {
    const result = await costumeCatalogService.assignCostumeToPerformance({
      performance_id: props.performanceId,
      costume_id: selectedCostume.value.id,
      is_primary: assignmentForm.value.is_primary,
      quantity_needed: assignmentForm.value.quantity_needed,
      notes: assignmentForm.value.notes
    });

    if (result) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Costume assigned successfully',
        life: 3000
      });

      emit('assigned', result);
      handleClose();
    }
  } catch (error) {
    console.error('Error assigning costume:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to assign costume',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
}

function handleClose() {
  emit('update:visible', false);
  resetForm();
}

function resetForm() {
  selectedCostume.value = null;
  assignmentForm.value = {
    is_primary: true,
    quantity_needed: 1,
    notes: ''
  };
  searchParams.value = {
    search: '',
    vendor_id: null,
    category: null,
    gender: null,
    season: '',
    availability: null,
    is_active: true,
    page: 1,
    page_size: 10
  };
}

function formatPrice(priceCents: number, currency: string = 'USD') {
  return costumeCatalogService.formatPrice(priceCents, currency);
}

function getAvailabilitySeverity(availability: string) {
  return costumeCatalogService.getAvailabilityColor(availability);
}
</script>

<style scoped>
.costume-card {
  transition: all 0.2s ease-in-out;
}

.costume-card:hover {
  transform: translateY(-2px);
}
</style>
