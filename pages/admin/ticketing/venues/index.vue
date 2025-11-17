<script setup lang="ts">
import type { Venue } from '~/types'

definePageMeta({
  middleware: 'admin'
})

const { listVenues, deleteVenue } = useVenues()
const router = useRouter()

const venues = ref<Venue[]>([])
const loading = ref(true)
const deleteDialogVisible = ref(false)
const venueToDelete = ref<Venue | null>(null)
const deleting = ref(false)

// Load venues on mount
onMounted(async () => {
  await loadVenues()
})

const loadVenues = async () => {
  loading.value = true
  try {
    venues.value = await listVenues()
  } catch (error) {
    console.error('Failed to load venues:', error)
  } finally {
    loading.value = false
  }
}

const confirmDelete = (venue: Venue) => {
  venueToDelete.value = venue
  deleteDialogVisible.value = true
}

const handleDelete = async () => {
  if (!venueToDelete.value) return

  deleting.value = true
  try {
    await deleteVenue(venueToDelete.value.id)
    await loadVenues()
    deleteDialogVisible.value = false
  } catch (error) {
    // Error already shown by composable
    console.error('Delete failed:', error)
  } finally {
    deleting.value = false
    venueToDelete.value = null
  }
}

const getSectionCount = (venue: Venue): number => {
  return venue.venue_sections?.length || 0
}

const getPriceZoneCount = (venue: Venue): number => {
  return venue.price_zones?.length || 0
}
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Venues</h1>
        <p class="text-gray-600 mt-1">Manage venues for recital ticketing</p>
      </div>
      <Button
        label="Create Venue"
        icon="pi pi-plus"
        @click="router.push('/admin/ticketing/venues/create')"
      />
    </div>

    <Card>
      <template #content>
        <DataTable
          :value="venues"
          :loading="loading"
          stripedRows
          class="p-datatable-sm"
          :paginator="venues.length > 10"
          :rows="10"
          :rowsPerPageOptions="[10, 20, 50]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        >
          <template #empty>
            <div class="text-center py-8">
              <i class="pi pi-map-marker text-4xl text-gray-400 mb-3"></i>
              <p class="text-gray-600 mb-4">No venues found</p>
              <Button
                label="Create Your First Venue"
                icon="pi pi-plus"
                @click="router.push('/admin/ticketing/venues/create')"
                severity="secondary"
              />
            </div>
          </template>

          <Column field="name" header="Name" sortable>
            <template #body="{ data }">
              <span class="font-semibold">{{ data.name }}</span>
            </template>
          </Column>

          <Column field="address" header="Address">
            <template #body="{ data }">
              <div v-if="data.address || data.city">
                <div v-if="data.address">{{ data.address }}</div>
                <div v-if="data.city" class="text-sm text-gray-600">
                  {{ data.city }}<template v-if="data.state">, {{ data.state }}</template>
                  <template v-if="data.zip_code"> {{ data.zip_code }}</template>
                </div>
              </div>
              <span v-else class="text-gray-400">—</span>
            </template>
          </Column>

          <Column field="capacity" header="Capacity" sortable>
            <template #body="{ data }">
              <span v-if="data.capacity">{{ data.capacity }}</span>
              <span v-else class="text-gray-400">—</span>
            </template>
          </Column>

          <Column header="Sections">
            <template #body="{ data }">
              <Tag v-if="getSectionCount(data) > 0" :value="getSectionCount(data)" severity="info" />
              <span v-else class="text-gray-400">0</span>
            </template>
          </Column>

          <Column header="Price Zones">
            <template #body="{ data }">
              <Tag v-if="getPriceZoneCount(data) > 0" :value="getPriceZoneCount(data)" severity="success" />
              <span v-else class="text-gray-400">0</span>
            </template>
          </Column>

          <Column header="Actions" style="width: 120px">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  rounded
                  aria-label="Edit"
                  @click="router.push(`/admin/ticketing/venues/${data.id}/edit`)"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  aria-label="Delete"
                  @click="confirmDelete(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="deleteDialogVisible"
      header="Confirm Delete"
      :modal="true"
      class="w-full max-w-md"
    >
      <div class="flex items-start gap-3">
        <i class="pi pi-exclamation-triangle text-2xl text-orange-500"></i>
        <div>
          <p class="mb-2">Are you sure you want to delete <strong>{{ venueToDelete?.name }}</strong>?</p>
          <p class="text-sm text-gray-600">This action cannot be undone. The venue can only be deleted if it has no associated shows or seats.</p>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="deleteDialogVisible = false"
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
