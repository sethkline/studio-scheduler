<template>
  <div>
    <div v-if="loading" class="flex justify-center py-8">
      <ProgressSpinner />
    </div>
    
    <div v-else-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
      <p>{{ error }}</p>
      <Button label="Go Back" icon="pi pi-arrow-left" class="mt-2" @click="$router.back()" />
    </div>
    
    <div v-else class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <NuxtLink to="/recitals" class="text-primary-500 hover:text-primary-700 flex items-center gap-1 mb-2">
            <i class="pi pi-arrow-left text-sm"></i>
            <span>Back to Recitals</span>
          </NuxtLink>
          <h1 class="text-2xl font-bold">{{ recital.name }}</h1>
        </div>
        
        <div class="flex gap-2">
          <Button 
            v-if="recital.has_program" 
            label="Manage Program" 
            icon="pi pi-file" 
            @click="navigateToProgram" 
            outlined
          />
          <Button 
            v-else 
            label="Create Program" 
            icon="pi pi-plus-circle" 
            @click="createProgram"
            outlined
          />
          <Button 
            label="Edit Recital" 
            icon="pi pi-pencil" 
            @click="openEditDialog"
            v-if="authStore.hasRole(['admin', 'staff'])"
          />
        </div>
      </div>
      
      <!-- Recital details -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Main info card -->
        <div class="card md:col-span-2">
          <h2 class="text-xl font-bold mb-4">Recital Details</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 class="text-sm font-semibold text-gray-500">Date</h3>
              <p>{{ formatDate(recital.date) }}</p>
            </div>
            
            <div>
              <h3 class="text-sm font-semibold text-gray-500">Location</h3>
              <p>{{ recital.location }}</p>
            </div>
            
            <div>
              <h3 class="text-sm font-semibold text-gray-500">Status</h3>
              <Tag :value="recital.status" :severity="getStatusSeverity(recital.status)" />
            </div>
            
            <div v-if="recital.theme">
              <h3 class="text-sm font-semibold text-gray-500">Theme</h3>
              <p>{{ recital.theme }}</p>
            </div>
          </div>
          
          <div class="mt-4" v-if="recital.description">
            <h3 class="text-sm font-semibold text-gray-500">Description</h3>
            <p class="whitespace-pre-line">{{ recital.description }}</p>
          </div>
          
          <div class="mt-4" v-if="recital.notes">
            <h3 class="text-sm font-semibold text-gray-500">Notes</h3>
            <p class="whitespace-pre-line">{{ recital.notes }}</p>
          </div>
        </div>
        
        <!-- Stats card -->
        <div class="card">
          <h2 class="text-xl font-bold mb-4">Program Status</h2>
          
          <div v-if="recital.has_program" class="space-y-4">
            <div class="flex items-center gap-2">
              <i class="pi pi-check-circle text-green-500 text-lg"></i>
              <span>Program Created</span>
            </div>
            
            <Button 
              label="View Program" 
              icon="pi pi-eye" 
              @click="navigateToProgram" 
              class="w-full"
            />
          </div>
          
          <div v-else class="space-y-4">
            <div class="flex items-center gap-2">
              <i class="pi pi-exclamation-circle text-yellow-500 text-lg"></i>
              <span>No Program Created</span>
            </div>
            
            <Button 
              label="Create Program" 
              icon="pi pi-plus-circle" 
              @click="createProgram" 
              class="w-full"
              outlined
            />
          </div>
          
          <Divider />
          
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-sm font-semibold text-gray-500">Date</span>
              <span>{{ formatDate(recital.date) }}</span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-sm font-semibold text-gray-500">Performances</span>
              <span>{{ performanceCount }}</span>
            </div>
            
            <div class="flex justify-between items-center" v-if="recital.has_program">
              <span class="text-sm font-semibold text-gray-500">Program Completed</span>
              <span>{{ isProgramComplete ? 'Yes' : 'No' }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Performances Tab -->
      <div class="card">
        <TabView>
          <TabPanel header="Performances">
            <div v-if="!performanceCount" class="p-4 text-center bg-gray-50 rounded">
              <p class="text-gray-500 mb-4">No performances have been added to this recital.</p>
              <Button 
                label="Add Performance" 
                icon="pi pi-plus" 
                @click="openAddPerformanceDialog"
                v-if="authStore.hasRole(['admin', 'staff'])"
              />
            </div>
            <DataTable 
              v-else
              :value="performances" 
              :paginator="true" 
              :rows="10"
              stripedRows
              responsiveLayout="scroll"
              class="p-datatable-sm"
              sortField="performance_order"
              :sortOrder="1"
            >
              <Column field="performance_order" header="#" style="width: 5%" />
              <Column header="Style" style="width: 15%">
                <template #body="{ data }">
                  <Tag 
                    :value="data.class_instance?.class_definition?.dance_style?.name" 
                    :style="{ backgroundColor: data.class_instance?.class_definition?.dance_style?.color }"
                  />
                </template>
              </Column>
              <Column field="class_instance.name" header="Class" />
              <Column field="song_title" header="Song" />
              <Column field="song_artist" header="Artist" />
              <Column field="choreographer" header="Choreographer" />
              <Column header="Duration">
                <template #body="{ data }">
                  {{ formatDuration(data.duration) }}
                </template>
              </Column>
              <Column header="Actions" :exportable="false" style="width: 10%">
                <template #body="{ data }">
                  <div class="flex gap-2">
                    <Button 
                      icon="pi pi-pencil" 
                      text 
                      rounded
                      @click="editPerformance(data)"
                      title="Edit Performance"
                      v-if="authStore.hasRole(['admin', 'staff'])"
                    />
                    <Button 
                      icon="pi pi-trash" 
                      text 
                      rounded
                      severity="danger"
                      @click="confirmDeletePerformance(data)"
                      title="Delete Performance"
                      v-if="authStore.hasRole(['admin'])"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </TabPanel>
          
          <TabPanel header="Resources">
            <p class="text-gray-500">Resources and documents related to this recital will appear here.</p>
          </TabPanel>
        </TabView>
      </div>
    </div>
    
    <!-- Edit Recital Dialog -->
    <Dialog 
      v-model:visible="editDialog.visible" 
      header="Edit Recital" 
      modal 
      :style="{ width: '500px' }"
      :dismissableMask="true"
    >
      <div v-if="editDialog.visible">
        <RecitalForm 
          v-model="editDialog.data" 
          :loading="editDialog.loading"
          @save="saveRecital"
          @cancel="editDialog.visible = false"
        />
      </div>
    </Dialog>
    
    <!-- Confirmation Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import type { Recital, RecitalPerformance } from '~/types/recitals'

const route = useRoute()
const router = useRouter()
const recitalId = route.params.id as string
const { fetchRecital, updateRecital, saveRecitalProgram } = useRecitalService()
const authStore = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

// State
const recital = ref<Recital | null>(null)
const performances = ref<RecitalPerformance[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const editDialog = ref({
  visible: false,
  loading: false,
  data: {} as Partial<Recital>
})

// Computed
const performanceCount = computed(() => performances.value.length)
const isProgramComplete = computed(() => {
  if (!recital.value?.has_program) return false
  return performanceCount.value > 0
})

// Fetch recital data on component mount
onMounted(async () => {
  await loadRecital()
})

// Load recital data from API
const loadRecital = async () => {
  loading.value = true
  error.value = null
  
  try {
    const { data, error: apiError } = await fetchRecital(recitalId)
    
    if (apiError.value) {
      throw new Error(apiError.value.message || 'Failed to load recital')
    }
    
    if (!data.value) {
      throw new Error('Recital not found')
    }
    
    recital.value = data.value as Recital
    
    // Also load performances
    await loadPerformances()
  } catch (err) {
    console.error('Error loading recital:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load recital'
  } finally {
    loading.value = false
  }
}

// Load performances for this recital
const loadPerformances = async () => {
  try {
    const client = useSupabaseClient()
    const { data, error: apiError } = await client
      .from('recital_performances')
      .select(`
        id,
        performance_order,
        song_title,
        song_artist,
        duration,
        notes,
        choreographer,
        class_instance:class_instance_id (
          id,
          name,
          class_definition:class_definition_id (
            id,
            name,
            dance_style:dance_style_id (
              id,
              name,
              color
            )
          )
        )
      `)
      .eq('recital_id', recitalId)
      .order('performance_order')
    
    if (apiError) throw apiError
    
    performances.value = data || []
  } catch (err) {
    console.error('Error loading performances:', err)
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

// Format duration in seconds to mm:ss
const formatDuration = (seconds?: number) => {
  if (!seconds) return '–'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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

// Open dialog to edit recital
const openEditDialog = () => {
  if (!recital.value) return
  
  editDialog.value = {
    visible: true,
    loading: false,
    data: { ...recital.value }
  }
}

// Save updated recital
const saveRecital = async () => {
  if (!recital.value) return
  
  editDialog.value.loading = true
  
  try {
    const { data, error: apiError } = await updateRecital(
      recitalId,
      editDialog.value.data
    )
    
    if (apiError.value) {
      throw new Error(apiError.value.message || 'Failed to update recital')
    }
    
    // Update local state
    recital.value = {
      ...recital.value,
      ...editDialog.value.data
    }
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Recital updated successfully',
      life: 3000
    })
    
    // Close dialog
    editDialog.value.visible = false
  } catch (err) {
    console.error('Error updating recital:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : 'Failed to update recital',
      life: 3000
    })
  } finally {
    editDialog.value.loading = false
  }
}

// Navigate to program management
const navigateToProgram = () => {
  router.push(`/recitals/${recitalId}/program`)
}

// Create program and navigate to program management
const createProgram = async () => {
  loading.value = true
  
  try {
    // Create empty program
    const { data, error: apiError } = await saveRecitalProgram(recitalId, {
      artistic_director_note: '',
      acknowledgments: ''
    })
    
    if (apiError.value) {
      throw new Error(apiError.value.message || 'Failed to create program')
    }
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Program created successfully',
      life: 3000
    })
    
    // Update local state
    if (recital.value) {
      recital.value.has_program = true
    }
    
    // Navigate to program management
    navigateToProgram()
  } catch (err) {
    console.error('Error creating program:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : 'Failed to create program',
      life: 3000
    })
    loading.value = false
  }
}

// Add performance functionality (placeholder)
const openAddPerformanceDialog = () => {
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'Add performance functionality will be implemented soon',
    life: 3000
  })
}

// Edit performance functionality (placeholder)
const editPerformance = (performance: RecitalPerformance) => {
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'Edit performance functionality will be implemented soon',
    life: 3000
  })
}

// Delete performance functionality (placeholder)
const confirmDeletePerformance = (performance: RecitalPerformance) => {
  confirm.require({
    message: `Are you sure you want to delete this performance?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => {
      toast.add({
        severity: 'info',
        summary: 'Info',
        detail: 'Delete performance functionality will be implemented soon',
        life: 3000
      })
    }
  })
}
</script>