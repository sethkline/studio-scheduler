<script setup lang="ts">
import type { UpsellItem } from '~/types/ticketing'

interface Props {
  product: UpsellItem
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [product: UpsellItem]
}>()

const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2)
}

const getProductIcon = (type: string) => {
  const icons: Record<string, string> = {
    dvd: 'pi-circle',
    digital_download: 'pi-download',
    live_stream: 'pi-video',
    flowers: 'pi-heart',
    merchandise: 'pi-shopping-bag'
  }
  return icons[type] || 'pi-gift'
}

const getProductDescription = (type: string) => {
  const descriptions: Record<string, string> = {
    dvd: 'Professional recording on DVD',
    digital_download: 'Instant HD video download',
    live_stream: 'Watch from anywhere, live',
    flowers: 'Delivered during the show',
    merchandise: 'Commemorative keepsake'
  }
  return descriptions[type] || ''
}

const isOutOfStock = computed(() => {
  return props.product.inventory_quantity !== null && props.product.inventory_quantity === 0
})

const stockDisplay = computed(() => {
  if (props.product.inventory_quantity === null) {
    return null // Unlimited
  }
  if (props.product.inventory_quantity <= 5) {
    return `Only ${props.product.inventory_quantity} left!`
  }
  return null
})
</script>

<template>
  <div
    class="border border-gray-200 rounded-lg p-4 hover:border-primary-500 hover:shadow-md transition-all cursor-pointer"
    :class="{ 'opacity-50 cursor-not-allowed': isOutOfStock }"
    @click="!isOutOfStock && emit('select', product)"
  >
    <div class="flex gap-4">
      <!-- Product Image or Icon -->
      <div class="flex-shrink-0">
        <div
          v-if="product.image_url"
          class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100"
        >
          <img
            :src="product.image_url"
            :alt="product.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div
          v-else
          class="w-20 h-20 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center"
        >
          <i :class="['pi', getProductIcon(product.item_type), 'text-3xl text-primary-600']"></i>
        </div>
      </div>

      <!-- Product Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 truncate">
              {{ product.name }}
            </h3>
            <p class="text-sm text-gray-500 mt-0.5">
              {{ product.description || getProductDescription(product.item_type) }}
            </p>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-xl font-bold text-primary-600">
              ${{ formatPrice(product.price_in_cents) }}
            </div>
          </div>
        </div>

        <!-- Variants Badge -->
        <div v-if="product.upsell_item_variants && product.upsell_item_variants.length > 0" class="mt-2">
          <Badge
            :value="`${product.upsell_item_variants.length} options available`"
            severity="info"
            size="small"
          />
        </div>

        <!-- Stock Warning -->
        <div v-if="stockDisplay" class="mt-2">
          <Badge
            :value="stockDisplay"
            severity="warn"
            size="small"
          />
        </div>

        <!-- Out of Stock -->
        <div v-if="isOutOfStock" class="mt-2">
          <Badge
            value="Out of Stock"
            severity="danger"
            size="small"
          />
        </div>

        <!-- Add Button -->
        <div class="mt-3">
          <Button
            :label="isOutOfStock ? 'Out of Stock' : 'Add to Order'"
            icon="pi pi-plus"
            size="small"
            :disabled="isOutOfStock"
            @click.stop="!isOutOfStock && emit('select', product)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
