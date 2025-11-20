<script setup lang="ts">
import type { UpsellItem, UpsellItemVariant } from '~/types/ticketing'

interface Props {
  visible: boolean
  product: UpsellItem | null
}

interface CartItem {
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
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [item: CartItem]
}>()

const selectedVariant = ref<UpsellItemVariant | null>(null)
const quantity = ref(1)
const customization = ref('')
const recipientName = ref('')
const deliveryNotes = ref('')
const needsShipping = ref(false)
const shippingAddress = ref({
  line1: '',
  line2: '',
  city: '',
  state: '',
  zip: ''
})

// Reset form when modal opens/closes
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

const resetForm = () => {
  selectedVariant.value = null
  quantity.value = 1
  customization.value = ''
  recipientName.value = ''
  deliveryNotes.value = ''
  needsShipping.value = false
  shippingAddress.value = {
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: ''
  }
}

const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2)
}

const unitPrice = computed(() => {
  if (!props.product) return 0

  if (selectedVariant.value && selectedVariant.value.price_override_in_cents !== null) {
    return selectedVariant.value.price_override_in_cents
  }

  return props.product.price_in_cents
})

const totalPrice = computed(() => {
  return (unitPrice.value * quantity.value) / 100
})

const maxQuantity = computed(() => {
  if (!props.product) return 10

  // Check variant inventory
  if (selectedVariant.value && selectedVariant.value.inventory_quantity !== null) {
    return Math.min(
      selectedVariant.value.inventory_quantity,
      props.product.max_quantity_per_order
    )
  }

  // Check item inventory
  if (props.product.inventory_quantity !== null) {
    return Math.min(
      props.product.inventory_quantity,
      props.product.max_quantity_per_order
    )
  }

  return props.product.max_quantity_per_order
})

const hasVariants = computed(() => {
  return props.product?.upsell_item_variants && props.product.upsell_item_variants.length > 0
})

const needsCustomization = computed(() => {
  return props.product?.item_type === 'merchandise'
})

const needsDeliveryInfo = computed(() => {
  return props.product?.item_type === 'flowers'
})

const canShip = computed(() => {
  return props.product?.item_type === 'dvd' || props.product?.item_type === 'merchandise'
})

const isValid = computed(() => {
  if (!props.product) return false

  // Variant required if product has variants
  if (hasVariants.value && !selectedVariant.value) {
    return false
  }

  // Delivery recipient required for flowers
  if (needsDeliveryInfo.value && !recipientName.value.trim()) {
    return false
  }

  // Shipping address required if shipping is selected
  if (needsShipping.value) {
    if (!shippingAddress.value.line1.trim() ||
        !shippingAddress.value.city.trim() ||
        !shippingAddress.value.state.trim() ||
        !shippingAddress.value.zip.trim()) {
      return false
    }
  }

  return quantity.value > 0 && quantity.value <= maxQuantity.value
})

const selectVariant = (variant: UpsellItemVariant) => {
  selectedVariant.value = variant
}

const confirm = () => {
  if (!props.product || !isValid.value) return

  const item: CartItem = {
    upsell_item_id: props.product.id,
    variant_id: selectedVariant.value?.id,
    quantity: quantity.value
  }

  if (needsCustomization.value && customization.value.trim()) {
    item.customization_text = customization.value.trim()
  }

  if (needsDeliveryInfo.value) {
    item.delivery_recipient_name = recipientName.value.trim()
    if (deliveryNotes.value.trim()) {
      item.delivery_notes = deliveryNotes.value.trim()
    }
  }

  if (needsShipping.value && shippingAddress.value.line1.trim()) {
    item.shipping_address = {
      line1: shippingAddress.value.line1.trim(),
      line2: shippingAddress.value.line2?.trim(),
      city: shippingAddress.value.city.trim(),
      state: shippingAddress.value.state.trim(),
      zip: shippingAddress.value.zip.trim()
    }
  }

  emit('confirm', item)
  close()
}

const close = () => {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    :header="product?.name || 'Add to Order'"
    :modal="true"
    class="w-full max-w-2xl"
  >
    <div v-if="product" class="space-y-6">
      <!-- Product Info -->
      <div class="flex gap-4 pb-4 border-b">
        <div
          v-if="product.image_url"
          class="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
        >
          <img
            :src="product.image_url"
            :alt="product.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-lg">{{ product.name }}</h3>
          <p v-if="product.description" class="text-gray-600 text-sm mt-1">
            {{ product.description }}
          </p>
          <p class="text-primary-600 font-bold text-xl mt-2">
            ${{ formatPrice(product.price_in_cents) }}
          </p>
        </div>
      </div>

      <!-- Variants Selection -->
      <div v-if="hasVariants">
        <label class="block font-medium mb-3">
          Select Option <span class="text-red-500">*</span>
        </label>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            v-for="variant in product.upsell_item_variants"
            :key="variant.id"
            type="button"
            @click="selectVariant(variant)"
            :disabled="!variant.is_available || (variant.inventory_quantity !== null && variant.inventory_quantity === 0)"
            :class="[
              'p-3 border-2 rounded-lg transition-all text-left',
              selectedVariant?.id === variant.id
                ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600'
                : 'border-gray-200 hover:border-gray-300',
              !variant.is_available || (variant.inventory_quantity !== null && variant.inventory_quantity === 0)
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            ]"
          >
            <div class="font-medium">{{ variant.variant_name }}</div>
            <div v-if="variant.price_override_in_cents" class="text-sm text-primary-600 font-semibold mt-1">
              ${{ formatPrice(variant.price_override_in_cents) }}
            </div>
            <div v-if="variant.inventory_quantity !== null && variant.inventory_quantity <= 5" class="text-xs text-orange-600 mt-1">
              Only {{ variant.inventory_quantity }} left
            </div>
          </button>
        </div>
      </div>

      <!-- Quantity -->
      <div>
        <label class="block font-medium mb-2">
          Quantity
        </label>
        <InputNumber
          v-model="quantity"
          :min="1"
          :max="maxQuantity"
          showButtons
          buttonLayout="horizontal"
          :step="1"
          class="w-full"
        >
          <template #incrementbuttonicon>
            <span class="pi pi-plus" />
          </template>
          <template #decrementbuttonicon>
            <span class="pi pi-minus" />
          </template>
        </InputNumber>
        <small class="text-gray-600 mt-1 block">
          Maximum {{ maxQuantity }} per order
        </small>
      </div>

      <!-- Customization (for merchandise) -->
      <div v-if="needsCustomization">
        <label class="block font-medium mb-2">
          Personalization (Optional)
        </label>
        <InputText
          v-model="customization"
          placeholder="e.g., Student's name for back of shirt"
          class="w-full"
          maxlength="50"
        />
        <small class="text-gray-600 mt-1 block">
          Add a student's name or custom text (max 50 characters)
        </small>
      </div>

      <!-- Delivery Info (for flowers) -->
      <div v-if="needsDeliveryInfo" class="space-y-4">
        <div>
          <label class="block font-medium mb-2">
            Recipient Name <span class="text-red-500">*</span>
          </label>
          <InputText
            v-model="recipientName"
            placeholder="e.g., Emily Smith"
            class="w-full"
          />
          <small class="text-gray-600 mt-1 block">
            Who should receive these flowers?
          </small>
        </div>

        <div>
          <label class="block font-medium mb-2">
            Delivery Instructions (Optional)
          </label>
          <Textarea
            v-model="deliveryNotes"
            rows="3"
            placeholder="e.g., Please deliver during intermission"
            class="w-full"
          />
          <small class="text-gray-600 mt-1 block">
            Special delivery instructions or timing preferences
          </small>
        </div>
      </div>

      <!-- Shipping Option (for DVDs and Merchandise) -->
      <div v-if="canShip" class="space-y-4">
        <div class="flex items-center gap-3">
          <Checkbox
            v-model="needsShipping"
            inputId="needsShipping"
            :binary="true"
          />
          <label for="needsShipping" class="cursor-pointer font-medium">
            Ship to me (otherwise pickup at studio)
          </label>
        </div>

        <div v-if="needsShipping" class="space-y-3 pl-8">
          <div>
            <label class="block text-sm font-medium mb-1">
              Address <span class="text-red-500">*</span>
            </label>
            <InputText
              v-model="shippingAddress.line1"
              placeholder="Street address"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">
              Address Line 2
            </label>
            <InputText
              v-model="shippingAddress.line2"
              placeholder="Apt, suite, etc. (optional)"
              class="w-full"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1">
                City <span class="text-red-500">*</span>
              </label>
              <InputText
                v-model="shippingAddress.city"
                placeholder="City"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">
                State <span class="text-red-500">*</span>
              </label>
              <InputText
                v-model="shippingAddress.state"
                placeholder="State"
                class="w-full"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">
              ZIP Code <span class="text-red-500">*</span>
            </label>
            <InputText
              v-model="shippingAddress.zip"
              placeholder="ZIP"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Total -->
      <div class="border-t pt-4 mt-4">
        <div class="flex justify-between items-center text-lg">
          <span class="font-medium">Total:</span>
          <span class="font-bold text-2xl text-primary-600">
            ${{ totalPrice.toFixed(2) }}
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="close"
        />
        <Button
          label="Add to Order"
          icon="pi pi-plus"
          :disabled="!isValid"
          @click="confirm"
        />
      </div>
    </template>
  </Dialog>
</template>
