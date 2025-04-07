<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold text-primary-800">Recital Management</h1>
      <Button 
        label="Create New Recital" 
        icon="pi pi-plus" 
        @click="openNewRecitalDialog" 
        v-if="authStore.hasRole(['admin', 'staff'])"
      />
    </div>

    <DataTable 
      :value="recitals" 
      :paginator="true" 
      :rows="10"
      :loading="loading"
      stripedRows
      responsiveLayout="scroll"
      class="p-datatable-sm"
      sortField="date"
      :sortOrder="-1"
    >
      <Column field="name" header="Name" sortable>
        <template #body="{ data }">
          <NuxtLink :to="`/recitals/${data.id}`" class="text-primary-600 hover:text-primary-800 font-medium">
            {{ data.name }}
          </NuxtLink>
        </template>
      </Column>
      <Column field="date" header="Date" sortable>
        <template #body="{ data }">
          {{ formatDate(data.date) }}
        </template>
      </Column>
      <Column field="location" header="Location" sortable />
      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <Tag 
            :value="data.status" 
            :severity="getStatusSeverity(data.status)" 
          />
        </template>
      </Column>
      <Column header="Program Status">
        <template #body="{ data }">
          <div class="flex gap-2 items-center">
            <template v-if="data.has_program">
              <Badge value="✓" severity="success" />
              <span>Program Created</span>
            </template>
            <template v-else>
              <Badge value="!" severity="warning" />
              <span>No Program</span>
            </template>
          </div>
        </template>
      </Column>
      <Column header="Actions" :exportable="false">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button 
              icon="pi pi-pencil" 
              text 
              rounded
              @click="editRecital(data)"
              title="Edit Recital" 
              v-if="authStore.hasRole(['admin', 'staff'])"
            />
            <Button 
              icon="pi pi-file" 
              text 
              rounded
              :disabled="!data.has_program"
              @click="navigateToProgram(data.id)"
              title="Edit Program"
              v-if="authStore.hasRole(['admin', 'staff'])"
            />
            <Button 
              icon="pi pi-trash" 
              text 
              rounded
              severity="danger"
              @click="confirmDeleteRecital(data)"
              title="Delete Recital"
              v-if="authStore.hasRole(['admin'])"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- New/Edit Recital Dialog -->
    <Dialog 
      v-model:visible="recitalDialog.visible" 
      :header="recitalDialog.isNew ? 'Create New Recital' : 'Edit Recital'" 
      modal 
      :style="{ width: '500px' }"
      :dismissableMask="true"
    >
      <div v-if="recitalDialog.visible">
        <RecitalsForm 
          v-model="recitalDialog.data" 
          :loading="recitalDialog.loading"
          @save="saveRecital"
          @cancel="recitalDialog.visible = false"
        />
      </div>
    </Dialog>

    <!-- Confirmation Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { Recital } from '@/types/recitals'

// Composables
const { fetchRecitals, createRecital, updateRecital, deleteRecital } = useApiService()
const authStore = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

// State
const recitals = ref<Recital[]>([])
const loading = ref(true)
const recitalDialog = ref({
  visible: false,
  isNew: true,
  loading: false,
  data: {} as Partial<Recital>
})

// Fetch recitals on component mount
onMounted(async () => {
  await loadRecitals()
})

// Load recitals from API
const loadRecitals = async () => {
  loading.value = true
  try {
    const { data, error } = await fetchRecitals()
    
    if (error.value) {
      throw new Error(error.value.message || 'Failed to load recitals')
    }
    
    recitals.value = data.value?.recitals || []
  } catch (error) {
    console.error('Error loading recitals:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load recitals',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// Format date for display
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

// Map status to severity for PrimeVue Tag component
const getStatusSeverity = (status: string) => {
  const map: Record<string, string> = {
    'planning': 'info',
    'active': 'success',
    'completed': 'success',
    'cancelled': 'danger'
  }
  return map[status] || 'info'
}

// Open dialog to create new recital
const openNewRecitalDialog = () => {
  recitalDialog.value = {
    visible: true,
    isNew: true,
    loading: false,
    data: {
      name: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      status: 'planning',
      description: ''
    }
  }
}

// Open dialog to edit existing recital
const editRecital = (recital: Recital) => {
  recitalDialog.value = {
    visible: true,
    isNew: false,
    loading: false,
    data: { ...recital }
  }
}

// Save new or updated recital
const saveRecital = async () => {
  recitalDialog.value.loading = true
  
  try {
    if (recitalDialog.value.isNew) {
      // Create new recital
      const { data, error } = await createRecital(recitalDialog.value.data)
      
      if (error.value) {
        throw new Error(error.value.message || 'Failed to create recital')
      }
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Recital created successfully',
        life: 3000
      })
    } else {
      // Update existing recital
      const { data, error } = await updateRecital(
        recitalDialog.value.data.id as string,
        recitalDialog.value.data
      )
      
      if (error.value) {
        throw new Error(error.value.message || 'Failed to update recital')
      }
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Recital updated successfully',
        life: 3000
      })
    }
    
    // Close dialog and reload recitals
    recitalDialog.value.visible = false
    await loadRecitals()
  } catch (error) {
    console.error('Error saving recital:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error instanceof Error ? error.message : 'Failed to save recital',
      life: 3000
    })
  } finally {
    recitalDialog.value.loading = false
  }
}

// Navigate to program management page
const navigateToProgram = (recitalId: string) => {
  navigateTo(`/recitals/${recitalId}/program`)
}

// Confirm and delete recital
const confirmDeleteRecital = (recital: Recital) => {
  confirm.require({
    message: `Are you sure you want to delete the recital "${recital.name}"?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const { error } = await deleteRecital(recital.id)
        
        if (error.value) {
          throw new Error(error.value.message || 'Failed to delete recital')
        }
        
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Recital deleted successfully',
          life: 3000
        })
        
        await loadRecitals()
      } catch (error) {
        console.error('Error deleting recital:', error)
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error instanceof Error ? error.message : 'Failed to delete recital',
          life: 3000
        })
      }
    }
  })
}
</script>