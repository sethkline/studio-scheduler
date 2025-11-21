<template>
  <div class="performance-order-manager">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Performance Order</h2>
      <div class="flex gap-2">
        <Button 
          label="Save Order" 
          icon="pi pi-save" 
          :loading="loading" 
          @click="saveOrder"
        />
      </div>
    </div>
    
    <div v-if="performances.length === 0" class="text-center p-6 bg-gray-50 rounded-lg">
      <i class="pi pi-info-circle text-2xl text-gray-400 mb-2"></i>
      <p class="text-gray-500">No performances have been added to this recital yet.</p>
    </div>
    
    <div v-else>
      <DataTable 
        v-model:value="sortedPerformances" 
        dataKey="id" 
        reorderableRows 
        @row-reorder="onRowReorder"
        stripedRows 
        class="performance-table"
      >
        <Column rowReorder style="width: 3rem" />
        
        <Column field="performance_order" header="#" style="width: 3rem">
          <template #body="{ data, index }">
            {{ index + 1 }}
          </template>
        </Column>
        
        <Column field="song_title" header="Song" style="min-width: 200px">
          <template #body="{ data }">
            <div>
              <div class="font-medium">{{ data.song_title || 'Untitled Performance' }}</div>
              <div class="text-xs text-gray-500">{{ data.song_artist || '' }}</div>
            </div>
          </template>
        </Column>
        
        <Column field="class_instance.class_definition.dance_style.name" header="Style" style="width: 120px">
          <template #body="{ data }">
            <Chip 
              :label="data.class_instance?.class_definition?.dance_style?.name || 'Unknown'"
              :style="{ backgroundColor: data.class_instance?.class_definition?.dance_style?.color || '#cccccc', color: '#ffffff' }"
            />
          </template>
        </Column>
        
        <Column field="choreographer" header="Choreographer" style="width: 150px">
          <template #body="{ data }">
            {{ data.choreographer || 'Not specified' }}
          </template>
        </Column>
        
        <Column field="dancers" header="Dancers" style="min-width: 200px">
          <template #body="{ data }">
            <div v-if="data.dancers && data.dancers.length > 0" class="text-sm">
              <div class="line-clamp-2">
                {{ formatDancersList(data.dancers) }}
              </div>
              <Button
                v-if="data.dancers.length > 3"
                label="View All"
                class="p-button-text p-button-sm p-0 text-xs text-primary-600"
                @click="viewDancers(data)"
              />
            </div>
            <div v-else-if="data.notes && data.notes.includes('Dancers:')" class="text-sm">
              <div class="line-clamp-2">{{ data.notes.substring(data.notes.indexOf('Dancers:') + 8).trim() }}</div>
            </div>
            <div v-else class="text-xs text-gray-500 flex items-center">
              <Button
                label="Add Dancers"
                icon="pi pi-users"
                class="p-button-text p-button-sm p-0"
                @click="editDancers(data)"
              />
            </div>
          </template>
        </Column>

        <Column field="costumes" header="Costumes" style="min-width: 200px">
          <template #body="{ data }">
            <div v-if="data.costumes && data.costumes.length > 0" class="text-sm">
              <div class="space-y-1">
                <div
                  v-for="costume in data.costumes.slice(0, 2)"
                  :key="costume.id"
                  class="flex items-center gap-2"
                >
                  <Tag
                    v-if="costume.is_primary"
                    value="Primary"
                    severity="success"
                    class="text-xs"
                  />
                  <span class="text-xs">{{ costume.costume?.name || 'Unknown' }}</span>
                </div>
                <Button
                  v-if="data.costumes.length > 2"
                  :label="`+${data.costumes.length - 2} more`"
                  class="p-button-text p-button-sm p-0 text-xs text-primary-600"
                  @click="viewCostumes(data)"
                />
              </div>
            </div>
            <div v-else class="text-xs text-gray-500">
              <Button
                label="Assign Costume"
                icon="pi pi-shopping-bag"
                class="p-button-text p-button-sm p-0"
                @click="assignCostume(data)"
              />
            </div>
          </template>
        </Column>
        
        <Column style="width: 10rem">
          <template #body="{ data }">
            <div class="flex justify-end gap-2">
              <Button
                icon="pi pi-pencil"
                class="p-button-text p-button-sm"
                @click="editPerformance(data)"
                v-tooltip.top="'Edit Performance'"
              />
              <Button
                icon="pi pi-users"
                class="p-button-text p-button-sm"
                @click="editDancers(data)"
                v-tooltip.top="'Edit Dancers'"
              />
              <Button
                icon="pi pi-shopping-bag"
                class="p-button-text p-button-sm"
                @click="assignCostume(data)"
                v-tooltip.top="'Assign Costume'"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
    
    <!-- Edit Performance Dialog -->
    <Dialog 
      v-model:visible="showEditDialog" 
      modal 
      header="Edit Performance" 
      :style="{width: '500px'}"
    >
      <div v-if="selectedPerformance" class="p-fluid">
        <div class="field mb-4">
          <label for="song_title">Song Title</label>
          <InputText id="song_title" v-model="editForm.song_title" />
        </div>
        
        <div class="field mb-4">
          <label for="song_artist">Artist</label>
          <InputText id="song_artist" v-model="editForm.song_artist" />
        </div>
        
        <div class="field mb-4">
          <label for="choreographer">Choreographer</label>
          <InputText id="choreographer" v-model="editForm.choreographer" />
        </div>
        
        <div class="field mb-4">
          <label for="notes">Notes</label>
          <Textarea id="notes" v-model="editForm.notes" rows="3" />
        </div>
        
        <div class="flex justify-end gap-2">
          <Button label="Cancel" class="p-button-text" @click="showEditDialog = false" />
          <Button label="Save" @click="savePerformance" :loading="loading" />
        </div>
      </div>
    </Dialog>
    
    <!-- Edit Dancers Dialog -->
    <Dialog 
      v-model:visible="showDancersDialog" 
      modal 
      header="Edit Dancers" 
      :style="{width: '500px'}"
    >
      <div v-if="selectedPerformance" class="p-fluid">
        <div class="field mb-4">
          <label for="dancers">Dancers (comma-separated)</label>
          <Textarea 
            id="dancers" 
            v-model="dancersText" 
            rows="5" 
            placeholder="Enter dancer names separated by commas"
          />
          <small class="text-gray-500">List all dancers that appear in this performance.</small>
        </div>
        
        <div class="flex justify-end gap-2">
          <Button label="Cancel" class="p-button-text" @click="showDancersDialog = false" />
          <Button label="Save Dancers" @click="saveDancers" :loading="loading" />
        </div>
      </div>
    </Dialog>
    
    <!-- View Dancers Dialog -->
    <Dialog
      v-model:visible="showViewDancersDialog"
      modal
      header="Dancers"
      :style="{width: '400px'}"
    >
      <div v-if="selectedPerformance">
        <h3 class="mb-2 font-medium">{{ selectedPerformance.song_title }}</h3>
        <div v-if="selectedPerformance.dancers && selectedPerformance.dancers.length > 0">
          <ul class="list-disc pl-5 space-y-1">
            <li v-for="dancer in selectedPerformance.dancers" :key="dancer.id" class="text-sm">
              {{ dancer.student_name || dancer.dancer_name }}
            </li>
          </ul>
        </div>
        <div v-else-if="selectedPerformance.notes && selectedPerformance.notes.includes('Dancers:')">
          <ul class="list-disc pl-5 space-y-1">
            <li v-for="dancer in selectedPerformance.notes.substring(selectedPerformance.notes.indexOf('Dancers:') + 8).trim().split(',')" :key="dancer" class="text-sm">
              {{ dancer.trim() }}
            </li>
          </ul>
        </div>
        <div v-else class="text-sm text-gray-500">
          No dancers listed for this performance.
        </div>
      </div>
    </Dialog>

    <!-- View Costumes Dialog -->
    <Dialog
      v-model:visible="showViewCostumesDialog"
      modal
      header="Assigned Costumes"
      :style="{width: '600px'}"
    >
      <div v-if="selectedPerformance">
        <h3 class="mb-4 font-medium">{{ selectedPerformance.song_title }}</h3>
        <div v-if="selectedPerformance.costumes && selectedPerformance.costumes.length > 0">
          <div class="space-y-3">
            <div
              v-for="assignment in selectedPerformance.costumes"
              :key="assignment.id"
              class="border rounded-lg p-3 flex items-start gap-3"
            >
              <Image
                v-if="assignment.costume?.primary_image?.url"
                :src="assignment.costume.primary_image.url"
                :alt="assignment.costume.name"
                width="60"
                height="60"
                class="rounded object-cover"
                preview
              />
              <div class="flex-grow">
                <div class="flex items-start justify-between mb-1">
                  <h4 class="font-medium text-sm">{{ assignment.costume?.name || 'Unknown Costume' }}</h4>
                  <Tag
                    v-if="assignment.is_primary"
                    value="Primary"
                    severity="success"
                  />
                </div>
                <div class="text-xs text-gray-600 space-y-1">
                  <div><strong>Vendor:</strong> {{ assignment.costume?.vendor?.name }}</div>
                  <div><strong>SKU:</strong> {{ assignment.costume?.vendor_sku }}</div>
                  <div v-if="assignment.quantity_needed"><strong>Quantity:</strong> {{ assignment.quantity_needed }}</div>
                  <div v-if="assignment.notes" class="mt-2">
                    <strong>Notes:</strong> {{ assignment.notes }}
                  </div>
                </div>
                <div class="mt-2 flex gap-2">
                  <Button
                    label="Remove"
                    icon="pi pi-trash"
                    class="p-button-sm p-button-danger p-button-text"
                    @click="removeCostume(assignment)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-gray-500">
          No costumes assigned to this performance.
        </div>
      </div>
    </Dialog>

    <!-- Costume Assignment Modal -->
    <CostumeAssignmentModal
      v-model:visible="showCostumeAssignmentModal"
      :performance-id="selectedPerformance?.id"
      @assigned="handleCostumeAssigned"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRecitalProgramStore } from '~/stores/recitalProgramStore';

// Props
const props = defineProps({
  performances: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['save', 'update-performance', 'costume-assigned', 'remove-costume']);

// Store
const programStore = useRecitalProgramStore();

// Local state
const sortedPerformances = ref([...props.performances]);
const modified = ref(false);
const showEditDialog = ref(false);
const showDancersDialog = ref(false);
const showViewDancersDialog = ref(false);
const showViewCostumesDialog = ref(false);
const showCostumeAssignmentModal = ref(false);
const selectedPerformance = ref(null);
const editForm = ref({});
const dancersText = ref('');

// Update local list when prop changes
watch(() => props.performances, (newVal) => {
  sortedPerformances.value = [...newVal];
}, { deep: true });

// Format dancer names for display
function formatDancersList(dancers) {
  if (!dancers || dancers.length === 0) return 'No dancers listed';
  
  // Extract names from dancer objects
  const names = dancers.map(dancer => dancer.student_name || dancer.dancer_name);
  
  // Take the first 3 dancers for preview
  const previewDancers = names.slice(0, 3);
  
  if (dancers.length > 3) {
    return previewDancers.join(', ') + ` and ${dancers.length - 3} more...`;
  }
  
  return previewDancers.join(', ');
}

// Handle row reordering
function onRowReorder(event) {
  modified.value = true;
  
  // Update performance_order based on new positions
  sortedPerformances.value = sortedPerformances.value.map((perf, index) => ({
    ...perf,
    performance_order: index + 1
  }));
}

// Save the updated order
function saveOrder() {
  if (!modified.value) return;
  
  emit('save', sortedPerformances.value);
  modified.value = false;
}

// Edit performance details
function editPerformance(performance) {
  selectedPerformance.value = performance;
  editForm.value = {
    song_title: performance.song_title,
    song_artist: performance.song_artist,
    choreographer: performance.choreographer || '',
    notes: performance.notes || ''
  };
  showEditDialog.value = true;
}

// Save performance changes
function savePerformance() {
  emit('update-performance', selectedPerformance.value.id, editForm.value);
  showEditDialog.value = false;
}

// Edit dancers for a performance
function editDancers(performance) {
  selectedPerformance.value = performance;
  
  // Initialize dancers text area from existing data
  if (performance.dancers && performance.dancers.length > 0) {
    dancersText.value = performance.dancers
      .map(dancer => dancer.student_name || dancer.dancer_name)
      .join(', ');
  } else if (performance.notes && performance.notes.includes('Dancers:')) {
    dancersText.value = performance.notes.substring(performance.notes.indexOf('Dancers:') + 8).trim();
  } else {
    dancersText.value = '';
  }
  
  showDancersDialog.value = true;
}

// Save dancers changes
async function saveDancers() {
  const dancers = dancersText.value.split(',').map(name => name.trim()).filter(name => name);
  
  // Format to include in notes if using that approach
  const updatedNotes = selectedPerformance.value.notes || '';
  let finalNotes = updatedNotes;
  
  // Remove any existing Dancers: section
  if (finalNotes.includes('Dancers:')) {
    const dancersIndex = finalNotes.indexOf('Dancers:');
    const endOfLine = finalNotes.indexOf('\n', dancersIndex);
    
    if (endOfLine !== -1) {
      finalNotes = finalNotes.substring(0, dancersIndex) + finalNotes.substring(endOfLine + 1);
    } else {
      finalNotes = finalNotes.substring(0, dancersIndex).trim();
    }
  }
  
  // Add new Dancers section if we have dancers
  if (dancers.length > 0) {
    finalNotes = (finalNotes ? finalNotes + '\n\n' : '') + 'Dancers: ' + dancers.join(', ');
  }
  
  // Update the performance with new notes containing dancers
  const updateData = {
    notes: finalNotes.trim()
  };
  
  emit('update-performance', selectedPerformance.value.id, updateData);
  
  // If using the database approach for dancers, save to performance_dancers table
  if (programStore.updatePerformanceDancers) {
    try {
      await programStore.updatePerformanceDancers(
        selectedPerformance.value.recital_id,
        selectedPerformance.value.id,
        dancers.map(name => ({ dancer_name: name }))
      );
    } catch (error) {
      console.error('Error updating dancers:', error);
    }
  }
  
  showDancersDialog.value = false;
}

// View all dancers for a performance
function viewDancers(performance) {
  selectedPerformance.value = performance;
  showViewDancersDialog.value = true;
}

// Assign costume to a performance
function assignCostume(performance) {
  selectedPerformance.value = performance;
  showCostumeAssignmentModal.value = true;
}

// View all costumes for a performance
function viewCostumes(performance) {
  selectedPerformance.value = performance;
  showViewCostumesDialog.value = true;
}

// Handle costume assignment
function handleCostumeAssigned(assignment) {
  // Emit event to parent to refresh performance data
  emit('costume-assigned', selectedPerformance.value.id);
  showCostumeAssignmentModal.value = false;
}

// Remove costume assignment
async function removeCostume(assignment) {
  if (!confirm('Are you sure you want to remove this costume assignment?')) {
    return;
  }

  // Emit event to parent to remove costume
  emit('remove-costume', assignment.id);
  showViewCostumesDialog.value = false;
}
</script>

<style scoped>
/* Add any custom styling needed */
</style>