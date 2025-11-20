<script setup lang="ts">
import type { CreateUpsellItemInput } from '~/types/ticketing'

definePageMeta({
  middleware: 'staff',
  layout: 'default'
})

const router = useRouter()
const toast = useToast()

// Product types
const productTypes = [
  { label: 'DVD', value: 'dvd' },
  { label: 'Digital Download', value: 'digital_download' },
  { label: 'Live Stream', value: 'live_stream' },
  { label: 'Flowers', value: 'flowers' },
  { label: 'Merchandise', value: 'merchandise' }
]

// Form data
const form = ref<CreateUpsellItemInput>({
  name: '',
  description: '',
  item_type: 'dvd',
  price_in_cents: 0,
  inventory_quantity: undefined,
  max_quantity_per_order: 10,
  image_url: '',
  is_active: true,
  display_order: 0,
  variants: []
})

const priceInDollars = ref(0)

// Watch price in dollars and update cents
watch(priceInDollars, (value) => {
  form.value.price_in_cents = Math.round(value * 100)
})

// Computed flags
const needsInventory = computed(() => {
  return ['dvd', 'merchandise', 'flowers'].includes(form.value.item_type)
})

const canHaveVariants = computed(() => {
  return ['merchandise', 'flowers'].includes(form.value.item_type)
})

// Variant management
const addVariant = () => {
  if (!form.value.variants) {
    form.value.variants = []
  }

  form.value.variants.push({
    variant_name: '',
    variant_type: 'size',
    inventory_quantity: undefined,
    display_order: form.value.variants.length
  })
}

const removeVariant = (index: number) => {
  form.value.variants?.splice(index, 1)
}

const variantPriceInDollars = ref<Record<number, number>>({})

watch(() => variantPriceInDollars.value, (values) => {
  Object.entries(values).forEach(([index, value]) => {
    if (form.value.variants && form.value.variants[Number(index)]) {
      form.value.variants[Number(index)].price_override_in_cents = value > 0 ? Math.round(value * 100) : undefined
    }
  })
}, { deep: true })

// Submit
const submitting = ref(false)

const submit = async () => {
  // Validate
  if (!form.value.name || !form.value.item_type) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all required fields',
      life: 5000
    })
    return
  }

  if (form.value.price_in_cents <= 0) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Price must be greater than $0',
      life: 5000
    })
    return
  }

  submitting.value = true

  try {
    const { item } = await $fetch('/api/upsell-items', {
      method: 'POST',
      body: form.value
    })

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Product created successfully',
      life: 3000
    })

    router.push('/admin/upsell-products')
  } catch (error: any) {
    console.error('Error creating product:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.data?.message || 'Failed to create product',
      life: 5000
    })
  } finally {
    submitting.value = false
  }
}

const cancel = () => {
  router.back()
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Create Upsell Product</h1>
      <p class="text-gray-600 mt-1">
        Add a new product to sell alongside recital tickets
      </p>
    </div>

    <Card>
      <template #content>
        <div class="space-y-6">
          <!-- Product Type -->
          <div>
            <label class="block font-medium mb-2">
              Product Type <span class="text-red-500">*</span>
            </label>
            <Dropdown
              v-model="form.item_type"
              :options="productTypes"
              optionLabel="label"
              optionValue="value"
              placeholder="Select product type"
              class="w-full"
            />
            <small class="text-gray-600 mt-1 block">
              Choose the type of product you're selling
            </small>
          </div>

          <!-- Name -->
          <div>
            <label class="block font-medium mb-2">
              Product Name <span class="text-red-500">*</span>
            </label>
            <InputText
              v-model="form.name"
              placeholder="e.g., Professional DVD Recording"
              class="w-full"
            />
            <small class="text-gray-600 mt-1 block">
              This will be displayed to customers during checkout
            </small>
          </div>

          <!-- Description -->
          <div>
            <label class="block font-medium mb-2">Description</label>
            <Textarea
              v-model="form.description"
              rows="4"
              placeholder="Describe what's included with this product..."
              class="w-full"
            />
            <small class="text-gray-600 mt-1 block">
              Help customers understand what they're purchasing
            </small>
          </div>

          <!-- Price -->
          <div>
            <label class="block font-medium mb-2">
              Price <span class="text-red-500">*</span>
            </label>
            <InputNumber
              v-model="priceInDollars"
              mode="currency"
              currency="USD"
              :minFractionDigits="2"
              :min="0"
              :step="0.01"
              placeholder="0.00"
              class="w-full"
            />
            <small class="text-gray-600 mt-1 block">
              Base price for this product
            </small>
          </div>

          <!-- Inventory (conditional) -->
          <div v-if="needsInventory">
            <label class="block font-medium mb-2">
              Initial Inventory
            </label>
            <InputNumber
              v-model="form.inventory_quantity"
              :min="0"
              placeholder="Leave blank for unlimited"
              class="w-full"
              :useGrouping="false"
            />
            <small class="text-gray-600 mt-1 block">
              {{ form.item_type === 'merchandise'
                ? 'How many items do you have in stock? Leave blank for unlimited.'
                : 'Maximum number of orders you can fulfill. Leave blank for unlimited.' }}
            </small>
          </div>

          <!-- Max Quantity Per Order -->
          <div>
            <label class="block font-medium mb-2">
              Max Quantity Per Order
            </label>
            <InputNumber
              v-model="form.max_quantity_per_order"
              :min="1"
              :max="100"
              class="w-full"
              :useGrouping="false"
            />
            <small class="text-gray-600 mt-1 block">
              Maximum number a customer can purchase in a single order
            </small>
          </div>

          <!-- Image URL -->
          <div>
            <label class="block font-medium mb-2">Product Image URL</label>
            <InputText
              v-model="form.image_url"
              placeholder="https://example.com/image.jpg"
              class="w-full"
            />
            <small class="text-gray-600 mt-1 block">
              Optional: URL to a product image
            </small>
          </div>

          <!-- Variants Section -->
          <div v-if="canHaveVariants" class="border-t pt-6">
            <div class="flex justify-between items-center mb-4">
              <div>
                <label class="block font-medium">
                  Product Variants (Optional)
                </label>
                <small class="text-gray-600">
                  Add sizes, colors, or other options
                </small>
              </div>
              <Button
                label="Add Variant"
                icon="pi pi-plus"
                size="small"
                outlined
                @click="addVariant"
              />
            </div>

            <div v-if="form.variants && form.variants.length > 0" class="space-y-3">
              <div
                v-for="(variant, index) in form.variants"
                :key="index"
                class="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm mb-1">Variant Name</label>
                    <InputText
                      v-model="variant.variant_name"
                      placeholder="e.g., Small, Red, Youth M"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm mb-1">Type</label>
                    <Dropdown
                      v-model="variant.variant_type"
                      :options="[
                        { label: 'Size', value: 'size' },
                        { label: 'Color', value: 'color' },
                        { label: 'Style', value: 'style' }
                      ]"
                      optionLabel="label"
                      optionValue="value"
                      class="w-full"
                    />
                  </div>
                  <div v-if="needsInventory">
                    <label class="block text-sm mb-1">Stock</label>
                    <InputNumber
                      v-model="variant.inventory_quantity"
                      :min="0"
                      placeholder="Stock"
                      class="w-full"
                      :useGrouping="false"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label class="block text-sm mb-1">Price Override ($)</label>
                    <InputNumber
                      v-model="variantPriceInDollars[index]"
                      mode="currency"
                      currency="USD"
                      :minFractionDigits="2"
                      placeholder="Leave blank to use base price"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm mb-1">SKU (Optional)</label>
                    <InputText
                      v-model="variant.sku"
                      placeholder="Product code"
                      class="w-full"
                    />
                  </div>
                </div>

                <Button
                  icon="pi pi-trash"
                  label="Remove"
                  text
                  severity="danger"
                  size="small"
                  class="mt-3"
                  @click="removeVariant(index)"
                />
              </div>
            </div>

            <div v-else class="text-center py-6 text-gray-500 border border-dashed border-gray-300 rounded-lg">
              <p class="text-sm">No variants added yet</p>
              <Button
                label="Add First Variant"
                icon="pi pi-plus"
                size="small"
                text
                class="mt-2"
                @click="addVariant"
              />
            </div>
          </div>

          <!-- Advanced Options -->
          <div class="border-t pt-6">
            <h3 class="font-medium mb-4">Advanced Options</h3>

            <div class="space-y-4">
              <div>
                <label class="block font-medium mb-2">Display Order</label>
                <InputNumber
                  v-model="form.display_order"
                  :min="0"
                  class="w-full"
                  :useGrouping="false"
                />
                <small class="text-gray-600 mt-1 block">
                  Products with lower numbers appear first (0 = first)
                </small>
              </div>

              <div class="flex items-center gap-3">
                <Checkbox
                  v-model="form.is_active"
                  inputId="is_active"
                  :binary="true"
                />
                <label for="is_active" class="cursor-pointer">
                  Active (customers can purchase this product)
                </label>
              </div>
            </div>
          </div>

          <!-- Submit Buttons -->
          <div class="flex gap-2 justify-end pt-6 border-t">
            <Button
              label="Cancel"
              severity="secondary"
              outlined
              @click="cancel"
              :disabled="submitting"
            />
            <Button
              label="Create Product"
              icon="pi pi-check"
              @click="submit"
              :loading="submitting"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
