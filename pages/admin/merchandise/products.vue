<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Merchandise Products</h1>
      <Button
        label="Add Product"
        icon="pi pi-plus"
        @click="showAddDialog = true"
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

    <!-- Products Table -->
    <DataTable
      v-else
      :value="products"
      :paginator="true"
      :rows="20"
      striped-rows
      data-key="id"
    >
      <Column field="name" header="Product Name" sortable />

      <Column field="category" header="Category" sortable>
        <template #body="{ data }">
          <Tag :value="data.category" />
        </template>
      </Column>

      <Column field="base_price_in_cents" header="Price" sortable>
        <template #body="{ data }">
          {{ formatPrice(data.base_price_in_cents) }}
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

      <Column header="Variants">
        <template #body="{ data }">
          <span class="text-sm text-gray-600">
            {{ data.variants?.length || 0 }} variant(s)
          </span>
        </template>
      </Column>

      <Column header="Actions">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              icon="pi pi-eye"
              size="small"
              outlined
              @click="navigateTo(`/merchandise/${data.id}`)"
              v-tooltip.top="'View Product'"
            />
            <Button
              icon="pi pi-pencil"
              size="small"
              severity="info"
              outlined
              @click="editProduct(data)"
              v-tooltip.top="'Edit Product'"
            />
            <Button
              icon="pi pi-trash"
              size="small"
              severity="danger"
              outlined
              @click="confirmDelete(data)"
              v-tooltip.top="'Delete Product'"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Add/Edit Product Dialog -->
    <Dialog
      v-model:visible="showAddDialog"
      header="Add Product"
      :modal="true"
      class="w-full max-w-2xl"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Product Name</label>
          <InputText v-model="productForm.name" class="w-full" />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Description</label>
          <Textarea v-model="productForm.description" rows="3" class="w-full" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Category</label>
            <Dropdown
              v-model="productForm.category"
              :options="categories"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Base Price</label>
            <InputNumber
              v-model="productForm.base_price"
              mode="currency"
              currency="USD"
              :min="0"
              class="w-full"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Image URL</label>
          <InputText v-model="productForm.image_url" class="w-full" />
        </div>

        <div class="flex items-center gap-2">
          <Checkbox v-model="productForm.is_active" binary input-id="active" />
          <label for="active">Active</label>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="showAddDialog = false"
        />
        <Button
          label="Create Product"
          @click="saveProduct"
          :loading="saving"
        />
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="Confirm Delete"
      :modal="true"
      class="w-96"
    >
      <p>Are you sure you want to delete this product?</p>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="showDeleteDialog = false"
        />
        <Button
          label="Delete"
          severity="danger"
          @click="deleteProduct"
          :loading="deleting"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { MerchandiseProduct } from '~/types/merchandise'
import { useToast } from 'primevue/usetoast'

// Page meta
definePageMeta({
  layout: 'default',
  middleware: 'admin' // Only admins can access
})

// State
const products = ref<MerchandiseProduct[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const saving = ref(false)
const deleting = ref(false)
const selectedProduct = ref<MerchandiseProduct | null>(null)

const productForm = ref({
  name: '',
  description: '',
  category: 'apparel',
  base_price: 0,
  image_url: '',
  is_active: true
})

// Services
const { fetchProducts, createProduct, deleteProduct: deleteProductApi } = useMerchandiseService()
const toast = useToast()

// Category options
const categories = [
  { label: 'Apparel', value: 'apparel' },
  { label: 'Accessories', value: 'accessories' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Gifts', value: 'gifts' },
  { label: 'Other', value: 'other' }
]

// Methods
const loadProducts = async () => {
  loading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await fetchProducts({})

    if (fetchError.value) {
      throw new Error(fetchError.value.message)
    }

    if (data.value) {
      products.value = data.value.products
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load products'
    console.error('Error loading products:', err)
  } finally {
    loading.value = false
  }
}

const saveProduct = async () => {
  saving.value = true

  try {
    const { data, error: createError } = await createProduct({
      name: productForm.value.name,
      description: productForm.value.description,
      category: productForm.value.category as any,
      base_price_in_cents: Math.round(productForm.value.base_price * 100),
      image_url: productForm.value.image_url,
      is_active: productForm.value.is_active
    })

    if (createError.value) {
      throw new Error(createError.value.message)
    }

    toast.add({
      severity: 'success',
      summary: 'Product Created',
      detail: 'Product has been created successfully',
      life: 3000
    })

    showAddDialog.value = false
    resetForm()
    loadProducts()
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to create product',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}

const editProduct = (product: MerchandiseProduct) => {
  // TODO: Implement edit functionality
  toast.add({
    severity: 'info',
    summary: 'Edit Product',
    detail: 'Edit functionality coming soon',
    life: 3000
  })
}

const confirmDelete = (product: MerchandiseProduct) => {
  selectedProduct.value = product
  showDeleteDialog.value = true
}

const deleteProduct = async () => {
  if (!selectedProduct.value) return

  deleting.value = true

  try {
    const { error: deleteError } = await deleteProductApi(selectedProduct.value.id)

    if (deleteError.value) {
      throw new Error(deleteError.value.message)
    }

    toast.add({
      severity: 'success',
      summary: 'Product Deleted',
      detail: 'Product has been deleted successfully',
      life: 3000
    })

    showDeleteDialog.value = false
    selectedProduct.value = null
    loadProducts()
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to delete product',
      life: 5000
    })
  } finally {
    deleting.value = false
  }
}

const resetForm = () => {
  productForm.value = {
    name: '',
    description: '',
    category: 'apparel',
    base_price: 0,
    image_url: '',
    is_active: true
  }
}

const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`
}

// Lifecycle
onMounted(() => {
  loadProducts()
})
</script>
