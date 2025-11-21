<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold mb-2">Costume Catalog</h1>
        <p class="text-gray-600">Browse vendor costume catalogs</p>
      </div>
      <div class="flex gap-2">
        <Button
          label="Import CSV"
          icon="pi pi-upload"
          @click="$router.push('/admin/costume-catalog/import')"
        />
      </div>
    </div>

    <!-- Filters Card -->
    <Card class="mb-6">
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Search -->
          <div class="md:col-span-2">
            <label class="block mb-2 text-sm font-semibold">Search</label>
            <InputText
              v-model="filters.search"
              placeholder="Search by name or SKU..."
              class="w-full"
              @input="debouncedSearch"
            >
              <template #prefix>
                <i class="pi pi-search" />
              </template>
            </InputText>
          </div>

          <!-- Vendor Filter -->
          <div>
            <label class="block mb-2 text-sm font-semibold">Vendor</label>
            <Select
              v-model="filters.vendor_id"
              :options="vendors"
              optionLabel="name"
              optionValue="id"
              placeholder="All Vendors"
              class="w-full"
              :loading="loadingVendors"
              @change="searchCostumes"
            />
          </div>

          <!-- Category Filter -->
          <div>
            <label class="block mb-2 text-sm font-semibold">Category</label>
            <Select
              v-model="filters.category"
              :options="categoryOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Categories"
              class="w-full"
              @change="searchCostumes"
            />
          </div>

          <!-- Gender Filter -->
          <div>
            <label class="block mb-2 text-sm font-semibold">Gender</label>
            <Select
              v-model="filters.gender"
              :options="genderOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Genders"
              class="w-full"
              @change="searchCostumes"
            />
          </div>

          <!-- Season Filter -->
          <div>
            <label class="block mb-2 text-sm font-semibold">Season</label>
            <InputText
              v-model="filters.season"
              placeholder="e.g., 2025"
              class="w-full"
              @input="debouncedSearch"
            />
          </div>

          <!-- Clear Filters -->
          <div class="flex items-end">
            <Button
              label="Clear Filters"
              icon="pi pi-filter-slash"
              severity="secondary"
              outlined
              class="w-full"
              @click="clearFilters"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Results -->
    <Card>
      <template #content>
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12">
          <ProgressSpinner />
          <p class="mt-4 text-gray-600">Loading costumes...</p>
        </div>

        <!-- Results Grid -->
        <div v-else-if="costumes.length > 0">
          <!-- Results Header -->
          <div class="flex justify-between items-center mb-4">
            <p class="text-sm text-gray-600">
              Showing {{ costumes.length }} of {{ totalResults }} costumes
            </p>
            <Select
              v-model="pageSize"
              :options="[20, 50, 100]"
              class="w-32"
              @change="searchCostumes"
            >
              <template #value="{ value }">
                {{ value }} per page
              </template>
            </Select>
          </div>

          <!-- Costumes Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            <div
              v-for="costume in costumes"
              :key="costume.id"
              class="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              @click="viewCostume(costume)"
            >
              <!-- Image -->
              <div class="aspect-square bg-gray-100 relative">
                <img
                  v-if="costume.images?.[0]?.url"
                  :src="costume.images[0].url"
                  :alt="costume.name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                  <i class="pi pi-image text-6xl" />
                </div>
                
                <!-- Availability Badge -->
                <Tag
                  :value="costume.availability"
                  :severity="getAvailabilitySeverity(costume.availability)"
                  class="absolute top-2 right-2"
                />
              </div>

              <!-- Info -->
              <div class="p-4">
                <p class="text-xs text-gray-500 mb-1">{{ costume.vendor?.name }}</p>
                <h3 class="font-semibold mb-1 truncate">{{ costume.name }}</h3>
                <p class="text-xs text-gray-600 mb-2">SKU: {{ costume.vendor_sku }}</p>
                
                <div class="flex justify-between items-center">
                  <span class="font-bold text-lg">
                    {{ formatPrice(costume.price_cents) }}
                  </span>
                  <Tag v-if="costume.category" :value="costume.category" class="text-xs" />
                </div>

                <!-- Sizes -->
                <div v-if="costume.sizes && costume.sizes.length > 0" class="mt-2">
                  <p class="text-xs text-gray-500 mb-1">Sizes:</p>
                  <div class="flex flex-wrap gap-1">
                    <Tag
                      v-for="size in costume.sizes.slice(0, 4)"
                      :key="size.id"
                      :value="size.code"
                      severity="secondary"
                      class="text-xs"
                    />
                    <Tag
                      v-if="costume.sizes.length > 4"
                      :value="`+${costume.sizes.length - 4}`"
                      severity="secondary"
                      class="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <Paginator
            v-model:first="first"
            :rows="pageSize"
            :totalRecords="totalResults"
            :rowsPerPageOptions="[20, 50, 100]"
            @page="onPageChange"
          />
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <i class="pi pi-inbox text-6xl text-gray-300 mb-4" />
          <p class="text-gray-600 mb-2">No costumes found</p>
          <p class="text-sm text-gray-500">Try adjusting your filters or import a catalog</p>
        </div>
      </template>
    </Card>

    <!-- Detail Dialog -->
    <Dialog
      v-model:visible="showDetailDialog"
      :header="selectedCostume?.name"
      :modal="true"
      :style="{ width: '800px' }"
    >
      <div v-if="selectedCostume" class="space-y-4">
        <!-- Images -->
        <div v-if="selectedCostume.images && selectedCostume.images.length > 0">
          <Galleria
            :value="selectedCostume.images"
            :numVisible="5"
            :showThumbnails="selectedCostume.images.length > 1"
            containerStyle="max-width: 100%"
          >
            <template #item="{ item }">
              <img :src="item.url" :alt="item.alt_text || selectedCostume.name" class="w-full" />
            </template>
            <template #thumbnail="{ item }">
              <img :src="item.url" :alt="item.alt_text || selectedCostume.name" class="w-16 h-16 object-cover" />
            </template>
          </Galleria>
        </div>

        <!-- Details Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-semibold text-gray-600">Vendor</label>
            <p>{{ selectedCostume.vendor?.name }}</p>
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">SKU</label>
            <p>{{ selectedCostume.vendor_sku }}</p>
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Price</label>
            <p>{{ formatPrice(selectedCostume.price_cents) }}</p>
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Availability</label>
            <p>
              <Tag
                :value="selectedCostume.availability"
                :severity="getAvailabilitySeverity(selectedCostume.availability)"
              />
            </p>
          </div>
          <div v-if="selectedCostume.category">
            <label class="text-sm font-semibold text-gray-600">Category</label>
            <p>{{ selectedCostume.category }}</p>
          </div>
          <div v-if="selectedCostume.gender">
            <label class="text-sm font-semibold text-gray-600">Gender</label>
            <p>{{ selectedCostume.gender }}</p>
          </div>
          <div v-if="selectedCostume.season">
            <label class="text-sm font-semibold text-gray-600">Season</label>
            <p>{{ selectedCostume.season }}</p>
          </div>
        </div>

        <!-- Description -->
        <div v-if="selectedCostume.description">
          <label class="text-sm font-semibold text-gray-600">Description</label>
          <p class="text-gray-700 mt-1">{{ selectedCostume.description }}</p>
        </div>

        <!-- Sizes -->
        <div v-if="selectedCostume.sizes && selectedCostume.sizes.length > 0">
          <label class="text-sm font-semibold text-gray-600">Available Sizes</label>
          <div class="flex flex-wrap gap-2 mt-2">
            <Tag
              v-for="size in selectedCostume.sizes"
              :key="size.id"
              :value="`${size.code} - ${size.label}`"
              severity="secondary"
            />
          </div>
        </div>

        <!-- Colors -->
        <div v-if="selectedCostume.colors && selectedCostume.colors.length > 0">
          <label class="text-sm font-semibold text-gray-600">Available Colors</label>
          <div class="flex flex-wrap gap-2 mt-2">
            <Tag
              v-for="color in selectedCostume.colors"
              :key="color.id"
              :value="color.name"
            />
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useDebounceFn } from '@vueuse/core'
import { useCostumeCatalogService } from '~/composables/useCostumeCatalogService'
import { COSTUME_CATEGORIES, COSTUME_GENDERS } from '~/types/costume-catalog'
import type { CatalogCostume, Vendor, CostumeSearchParams } from '~/types/costume-catalog'

definePageMeta({
  middleware: 'staff',
  layout: 'default'
})

const toast = useToast()
const catalogService = useCostumeCatalogService()

const costumes = ref<CatalogCostume[]>([])
const vendors = ref<Vendor[]>([])
const loading = ref(false)
const loadingVendors = ref(false)
const totalResults = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const first = ref(0)

const filters = ref<CostumeSearchParams>({
  search: '',
  vendor_id: undefined,
  category: undefined,
  gender: undefined,
  season: undefined
})

const showDetailDialog = ref(false)
const selectedCostume = ref<CatalogCostume | null>(null)

const categoryOptions = COSTUME_CATEGORIES
const genderOptions = COSTUME_GENDERS

// Load vendors on mount
onMounted(async () => {
  loadingVendors.value = true
  const { data } = await catalogService.getVendors()
  if (data.value) {
    vendors.value = data.value
  }
  loadingVendors.value = false
  
  // Load initial costumes
  searchCostumes()
})

// Search costumes
const searchCostumes = async () => {
  loading.value = true
  
  const params: CostumeSearchParams = {
    ...filters.value,
    page: currentPage.value,
    page_size: pageSize.value
  }
  
  // Remove empty filters
  Object.keys(params).forEach(key => {
    if (params[key as keyof CostumeSearchParams] === '' || params[key as keyof CostumeSearchParams] === undefined) {
      delete params[key as keyof CostumeSearchParams]
    }
  })

  const { data, error } = await catalogService.searchCostumes(params)
  
  if (error.value) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load costumes',
      life: 3000
    })
  } else if (data.value) {
    costumes.value = data.value.costumes
    totalResults.value = data.value.total
  }
  
  loading.value = false
}

// Debounced search for text inputs
const debouncedSearch = useDebounceFn(() => {
  currentPage.value = 1
  first.value = 0
  searchCostumes()
}, 500)

// Clear filters
const clearFilters = () => {
  filters.value = {
    search: '',
    vendor_id: undefined,
    category: undefined,
    gender: undefined,
    season: undefined
  }
  currentPage.value = 1
  first.value = 0
  searchCostumes()
}

// Handle page change
const onPageChange = (event: any) => {
  currentPage.value = event.page + 1
  first.value = event.first
  searchCostumes()
}

// View costume details
const viewCostume = (costume: CatalogCostume) => {
  selectedCostume.value = costume
  showDetailDialog.value = true
}

// Utility methods
const formatPrice = catalogService.formatPrice

const getAvailabilitySeverity = (availability: string) => {
  const severities: Record<string, string> = {
    in_stock: 'success',
    limited: 'warn',
    pre_order: 'info',
    discontinued: 'danger',
    unknown: 'secondary'
  }
  return severities[availability] || 'secondary'
}
</script>
