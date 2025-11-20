<script setup lang="ts">
import type { UpsellItem } from '~/types/ticketing'

definePageMeta({
  middleware: 'staff',
  layout: 'default'
})

const router = useRouter()
const toast = useToast()

// Fetch upsell items
const { data, pending, error, refresh } = await useFetch<{
  success: boolean
  items: UpsellItem[]
}>('/api/upsell-items', {
  query: {
    is_active: undefined // Get all items
  }
})

const products = computed(() => data.value?.items || [])

// Product type badges
const getProductTypeSeverity = (type: string) => {
  const severityMap: Record<string, any> = {
    dvd: 'info',
    digital_download: 'success',
    live_stream: 'warn',
    flowers: 'help',
    merchandise: 'secondary'
  }
  return severityMap[type] || 'secondary'
}

const getProductTypeLabel = (type: string) => {
  const labelMap: Record<string, string> = {
    dvd: 'DVD',
    digital_download: 'Digital Download',
    live_stream: 'Live Stream',
    flowers: 'Flowers',
    merchandise: 'Merchandise'
  }
  return labelMap[type] || type
}

// Format price
const formatPrice = (cents: number) => {
  return (cents / 100).toFixed(2)
}

// Actions
const createProduct = () => {
  router.push('/admin/upsell-products/create')
}

const editProduct = (id: string) => {
  router.push(`/admin/upsell-products/${id}/edit`)
}

const confirmDelete = ref(false)
const productToDelete = ref<UpsellItem | null>(null)

const deleteProduct = async (product: UpsellItem) => {
  productToDelete.value = product
  confirmDelete.value = true
}

const executeDelete = async () => {
  if (!productToDelete.value) return

  try {
    await $fetch(`/api/upsell-items/${productToDelete.value.id}`, {
      method: 'DELETE'
    })

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Product deleted successfully',
      life: 3000
    })

    await refresh()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.data?.message || 'Failed to delete product',
      life: 5000
    })
  } finally {
    confirmDelete.value = false
    productToDelete.value = null
  }
}

const toggleActive = async (product: UpsellItem) => {
  try {
    await $fetch(`/api/upsell-items/${product.id}`, {
      method: 'PUT',
      body: {
        is_active: !product.is_active
      }
    })

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Product ${product.is_active ? 'deactivated' : 'activated'} successfully`,
      life: 3000
    })

    await refresh()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.data?.message || 'Failed to update product',
      life: 5000
    })
  }
}
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold">Upsell Products</h1>
        <p class="text-gray-600 mt-1">
          Manage DVDs, digital downloads, flowers, and merchandise for recital tickets
        </p>
      </div>
      <Button
        label="Create Product"
        icon="pi pi-plus"
        @click="createProduct"
      />
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center items-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
      <p class="font-semibold">Error loading products</p>
      <p class="text-sm">{{ error.message }}</p>
    </div>

    <!-- Products table -->
    <Card v-else>
      <template #content>
        <DataTable
          :value="products"
          :paginator="products.length > 10"
          :rows="10"
          stripedRows
          class="p-datatable-sm"
        >
          <Column field="name" header="Product Name" sortable>
            <template #body="{ data }">
              <div>
                <div class="font-medium">{{ data.name }}</div>
                <div v-if="data.description" class="text-sm text-gray-500 truncate max-w-md">
                  {{ data.description }}
                </div>
              </div>
            </template>
          </Column>

          <Column field="item_type" header="Type" sortable>
            <template #body="{ data }">
              <Tag
                :value="getProductTypeLabel(data.item_type)"
                :severity="getProductTypeSeverity(data.item_type)"
              />
            </template>
          </Column>

          <Column field="price_in_cents" header="Price" sortable>
            <template #body="{ data }">
              <span class="font-semibold">${{ formatPrice(data.price_in_cents) }}</span>
            </template>
          </Column>

          <Column field="inventory_quantity" header="Stock" sortable>
            <template #body="{ data }">
              <span v-if="data.inventory_quantity !== null">
                {{ data.inventory_quantity }}
                <span v-if="data.inventory_quantity === 0" class="text-red-600 text-sm ml-1">
                  (Out of stock)
                </span>
              </span>
              <span v-else class="text-gray-500 text-sm italic">Unlimited</span>
            </template>
          </Column>

          <Column header="Variants">
            <template #body="{ data }">
              <Badge
                v-if="data.upsell_item_variants && data.upsell_item_variants.length > 0"
                :value="data.upsell_item_variants.length"
                severity="info"
              />
              <span v-else class="text-gray-400 text-sm">—</span>
            </template>
          </Column>

          <Column field="is_active" header="Status" sortable>
            <template #body="{ data }">
              <Tag
                :value="data.is_active ? 'Active' : 'Inactive'"
                :severity="data.is_active ? 'success' : 'danger'"
              />
            </template>
          </Column>

          <Column header="Actions" :frozen="true" alignFrozen="right">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button
                  icon="pi pi-pencil"
                  text
                  size="small"
                  severity="secondary"
                  v-tooltip.top="'Edit'"
                  @click="editProduct(data.id)"
                />
                <Button
                  :icon="data.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                  text
                  size="small"
                  :severity="data.is_active ? 'warn' : 'success'"
                  v-tooltip.top="data.is_active ? 'Deactivate' : 'Activate'"
                  @click="toggleActive(data)"
                />
                <Button
                  icon="pi pi-trash"
                  text
                  size="small"
                  severity="danger"
                  v-tooltip.top="'Delete'"
                  @click="deleteProduct(data)"
                />
              </div>
            </template>
          </Column>

          <template #empty>
            <div class="text-center py-8 text-gray-500">
              <i class="pi pi-shopping-bag text-4xl mb-3 block"></i>
              <p class="text-lg font-medium">No products yet</p>
              <p class="text-sm">Create your first upsell product to get started</p>
              <Button
                label="Create Product"
                icon="pi pi-plus"
                class="mt-4"
                @click="createProduct"
              />
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Delete confirmation dialog -->
    <Dialog
      v-model:visible="confirmDelete"
      header="Confirm Delete"
      :modal="true"
      class="w-full max-w-md"
    >
      <p class="mb-4">
        Are you sure you want to delete <strong>{{ productToDelete?.name }}</strong>?
      </p>
      <p class="text-sm text-gray-600">
        This action cannot be undone. Products with existing orders cannot be deleted.
      </p>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="confirmDelete = false"
        />
        <Button
          label="Delete"
          severity="danger"
          icon="pi pi-trash"
          @click="executeDelete"
        />
      </template>
    </Dialog>
  </div>
</template>
