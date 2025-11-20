<script setup lang="ts">
import type { UpsellItem } from '~/types/ticketing'

interface Props {
  showId: string
}

interface SelectedUpsell {
  upsell_item_id: string
  variant_id?: string
  quantity: number
  customization_text?: string
  delivery_recipient_name?: string
  delivery_notes?: string
  shipping_address?: {
    line1: string
    line2?: string
    city: string
    state: string
    zip: string
  }
  // Display info (not sent to API)
  _product?: UpsellItem
  _variantName?: string
  _unitPrice?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:total': [totalInCents: number]
  'update:items': [items: SelectedUpsell[]]
}>()

// State
const availableProducts = ref<UpsellItem[]>([])
const selectedUpsells = ref<SelectedUpsell[]>([])
const loading = ref(true)
const showModal = ref(false)
const selectedProduct = ref<UpsellItem | null>(null)

// Fetch available upsell products for this show
const fetchProducts = async () => {
  loading.value = true
  try {
    const { items } = await $fetch<{ success: boolean; items: UpsellItem[] }>(
      '/api/upsell-items',
      {
        query: {
          show_id: props.showId,
          is_active: 'true'
        }
      }
    )

    availableProducts.value = items || []
  } catch (error) {
    console.error('Error fetching upsell products:', error)
    availableProducts.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchProducts()
})

// Handle product selection
const selectProduct = (product: UpsellItem) => {
  selectedProduct.value = product
  showModal.value = true
}

// Handle adding product to cart
const addToCart = (item: any) => {
  const product = selectedProduct.value
  if (!product) return

  // Calculate unit price
  let unitPrice = product.price_in_cents
  let variantName: string | undefined

  if (item.variant_id) {
    const variant = product.upsell_item_variants?.find(v => v.id === item.variant_id)
    if (variant) {
      variantName = variant.variant_name
      if (variant.price_override_in_cents !== null) {
        unitPrice = variant.price_override_in_cents
      }
    }
  }

  // Add to selected upsells
  const upsell: SelectedUpsell = {
    ...item,
    _product: product,
    _variantName: variantName,
    _unitPrice: unitPrice
  }

  selectedUpsells.value.push(upsell)
  updateParent()
}

// Remove from cart
const removeFromCart = (index: number) => {
  selectedUpsells.value.splice(index, 1)
  updateParent()
}

// Calculate total
const totalAmount = computed(() => {
  return selectedUpsells.value.reduce((sum, item) => {
    const unitPrice = item._unitPrice || item._product?.price_in_cents || 0
    return sum + (unitPrice * item.quantity)
  }, 0)
})

// Update parent component
const updateParent = () => {
  emit('update:total', totalAmount.value)
  emit('update:items', selectedUpsells.value)
}

// Watch for changes
watch(totalAmount, () => {
  updateParent()
})

const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2)
}

const getItemDescription = (item: SelectedUpsell) => {
  const parts: string[] = []

  if (item._variantName) {
    parts.push(item._variantName)
  }

  if (item.quantity > 1) {
    parts.push(`Qty: ${item.quantity}`)
  }

  if (item.customization_text) {
    parts.push(`"${item.customization_text}"`)
  }

  if (item.delivery_recipient_name) {
    parts.push(`For: ${item.delivery_recipient_name}`)
  }

  if (item.shipping_address) {
    parts.push('Ship to me')
  }

  return parts.join(' • ')
}
</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-shopping-bag text-primary-600"></i>
        <span>Add More to Your Order</span>
      </div>
    </template>

    <template #subtitle>
      <p class="text-sm text-gray-600">
        Enhance your recital experience with DVDs, digital downloads, flowers, and more!
      </p>
    </template>

    <template #content>
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-8">
        <ProgressSpinner style="width: 50px; height: 50px" />
      </div>

      <!-- No Products -->
      <div v-else-if="availableProducts.length === 0" class="text-center py-8 text-gray-500">
        <i class="pi pi-info-circle text-3xl mb-2 block"></i>
        <p>No additional products available for this show</p>
      </div>

      <!-- Products List -->
      <div v-else class="space-y-6">
        <!-- Selected Items Summary -->
        <div v-if="selectedUpsells.length > 0" class="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 class="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <i class="pi pi-check-circle"></i>
            Added to Order ({{ selectedUpsells.length }})
          </h4>

          <div class="space-y-2">
            <div
              v-for="(item, index) in selectedUpsells"
              :key="index"
              class="flex items-center justify-between bg-white rounded p-3"
            >
              <div class="flex-1">
                <div class="font-medium text-gray-900">
                  {{ item._product?.name }}
                </div>
                <div class="text-sm text-gray-600">
                  {{ getItemDescription(item) }}
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <div class="font-semibold text-gray-900">
                    ${{ formatPrice((item._unitPrice || 0) * item.quantity) }}
                  </div>
                  <div class="text-xs text-gray-500">
                    ${{ formatPrice(item._unitPrice || 0) }} × {{ item.quantity }}
                  </div>
                </div>
                <Button
                  icon="pi pi-times"
                  text
                  rounded
                  severity="danger"
                  size="small"
                  @click="removeFromCart(index)"
                  v-tooltip.top="'Remove'"
                />
              </div>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t border-green-300 flex justify-between items-center">
            <span class="font-semibold text-green-900">Upsells Total:</span>
            <span class="text-xl font-bold text-green-900">
              ${{ formatPrice(totalAmount) }}
            </span>
          </div>
        </div>

        <!-- Available Products -->
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Available Products</h4>
          <div class="space-y-3">
            <UpsellProductCard
              v-for="product in availableProducts"
              :key="product.id"
              :product="product"
              @select="selectProduct"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Add Product Modal -->
    <UpsellModal
      v-model:visible="showModal"
      :product="selectedProduct"
      @confirm="addToCart"
    />
  </Card>
</template>
