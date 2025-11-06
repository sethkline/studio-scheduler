<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Back Button -->
    <Button
      label="Back to Store"
      icon="pi pi-arrow-left"
      text
      @click="navigateTo('/merchandise')"
      class="mb-6"
    />

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <ProgressSpinner />
    </div>

    <!-- Error State -->
    <Message v-else-if="error" severity="error" class="mb-4">
      {{ error }}
    </Message>

    <!-- Product Details -->
    <div v-else-if="product" class="grid grid-cols-1 lg:grid-cols-2 gap-12">
      <!-- Product Images -->
      <div>
        <img
          :src="currentImage"
          :alt="product.name"
          class="w-full rounded-lg shadow-lg mb-4"
        />

        <!-- Thumbnail Gallery -->
        <div v-if="images.length > 1" class="grid grid-cols-4 gap-2">
          <img
            v-for="(image, index) in images"
            :key="index"
            :src="image"
            :alt="`${product.name} ${index + 1}`"
            class="w-full h-24 object-cover rounded cursor-pointer border-2 hover:border-primary-500 transition-colors"
            :class="{ 'border-primary-500': currentImage === image }"
            @click="currentImage = image"
          />
        </div>
      </div>

      <!-- Product Info -->
      <div>
        <div class="mb-4">
          <Tag :value="product.category" :severity="getCategorySeverity(product.category)" />
        </div>

        <h1 class="text-3xl font-bold text-gray-900 mb-4">{{ product.name }}</h1>

        <div class="text-2xl font-bold text-primary-600 mb-6">
          {{ formatPrice(selectedVariant ? getVariantPrice(selectedVariant) : product.base_price_in_cents) }}
        </div>

        <p class="text-gray-600 mb-8 whitespace-pre-line">{{ product.description }}</p>

        <!-- Variant Selection -->
        <div v-if="product.variants && product.variants.length > 0" class="mb-8">
          <!-- Size Selection -->
          <div v-if="hasSizes" class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Select Size
            </label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="variant in availableVariants"
                :key="variant.id"
                :label="variant.size || 'One Size'"
                :outlined="selectedVariant?.id !== variant.id"
                :severity="selectedVariant?.id === variant.id ? 'primary' : 'secondary'"
                :disabled="!isVariantAvailable(variant)"
                @click="selectVariant(variant)"
              />
            </div>
          </div>

          <!-- Color Selection -->
          <div v-if="hasColors" class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Select Color
            </label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="variant in availableVariants"
                :key="variant.id"
                :label="variant.color || 'Default'"
                :outlined="selectedVariant?.id !== variant.id"
                :severity="selectedVariant?.id === variant.id ? 'primary' : 'secondary'"
                :disabled="!isVariantAvailable(variant)"
                @click="selectVariant(variant)"
              />
            </div>
          </div>

          <!-- Stock Status -->
          <div v-if="selectedVariant" class="mb-6">
            <div v-if="getAvailableStock(selectedVariant) > 0" class="flex items-center text-green-600">
              <i class="pi pi-check-circle mr-2"></i>
              <span>{{ getAvailableStock(selectedVariant) }} in stock</span>
            </div>
            <div v-else class="flex items-center text-red-600">
              <i class="pi pi-times-circle mr-2"></i>
              <span>Out of stock</span>
            </div>
          </div>
        </div>

        <!-- Quantity Selection -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Quantity
          </label>
          <InputNumber
            v-model="quantity"
            :min="1"
            :max="maxQuantity"
            :disabled="!canAddToCart"
            show-buttons
            class="w-32"
          />
        </div>

        <!-- Add to Cart Button -->
        <div class="flex gap-4">
          <Button
            label="Add to Cart"
            icon="pi pi-shopping-cart"
            :disabled="!canAddToCart"
            @click="addToCart"
            class="flex-1"
            size="large"
          />

          <Button
            label="Buy Now"
            icon="pi pi-arrow-right"
            icon-pos="right"
            :disabled="!canAddToCart"
            @click="buyNow"
            severity="success"
            class="flex-1"
            size="large"
          />
        </div>

        <!-- Error Message -->
        <Message v-if="addToCartError" severity="error" class="mt-4">
          {{ addToCartError }}
        </Message>

        <!-- Success Message -->
        <Message v-if="addToCartSuccess" severity="success" class="mt-4">
          Added to cart successfully!
        </Message>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ProductWithDetails, MerchandiseVariant } from '~/types/merchandise'
import { useCartStore } from '~/stores/cart'

// Page meta
definePageMeta({
  layout: 'default'
})

// Router
const route = useRoute()
const productId = route.params.id as string

// Store
const cartStore = useCartStore()

// State
const product = ref<ProductWithDetails | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const selectedVariant = ref<MerchandiseVariant | null>(null)
const quantity = ref(1)
const currentImage = ref('')
const addToCartError = ref<string | null>(null)
const addToCartSuccess = ref(false)

// Services
const { fetchProduct } = useMerchandiseService()

// Computed
const images = computed(() => {
  if (!product.value) return []

  const imgs = [product.value.image_url]

  if (product.value.additional_images && product.value.additional_images.length > 0) {
    imgs.push(...product.value.additional_images)
  }

  return imgs.filter(Boolean)
})

const availableVariants = computed(() => {
  return product.value?.variants?.filter(v => v.is_available) || []
})

const hasSizes = computed(() => {
  return availableVariants.value.some(v => v.size)
})

const hasColors = computed(() => {
  return availableVariants.value.some(v => v.color)
})

const maxQuantity = computed(() => {
  if (!selectedVariant.value) return 1
  return getAvailableStock(selectedVariant.value)
})

const canAddToCart = computed(() => {
  if (!product.value) return false

  if (product.value.variants && product.value.variants.length > 0) {
    if (!selectedVariant.value) return false
    return getAvailableStock(selectedVariant.value) > 0
  }

  return true
})

// Methods
const loadProduct = async () => {
  loading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await fetchProduct(productId)

    if (fetchError.value) {
      throw new Error(fetchError.value.message)
    }

    if (data.value) {
      product.value = data.value as ProductWithDetails
      currentImage.value = images.value[0] || '/placeholder-product.png'

      // Auto-select first available variant if only one option
      if (availableVariants.value.length === 1) {
        selectedVariant.value = availableVariants.value[0]
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load product'
    console.error('Error loading product:', err)
  } finally {
    loading.value = false
  }
}

const selectVariant = (variant: MerchandiseVariant) => {
  selectedVariant.value = variant
  addToCartError.value = null
}

const isVariantAvailable = (variant: MerchandiseVariant): boolean => {
  return getAvailableStock(variant) > 0
}

const getAvailableStock = (variant: MerchandiseVariant): number => {
  if (!variant.inventory) return 0
  return variant.inventory.quantity_on_hand - variant.inventory.quantity_reserved
}

const getVariantPrice = (variant: MerchandiseVariant): number => {
  if (!product.value) return 0
  return product.value.base_price_in_cents + variant.price_adjustment_in_cents
}

const addToCart = () => {
  if (!product.value || !selectedVariant.value) {
    addToCartError.value = 'Please select a variant'
    return
  }

  addToCartError.value = null
  addToCartSuccess.value = false

  const availableStock = getAvailableStock(selectedVariant.value)

  if (quantity.value > availableStock) {
    addToCartError.value = `Only ${availableStock} items available`
    return
  }

  cartStore.addItem({
    variant_id: selectedVariant.value.id,
    product_id: product.value.id,
    product_name: product.value.name,
    variant_size: selectedVariant.value.size,
    variant_color: selectedVariant.value.color,
    quantity: quantity.value,
    unit_price_in_cents: getVariantPrice(selectedVariant.value),
    image_url: product.value.image_url,
    max_quantity: availableStock
  })

  addToCartSuccess.value = true

  // Reset quantity
  quantity.value = 1

  // Hide success message after 3 seconds
  setTimeout(() => {
    addToCartSuccess.value = false
  }, 3000)
}

const buyNow = () => {
  addToCart()

  if (!addToCartError.value) {
    navigateTo('/merchandise/checkout')
  }
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
  loadProduct()
})
</script>
