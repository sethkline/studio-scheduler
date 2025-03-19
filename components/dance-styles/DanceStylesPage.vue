<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Dance Styles</h1>
      <Button label="Add New Style" icon="pi pi-plus" @click="openNewStyleDialog" />
    </div>
    
    <DataTable 
      :value="styles" 
      :loading="loading"
      stripedRows
      :paginator="styles.length > 10"
      :rows="10"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      :rowsPerPageOptions="[10, 20, 50]"
      dataKey="id"
      class="p-datatable-sm">
      
      <Column field="name" header="Style Name" sortable>
        <template #body="{ data }">
          <div class="flex items-center">
            <div :style="`background-color: ${data.color}`" class="w-4 h-4 rounded-full mr-2"></div>
            {{ data.name }}
          </div>
        </template>
      </Column>
      
      <Column field="description" header="Description" class="max-w-md truncate">
        <template #body="{ data }">
          <div class="truncate max-w-md">{{ data.description || 'No description' }}</div>
        </template>
      </Column>
      
      <Column field="color" header="Color">
        <template #body="{ data }">
          <div :style="`background-color: ${data.color}`" class="w-8 h-5 rounded"></div>
        </template>
      </Column>
      
      <Column header="Actions" :exportable="false" style="min-width: 8rem">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" outlined severity="info" @click="editStyle(data)" />
            <Button icon="pi pi-trash" outlined severity="danger" @click="confirmDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>
    
    <!-- Dialog for creating/editing dance styles -->
    <Dialog 
      v-model:visible="styleDialog" 
      :header="editingStyle ? 'Edit Dance Style' : 'New Dance Style'" 
      :style="{ width: '450px' }" 
      modal>
      <div class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium">Style Name*</label>
          <InputText id="name" v-model="style.name" required autofocus class="w-full" />
        </div>
        
        <div>
          <label for="color" class="block text-sm font-medium">Color*</label>
          <ColorPicker v-model="style.color" format="hex" class="w-full" />
        </div>
        
        <div>
          <label for="description" class="block text-sm font-medium">Description</label>
          <Textarea id="description" v-model="style.description" rows="3" class="w-full" />
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-between w-full">
          <Button label="Cancel" icon="pi pi-times" outlined @click="closeDialog" />
          <Button label="Save" icon="pi pi-check" @click="saveStyle" :loading="saving" />
        </div>
      </template>
    </Dialog>
    
    <!-- Delete confirmation dialog -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'dashboard'
})

const toast = useToast()
const confirmDialog = useConfirm()

const styles = ref([])
const loading = ref(true)
const styleDialog = ref(false)
const editingStyle = ref(false)
const saving = ref(false)
const style = ref({
  name: '',
  color: '#FF5722',
  description: ''
})

// API service
const { fetchDanceStyles, createDanceStyle, updateDanceStyle, deleteDanceStyle } = useApiService()

// Load dance styles
const loadStyles = async () => {
  loading.value = true
  try {
    const { data, error } = await fetchDanceStyles()
    
    if (error.value) throw new Error(error.value.data?.statusMessage || 'Failed to load dance styles')
    
    styles.value = data.value || []
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message,
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadStyles()
})

// Open dialog for new style
const openNewStyleDialog = () => {
  style.value = {
    name: '',
    color: '#FF5722',
    description: ''
  }
  editingStyle.value = false
  styleDialog.value = true
}

// Open dialog to edit existing style
const editStyle = (data) => {
  style.value = { ...data }
  editingStyle.value = true
  styleDialog.value = true
}

// Close dialog
const closeDialog = () => {
  styleDialog.value = false
}

// Save dance style (create or update)
const saveStyle = async () => {
  saving.value = true
  
  try {
    // Validate required fields
    if (!style.value.name || !style.value.color) {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Style name and color are required',
        life: 3000
      })
      saving.value = false
      return
    }
    
    let result
    
    if (editingStyle.value) {
      // Update existing style
      result = await updateDanceStyle(style.value.id, style.value)
    } else {
      // Create new style
      result = await createDanceStyle(style.value)
    }
    
    if (result.error.value) {
      throw new Error(result.error.value.data?.statusMessage || 'Failed to save dance style')
    }
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: editingStyle.value ? 'Dance style updated successfully' : 'Dance style created successfully',
      life: 3000
    })
    
    styleDialog.value = false
    loadStyles() // Refresh the list
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message,
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

// Confirm and delete dance style
const confirmDelete = (data) => {
  confirmDialog.require({
    message: `Are you sure you want to delete the "${data.name}" dance style?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const { error } = await deleteDanceStyle(data.id)
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to delete dance style')
        }
        
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Dance style deleted successfully',
          life: 3000
        })
        
        loadStyles() // Refresh the list
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.message,
          life: 3000
        })
      }
    }
  })
}
</script>