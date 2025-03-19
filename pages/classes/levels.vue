<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Class Levels</h1>
      <Button label="Add New Level" icon="pi pi-plus" @click="openNewLevelDialog" />
    </div>
    
    <DataTable 
      :value="levels" 
      :loading="loading"
      stripedRows
      :paginator="levels.length > 10"
      :rows="10"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      :rowsPerPageOptions="[10, 20, 50]"
      dataKey="id"
      class="p-datatable-sm">
      
      <Column field="name" header="Level Name" sortable></Column>
      
      <Column header="Age Range" sortable>
        <template #body="{ data }">
          <span v-if="data.min_age && data.max_age">{{ data.min_age }} - {{ data.max_age }} years</span>
          <span v-else-if="data.min_age">{{ data.min_age }}+ years</span>
          <span v-else-if="data.max_age">Up to {{ data.max_age }} years</span>
          <span v-else>All ages</span>
        </template>
      </Column>
      
      <Column field="description" header="Description" class="max-w-md truncate">
        <template #body="{ data }">
          <div class="truncate max-w-md">{{ data.description || 'No description' }}</div>
        </template>
      </Column>
      
      <Column header="Actions" :exportable="false" style="min-width: 8rem">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" outlined severity="info" @click="editLevel(data)" />
            <Button icon="pi pi-trash" outlined severity="danger" @click="confirmDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>
    
    <!-- Dialog for creating/editing class levels -->
    <Dialog 
      v-model:visible="levelDialog" 
      :header="editingLevel ? 'Edit Class Level' : 'New Class Level'" 
      :style="{ width: '450px' }" 
      modal>
      <div class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium">Level Name*</label>
          <InputText id="name" v-model="level.name" required autofocus class="w-full" />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="min_age" class="block text-sm font-medium">Minimum Age</label>
            <InputNumber id="min_age" v-model="level.min_age" inputId="min_age" min="0" class="w-full" />
          </div>
          
          <div>
            <label for="max_age" class="block text-sm font-medium">Maximum Age</label>
            <InputNumber id="max_age" v-model="level.max_age" inputId="max_age" min="0" class="w-full" />
          </div>
        </div>
        
        <div>
          <label for="description" class="block text-sm font-medium">Description</label>
          <Textarea id="description" v-model="level.description" rows="3" class="w-full" />
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-between w-full">
          <Button label="Cancel" icon="pi pi-times" outlined @click="closeDialog" />
          <Button label="Save" icon="pi pi-check" @click="saveLevel" :loading="saving" />
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

const levels = ref([])
const loading = ref(true)
const levelDialog = ref(false)
const editingLevel = ref(false)
const saving = ref(false)
const level = ref({
  name: '',
  min_age: null,
  max_age: null,
  description: ''
})

// API service
const { fetchClassLevels, createClassLevel, updateClassLevel, deleteClassLevel } = useApiService()

// Load class levels
const loadLevels = async () => {
  loading.value = true
  try {
    const { data, error } = await fetchClassLevels()
    
    if (error.value) throw new Error(error.value.data?.statusMessage || 'Failed to load class levels')
    
    levels.value = data.value || []
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
  loadLevels()
})

// Open dialog for new level
const openNewLevelDialog = () => {
  level.value = {
    name: '',
    min_age: null,
    max_age: null,
    description: ''
  }
  editingLevel.value = false
  levelDialog.value = true
}

// Open dialog to edit existing level
const editLevel = (data) => {
  level.value = { ...data }
  editingLevel.value = true
  levelDialog.value = true
}

// Close dialog
const closeDialog = () => {
  levelDialog.value = false
}

// Save class level (create or update)
const saveLevel = async () => {
  saving.value = true
  
  try {
    // Validate required fields
    if (!level.value.name) {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Level name is required',
        life: 3000
      })
      saving.value = false
      return
    }
    
    // Validate age range if both are provided
    if (level.value.min_age !== null && level.value.max_age !== null) {
      if (level.value.min_age > level.value.max_age) {
        toast.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Minimum age cannot be greater than maximum age',
          life: 3000
        })
        saving.value = false
        return
      }
    }
    
    let result
    
    if (editingLevel.value) {
      // Update existing level
      result = await updateClassLevel(level.value.id, level.value)
    } else {
      // Create new level
      result = await createClassLevel(level.value)
    }
    
    if (result.error.value) {
      throw new Error(result.error.value.data?.statusMessage || 'Failed to save class level')
    }
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: editingLevel.value ? 'Class level updated successfully' : 'Class level created successfully',
      life: 3000
    })
    
    levelDialog.value = false
    loadLevels() // Refresh the list
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

// Confirm and delete class level
const confirmDelete = (data) => {
  confirmDialog.require({
    message: `Are you sure you want to delete the "${data.name}" class level?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const { error } = await deleteClassLevel(data.id)
        
        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to delete class level')
        }
        
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Class level deleted successfully',
          life: 3000
        })
        
        loadLevels() // Refresh the list
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