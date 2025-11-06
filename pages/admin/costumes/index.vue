<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Costume Inventory</h1>
      <Button label="Add Costume" icon="pi pi-plus" @click="showAddDialog = true" />
    </div>

    <!-- Costumes Table -->
    <DataTable :value="costumes" :loading="loading" stripedRows>
      <Column field="name" header="Name" sortable></Column>
      <Column field="costume_type" header="Type" sortable></Column>
      <Column field="sizes_available" header="Sizes Available">
        <template #body="slotProps">
          {{ slotProps.data.sizes_available?.join(', ') || 'N/A' }}
        </template>
      </Column>
      <Column field="quantity_in_stock" header="Quantity" sortable></Column>
      <Column field="rental_price_cents" header="Rental Price">
        <template #body="slotProps">
          {{ formatPrice(slotProps.data.rental_price_cents) }}
        </template>
      </Column>
      <Column field="status" header="Status" sortable>
        <template #body="slotProps">
          <Tag :value="slotProps.data.status" :severity="getStatusSeverity(slotProps.data.status)" />
        </template>
      </Column>
      <Column header="Actions">
        <template #body="slotProps">
          <Button icon="pi pi-pencil" text rounded @click="editCostume(slotProps.data)" />
        </template>
      </Column>
    </DataTable>

    <!-- Add/Edit Dialog -->
    <Dialog v-model:visible="showAddDialog" :header="editingCostume ? 'Edit Costume' : 'Add Costume'" :modal="true" :style="{ width: '500px' }">
      <div class="space-y-4">
        <div>
          <label class="block mb-2">Name *</label>
          <InputText v-model="formData.name" class="w-full" placeholder="Costume name" />
        </div>

        <div>
          <label class="block mb-2">Type</label>
          <Select v-model="formData.costume_type" :options="costumeTypes" class="w-full" placeholder="Select type" />
        </div>

        <div>
          <label class="block mb-2">Description</label>
          <Textarea v-model="formData.description" rows="3" class="w-full" />
        </div>

        <div>
          <label class="block mb-2">Sizes Available</label>
          <MultiSelect v-model="formData.sizes_available" :options="sizeOptions" class="w-full" placeholder="Select sizes" />
        </div>

        <div>
          <label class="block mb-2">Quantity in Stock *</label>
          <InputNumber v-model="formData.quantity_in_stock" :min="0" class="w-full" />
        </div>

        <div>
          <label class="block mb-2">Rental Price (cents)</label>
          <InputNumber v-model="formData.rental_price_cents" :min="0" class="w-full" prefix="$" :minFractionDigits="2" :maxFractionDigits="2" mode="currency" currency="USD" />
        </div>

        <div>
          <label class="block mb-2">Notes</label>
          <Textarea v-model="formData.notes" rows="2" class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="cancelDialog" />
        <Button label="Save" icon="pi pi-check" @click="saveCostume" :loading="saving" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { Costume, CreateCostumeForm } from '~/types/costumes'

definePageMeta({
  middleware: 'staff',
})

const toast = useToast()

const costumes = ref<Costume[]>([])
const loading = ref(false)
const saving = ref(false)
const showAddDialog = ref(false)
const editingCostume = ref<Costume | null>(null)

const formData = ref<CreateCostumeForm>({
  name: '',
  description: '',
  costume_type: undefined,
  sizes_available: [],
  quantity_in_stock: 0,
  rental_price_cents: undefined,
  notes: '',
})

const costumeTypes = ['dress', 'outfit', 'shoes', 'accessory', 'headpiece']
const sizeOptions = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

onMounted(() => {
  fetchCostumes()
})

async function fetchCostumes() {
  loading.value = true
  try {
    const { data } = await useFetch<Costume[]>('/api/costumes')
    if (data.value) {
      costumes.value = data.value
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load costumes', life: 3000 })
  } finally {
    loading.value = false
  }
}

function editCostume(costume: Costume) {
  editingCostume.value = costume
  formData.value = {
    name: costume.name,
    description: costume.description,
    costume_type: costume.costume_type,
    sizes_available: costume.sizes_available || [],
    quantity_in_stock: costume.quantity_in_stock,
    rental_price_cents: costume.rental_price_cents,
    notes: costume.notes,
  }
  showAddDialog.value = true
}

async function saveCostume() {
  if (!formData.value.name || formData.value.quantity_in_stock === undefined) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Name and quantity are required', life: 3000 })
    return
  }

  saving.value = true
  try {
    if (editingCostume.value) {
      await $fetch(`/api/costumes/${editingCostume.value.id}`, {
        method: 'PUT',
        body: formData.value,
      })
      toast.add({ severity: 'success', summary: 'Success', detail: 'Costume updated', life: 3000 })
    } else {
      await $fetch('/api/costumes', {
        method: 'POST',
        body: formData.value,
      })
      toast.add({ severity: 'success', summary: 'Success', detail: 'Costume added', life: 3000 })
    }
    await fetchCostumes()
    cancelDialog()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save costume', life: 3000 })
  } finally {
    saving.value = false
  }
}

function cancelDialog() {
  showAddDialog.value = false
  editingCostume.value = null
  formData.value = {
    name: '',
    description: '',
    costume_type: undefined,
    sizes_available: [],
    quantity_in_stock: 0,
    rental_price_cents: undefined,
    notes: '',
  }
}

function formatPrice(cents?: number): string {
  if (!cents) return 'N/A'
  return `$${(cents / 100).toFixed(2)}`
}

function getStatusSeverity(status: string): string {
  const severities: Record<string, string> = {
    active: 'success',
    inactive: 'warning',
    retired: 'danger',
  }
  return severities[status] || 'info'
}
</script>
