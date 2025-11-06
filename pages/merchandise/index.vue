<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Studio Merchandise</h1>
        <p class="mt-2 text-gray-600">Show your studio pride with our exclusive merchandise</p>
      </div>

      <!-- Cart Button -->
      <Button
        @click="navigateTo('/merchandise/cart')"
        severity="secondary"
        outlined
        class="relative"
      >
        <i class="pi pi-shopping-cart mr-2"></i>
        Cart
        <Badge
          v-if="cartStore.itemCount > 0"
          :value="cartStore.itemCount"
          severity="danger"
          class="ml-2"
        />
      </Button>
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap gap-4">
      <Dropdown
        v-model="selectedCategory"
        :options="categories"
        option-label="label"
        option-value="value"
        placeholder="All Categories"
        class="w-48"
        @change="applyFilters"
      />

      <InputText
        v-model="searchQuery"
        placeholder="Search products..."
        class="w-64"
        @keyup.enter="applyFilters"
      />

      <Button
        @click="applyFilters"
        icon="pi pi-search"
        label="Search"
      />

      <Button
        v-if="selectedCategory || searchQuery"
        @click="clearFilters"
        icon="pi pi-times"
        label="Clear"
        severity="secondary"
        outlined
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <ProgressSpinner />
    </div>

    <!-- Error State -->
    <Message v-else-if="error" severity="error" class="mb-4">
      {{ error }}
    </Message>

    <!-- Empty State -->
    <div v-else-if="!products || products.length === 0" class="text-center py-20">
      <i class="pi pi-shopping-bag text-6xl text-gray-300 mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
      <p class="text-gray-500">Check back later for new merchandise!</p>
    </div>

    <!-- Products Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <Card
        v-for="product in products"
        :key="product.id"
        class="cursor-pointer hover:shadow-lg transition-shadow"
        @click="navigateTo(`/merchandise/${product.id}`)"
      >
        <template #header>
          <img
            :src="product.image_url || '/placeholder-product.png'"
            :alt="product.name"
            class="w-full h-64 object-cover"
          />
        </template>

        <template #title>
          {{ product.name }}
        </template>

        <template #subtitle>
          <div class="flex items-center justify-between mt-2">
            <span class="text-lg font-bold text-primary-600">
              {{ formatPrice(product.base_price_in_cents) }}
            </span>
            <Tag
              :value="product.category"
              :severity="getCategorySeverity(product.category)"
            />
          </div>
        </template>

        <template #content>
          <p class="text-gray-600 text-sm line-clamp-2">
            {{ product.description }}
          </p>

          <!-- Variant Info -->
          <div v-if="product.variants && product.variants.length > 0" class="mt-4">
            <p class="text-xs text-gray-500">
              {{ product.variants.length }} size{{ product.variants.length !== 1 ? 's' : '' }} available
            </p>
          </div>
        </template>

        <template #footer>
          <Button
            label="View Details"
            icon="pi pi-arrow-right"
            icon-pos="right"
            class="w-full"
            @click.stop="navigateTo(`/merchandise/${product.id}`)"
          />
        </template>
      </Card>
    </div>

    <!-- Pagination -->
    <div v-if="pagination && pagination.totalPages > 1" class="mt-8">
      <Paginator
        :rows="pagination.limit"
        :total-records="pagination.totalItems"
        :first="(pagination.page - 1) * pagination.limit"
        @page="onPageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { MerchandiseProduct, ProductFilters } from '~/types/merchandise'
import { useCartStore } from '~/stores/cart'

// Page meta
definePageMeta({
  layout: 'default'
})

// Store
const cartStore = useCartStore()

// State
const products = ref<MerchandiseProduct[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const pagination = ref<any>(null)
const selectedCategory = ref<string | null>(null)
const searchQuery = ref('')

// Services
const { fetchProducts } = useMerchandiseService()

// Category options
const categories = [
  { label: 'All Categories', value: null },
  { label: 'Apparel', value: 'apparel' },
  { label: 'Accessories', value: 'accessories' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Gifts', value: 'gifts' },
  { label: 'Other', value: 'other' }
]

// Methods
const loadProducts = async (filters?: ProductFilters) => {
  loading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await fetchProducts({
      ...filters,
      is_active: true // Only show active products
    })

    if (fetchError.value) {
      throw new Error(fetchError.value.message)
    }

    if (data.value) {
      products.value = data.value.products
      pagination.value = data.value.pagination
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load products'
    console.error('Error loading products:', err)
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  const filters: ProductFilters = {
    is_active: true
  }

  if (selectedCategory.value) {
    filters.category = selectedCategory.value as any
  }

  if (searchQuery.value) {
    filters.search = searchQuery.value
  }

  loadProducts(filters)
}

const clearFilters = () => {
  selectedCategory.value = null
  searchQuery.value = ''
  loadProducts({ is_active: true })
}

const onPageChange = (event: any) => {
  const filters: ProductFilters = {
    is_active: true
  }

  if (selectedCategory.value) {
    filters.category = selectedCategory.value as any
  }

  if (searchQuery.value) {
    filters.search = searchQuery.value
  }

  // Add page parameter (Nuxt useFetch will handle this)
  loadProducts({
    ...filters,
    page: event.page + 1
  } as any)
}

const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`
}

const getCategorySeverity = (category: string): string => {
  const severityMap: Record<string, string> = {
    apparel: 'info',
    accessories: 'success',
    equipment: 'warning',
    gifts: 'danger',
    other: 'secondary'
  }
  return severityMap[category] || 'secondary'
}

// Lifecycle
onMounted(() => {
  cartStore.initializeCart()
  loadProducts({ is_active: true })
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
