<script setup lang="ts">
/**
 * Price Zone Manager Component
 * Allows creating, editing, and deleting price zones for a venue
 */

import type { PriceZone } from '~/types'
import PriceZoneColorPicker from './PriceZoneColorPicker.vue'

interface Props {
  venueId: string
  priceZones: PriceZone[]
}

interface Emits {
  (e: 'refresh'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { createPriceZone, updatePriceZone, deletePriceZone } = useVenues()

// Dialog states
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)

// Form states
const createForm = ref({
  name: '',
  price_in_cents: 0,
  color: null as string | null
})

const editForm = ref<PriceZone | null>(null)
const zoneToDelete = ref<PriceZone | null>(null)

// Loading states
const creating = ref(false)
const updating = ref(false)
const deleting = ref(false)

// Computed price in dollars for display
const createPriceInDollars = computed({
  get: () => createForm.value.price_in_cents / 100,
  set: (value: number) => {
    createForm.value.price_in_cents = Math.round(value * 100)
  }
})

const editPriceInDollars = computed({
  get: () => editForm.value ? editForm.value.price_in_cents / 100 : 0,
  set: (value: number) => {
    if (editForm.value) {
      editForm.value.price_in_cents = Math.round(value * 100)
    }
  }
})

// Format price for display
const formatPrice = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

// Open create dialog
const openCreateDialog = () => {
  createForm.value = {
    name: '',
    price_in_cents: 0,
    color: null
  }
  showCreateDialog.value = true
}

// Handle create price zone
const handleCreate = async () => {
  if (!createForm.value.name.trim() || createForm.value.price_in_cents < 0) {
    return
  }

  creating.value = true
  try {
    await createPriceZone(props.venueId, {
      name: createForm.value.name.trim(),
      price_in_cents: createForm.value.price_in_cents,
      color: createForm.value.color || undefined
    })

    showCreateDialog.value = false
    createForm.value = {
      name: '',
      price_in_cents: 0,
      color: null
    }
    emit('refresh')
  } catch (error) {
    console.error('Failed to create price zone:', error)
  } finally {
    creating.value = false
  }
}

// Open edit dialog
const openEditDialog = (zone: PriceZone) => {
  editForm.value = { ...zone }
  showEditDialog.value = true
}

// Handle update price zone
const handleUpdate = async () => {
  if (!editForm.value || !editForm.value.name.trim() || editForm.value.price_in_cents < 0) {
    return
  }

  updating.value = true
  try {
    await updatePriceZone(props.venueId, editForm.value.id, {
      name: editForm.value.name.trim(),
      price_in_cents: editForm.value.price_in_cents,
      color: editForm.value.color || undefined
    })

    showEditDialog.value = false
    editForm.value = null
    emit('refresh')
  } catch (error) {
    console.error('Failed to update price zone:', error)
  } finally {
    updating.value = false
  }
}

// Open delete confirmation dialog
const openDeleteDialog = (zone: PriceZone) => {
  zoneToDelete.value = zone
  showDeleteDialog.value = true
}

// Handle delete price zone
const handleDelete = async () => {
  if (!zoneToDelete.value) return

  deleting.value = true
  try {
    await deletePriceZone(props.venueId, zoneToDelete.value.id)

    showDeleteDialog.value = false
    zoneToDelete.value = null
    emit('refresh')
  } catch (error) {
    console.error('Failed to delete price zone:', error)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="price-zone-manager">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-900">Price Zones</h3>
      <Button
        label="Add Price Zone"
        icon="pi pi-plus"
        size="small"
        @click="openCreateDialog"
      />
    </div>

    <!-- Price Zones List -->
    <div v-if="priceZones.length > 0" class="space-y-2">
      <Card
        v-for="zone in priceZones"
        :key="zone.id"
        class="p-3"
      >
        <template #content>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 flex-1">
              <!-- Color indicator -->
              <div
                v-if="zone.color"
                :style="{ backgroundColor: zone.color }"
                class="w-8 h-8 rounded-md ring-1 ring-gray-300 flex-shrink-0"
              />
              <div
                v-else
                class="w-8 h-8 rounded-md ring-1 ring-gray-300 flex-shrink-0 bg-gray-100"
              />

              <div class="flex-1">
                <div class="font-medium text-gray-900">{{ zone.name }}</div>
                <div class="text-sm text-gray-500">
                  {{ formatPrice(zone.price_in_cents) }}
                  <span v-if="zone.color" class="ml-2 font-mono text-xs">
                    {{ zone.color }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex gap-2">
              <Button
                icon="pi pi-pencil"
                text
                severity="secondary"
                @click="openEditDialog(zone)"
              />
              <Button
                icon="pi pi-trash"
                text
                severity="danger"
                @click="openDeleteDialog(zone)"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8 text-gray-500">
      <i class="pi pi-tag text-4xl mb-3 block" />
      <p>No price zones yet. Add your first price zone to get started.</p>
    </div>

    <!-- Create Price Zone Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      header="Add Price Zone"
      :modal="true"
      :style="{ width: '550px' }"
    >
      <div class="space-y-4">
        <div class="field">
          <label for="zone-name" class="font-medium text-sm mb-2 block">
            Zone Name <span class="text-red-500">*</span>
          </label>
          <InputText
            id="zone-name"
            v-model="createForm.name"
            class="w-full"
            placeholder="e.g., VIP, General Admission, Student"
            autofocus
          />
        </div>

        <div class="field">
          <label for="zone-price" class="font-medium text-sm mb-2 block">
            Price <span class="text-red-500">*</span>
          </label>
          <InputNumber
            id="zone-price"
            v-model="createPriceInDollars"
            class="w-full"
            mode="currency"
            currency="USD"
            :min="0"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
          />
          <small class="text-gray-500">
            Price per ticket in this zone
          </small>
        </div>

        <div class="field">
          <label class="font-medium text-sm mb-2 block">
            Color (optional)
          </label>
          <PriceZoneColorPicker v-model="createForm.color" />
          <small class="text-gray-500">
            Color for visual identification on seat maps
          </small>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="showCreateDialog = false"
          :disabled="creating"
        />
        <Button
          label="Create"
          @click="handleCreate"
          :loading="creating"
          :disabled="!createForm.name.trim() || createForm.price_in_cents < 0"
        />
      </template>
    </Dialog>

    <!-- Edit Price Zone Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      header="Edit Price Zone"
      :modal="true"
      :style="{ width: '550px' }"
    >
      <div v-if="editForm" class="space-y-4">
        <div class="field">
          <label for="edit-zone-name" class="font-medium text-sm mb-2 block">
            Zone Name <span class="text-red-500">*</span>
          </label>
          <InputText
            id="edit-zone-name"
            v-model="editForm.name"
            class="w-full"
            placeholder="e.g., VIP, General Admission, Student"
          />
        </div>

        <div class="field">
          <label for="edit-zone-price" class="font-medium text-sm mb-2 block">
            Price <span class="text-red-500">*</span>
          </label>
          <InputNumber
            id="edit-zone-price"
            v-model="editPriceInDollars"
            class="w-full"
            mode="currency"
            currency="USD"
            :min="0"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
          />
        </div>

        <div class="field">
          <label class="font-medium text-sm mb-2 block">
            Color (optional)
          </label>
          <PriceZoneColorPicker v-model="editForm.color" />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="showEditDialog = false"
          :disabled="updating"
        />
        <Button
          label="Update"
          @click="handleUpdate"
          :loading="updating"
          :disabled="!editForm?.name.trim() || (editForm?.price_in_cents ?? -1) < 0"
        />
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="Confirm Delete"
      :modal="true"
      :style="{ width: '450px' }"
    >
      <p>
        Are you sure you want to delete the price zone
        <strong>{{ zoneToDelete?.name }}</strong>
        ({{ zoneToDelete ? formatPrice(zoneToDelete.price_in_cents) : '' }})?
      </p>
      <p class="text-sm text-gray-600 mt-2">
        This action cannot be undone. You cannot delete a price zone that is assigned to seats.
      </p>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="showDeleteDialog = false"
          :disabled="deleting"
        />
        <Button
          label="Delete"
          severity="danger"
          @click="handleDelete"
          :loading="deleting"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.price-zone-manager {
  @apply space-y-4;
}
</style>
