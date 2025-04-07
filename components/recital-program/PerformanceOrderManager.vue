<template>
  <div class="performance-order-manager">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Performance Order</h2>
      <Button 
        label="Save Order" 
        icon="pi pi-save" 
        @click="saveOrder" 
        :loading="loading" 
        :disabled="!hasChanges"
      />
    </div>
    
    <div v-if="performances.length === 0" class="p-4 text-center bg-gray-50 rounded-lg">
      <i class="pi pi-info-circle text-2xl text-gray-400 mb-2"></i>
      <p class="text-gray-500">No performances have been added to this recital yet.</p>
    </div>
    
    <OrderList 
      v-else
      v-model="localPerformances" 
      dataKey="id"
      class="w-full"
      listStyle="max-height:70vh"
    >
      <template #header>
        <div class="flex justify-between p-2">
          <div class="w-8 text-center">#</div>
          <div class="flex-grow">Performance Details</div>
          <div class="w-24">Actions</div>
        </div>
      </template>
      <template #item="slotProps">
        <div class="flex items-center p-3">
          <div class="w-8 font-bold text-center">{{ slotProps.index + 1 }}</div>
          <div class="flex-grow">
            <div class="font-bold mb-1">{{ slotProps.item.song_title || 'Untitled Performance' }}</div>
            <div class="text-sm flex flex-wrap gap-2">
              <span v-if="slotProps.item.song_artist" class="flex items-center gap-1">
                <i class="pi pi-volume-up text-xs"></i>
                {{ slotProps.item.song_artist }}
              </span>
              <span v-if="slotProps.item.choreographer" class="flex items-center gap-1">
                <i class="pi pi-user text-xs"></i>
                {{ slotProps.item.choreographer }}
              </span>
              <span v-if="slotProps.item.duration" class="flex items-center gap-1">
                <i class="pi pi-clock text-xs"></i>
                {{ formatDuration(slotProps.item.duration) }}
              </span>
              <span class="flex items-center gap-1 text-primary-700">
                <i class="pi pi-users text-xs"></i>
                {{ getClassDisplayName(slotProps.item) }}
              </span>
            </div>
          </div>
          <div class="w-24 flex justify-end gap-1">
            <Button 
              icon="pi pi-pencil" 
              class="p-button-sm p-button-outlined" 
              @click="editPerformance(slotProps.item)"
            />
            <Button 
              icon="pi pi-users" 
              class="p-button-sm p-button-outlined p-button-secondary" 
              @click="viewDancers(slotProps.item)"
            />
          </div>
        </div>
      </template>
    </OrderList>
    
    <!-- Edit Performance Dialog -->
    <Dialog 
      v-model:visible="editDialog.visible" 
      :header="editDialog.title" 
      modal 
      style="width: 90vw; max-width: 500px;"
    >
      <div v-if="editDialog.performance" class="space-y-4">
        <div class="field">
          <label for="songTitle" class="font-medium">Song Title</label>
          <InputText 
            id="songTitle" 
            v-model.trim="editDialog.performance.song_title" 
            class="w-full" 
          />
        </div>
        
        <div class="field">
          <label for="songArtist" class="font-medium">Artist</label>
          <InputText 
            id="songArtist" 
            v-model.trim="editDialog.performance.song_artist" 
            class="w-full" 
          />
        </div>
        
        <div class="field">
          <label for="choreographer" class="font-medium">Choreographer</label>
          <InputText 
            id="choreographer" 
            v-model.trim="editDialog.performance.choreographer" 
            class="w-full" 
          />
        </div>
        
        <div class="field">
          <label for="duration" class="font-medium">Duration (seconds)</label>
          <InputNumber 
            id="duration" 
            v-model="editDialog.performance.duration" 
            class="w-full" 
            :min="0"
            :max="900"
          />
        </div>
        
        <div class="field">
          <label for="notes" class="font-medium">Performance Notes</label>
          <Textarea 
            id="notes" 
            v-model.trim="editDialog.performance.notes" 
            rows="3" 
            class="w-full" 
          />
        </div>
      </div>
      
      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="closeEditDialog"
        />
        <Button 
          label="Save" 
          icon="pi pi-check" 
          class="p-button-primary" 
          @click="savePerformance"
          :loading="editDialog.saving"
        />
      </template>
    </Dialog>
    
    <!-- View Dancers Dialog -->
    <Dialog 
      v-model:visible="dancersDialog.visible" 
      :header="dancersDialog.title" 
      modal 
      style="width: 90vw; max-width: 900px;"
    >
      <div v-if="programStore.loading.dancers" class="flex justify-center p-4">
        <ProgressSpinner style="width: 50px; height: 50px" />
      </div>
      <div v-else-if="programStore.dancers?.length === 0" class="p-4 text-center">
        <p>No students are currently enrolled in this class.</p>
      </div>
      <div v-else class="overflow-y-auto" style="max-height: 60vh">
        <DataTable :value="programStore.dancers" paginator :rows="10">
          <Column field="student_name" header="Student Name" sortable></Column>
          <Column field="age" header="Age" sortable></Column>
          <Column field="status" header="Status" sortable>
            <template #body="{ data }">
              <Tag 
                :value="data.status" 
                :severity="data.status === 'active' ? 'success' : 'warning'"
              />
            </template>
          </Column>
        </DataTable>
      </div>
      
      <template #footer>
        <Button 
          label="Close" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="closeDancersDialog"
        />
        <a href="/enrollments" target="_blank" class="no-underline">
          <Button 
            label="Manage Enrollments" 
            icon="pi pi-users" 
            class="p-button-outlined" 
          />
        </a>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useRecitalProgramStore } from '~/stores/recitalProgramStore';

// Props
const props = defineProps({
  performances: {
    type: Array,
    required: true,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['save', 'update-performance']);

// Initialize store
const programStore = useRecitalProgramStore();

// Component state
const localPerformances = ref([...props.performances]);
const originalOrder = ref(JSON.stringify(props.performances.map(p => p.id)));
const hasChanges = computed(() => {
  const currentOrder = JSON.stringify(localPerformances.value.map(p => p.id));
  return currentOrder !== originalOrder.value;
});

// Edit dialog state
const editDialog = reactive({
  visible: false,
  title: 'Edit Performance',
  performance: null,
  originalData: null,
  saving: false
});

// Dancers dialog state
const dancersDialog = reactive({
  visible: false,
  title: 'Enrolled Students',
  classInstanceId: null
});

// Update local performances when props change
watch(() => props.performances, (newPerformances) => {
  localPerformances.value = [...newPerformances];
  originalOrder.value = JSON.stringify(newPerformances.map(p => p.id));
}, { deep: true });

// Methods
function formatDuration(seconds) {
  if (!seconds) return '?:??';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getClassDisplayName(performance) {
  // Use class instance name, or use the class_definition name if available
  const name = performance.class_instance?.name || 
               performance.class_instance?.class_definition?.name || 
               'Unknown Class';
  return name;
}

function saveOrder() {
  emit('save', localPerformances.value);
  // We'll update originalOrder when the prop updates via the watcher
}

function editPerformance(performance) {
  editDialog.performance = { ...performance };
  editDialog.originalData = { ...performance };
  editDialog.title = `Edit: ${performance.song_title || 'Untitled Performance'}`;
  editDialog.visible = true;
}

function closeEditDialog() {
  editDialog.visible = false;
  editDialog.performance = null;
}

async function savePerformance() {
  if (!editDialog.performance) return;
  
  try {
    editDialog.saving = true;
    
    // Prepare performance data for update
    const performanceData = {
      song_title: editDialog.performance.song_title,
      song_artist: editDialog.performance.song_artist,
      choreographer: editDialog.performance.choreographer,
      duration: editDialog.performance.duration,
      notes: editDialog.performance.notes
    };
    
    // Emit update event
    emit('update-performance', editDialog.performance.id, performanceData);
    
    // Close dialog
    closeEditDialog();
  } finally {
    editDialog.saving = false;
  }
}

async function viewDancers(performance) {
  if (!performance.class_instance_id) return;
  
  try {
    dancersDialog.classInstanceId = performance.class_instance_id;
    dancersDialog.title = `Dancers: ${getClassDisplayName(performance)}`;
    dancersDialog.visible = true;
    
    // Use the store to fetch the dancers
    await programStore.fetchDancersForClass(performance.class_instance_id);
  } catch (error) {
    console.error('Error viewing dancers:', error);
  }
}

function closeDancersDialog() {
  dancersDialog.visible = false;
}
</script>