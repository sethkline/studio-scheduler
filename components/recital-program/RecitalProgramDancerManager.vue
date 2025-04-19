<template>
  <div class="dancer-manager">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Dancer Management</h2>
      <div class="flex gap-2">
        <span class="p-input-icon-left">
          <i class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search dancers..." @input="searchDancers" />
        </span>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Performance List -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-3">Performances</h3>
        <div v-if="loading" class="flex justify-center my-4">
          <ProgressSpinner class="w-8 h-8" />
        </div>
        <div v-else-if="!performances || performances.length === 0" class="text-center p-6 bg-gray-50 rounded-lg">
          <i class="pi pi-info-circle text-2xl text-gray-400 mb-2"></i>
          <p class="text-gray-500">No performances have been added to this recital yet.</p>
        </div>
        <div v-else class="performance-list">
          <div 
            v-for="perf in performances" 
            :key="perf.id" 
            class="performance-item p-3 border-b cursor-pointer hover:bg-gray-50"
            :class="{ 'bg-primary-50': selectedPerformance?.id === perf.id }"
            @click="selectPerformance(perf)"
          >
            <div class="flex items-center gap-2">
              <div class="performance-number bg-primary-100 text-primary-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold">
                {{ perf.performance_order }}
              </div>
              <div class="flex-grow">
                <h4 class="font-medium">{{ perf.song_title || 'Untitled Performance' }}</h4>
                <div class="text-xs text-gray-500 flex flex-wrap gap-2">
                  <span v-if="perf.song_artist">{{ perf.song_artist }}</span>
                  <span v-if="perf.class_instance?.class_definition?.dance_style?.name">
                    <Chip 
                      :label="perf.class_instance.class_definition.dance_style.name"
                      :style="{ backgroundColor: perf.class_instance.class_definition.dance_style.color || '#cccccc', color: '#ffffff' }"
                      class="text-xs"
                    />
                  </span>
                </div>
              </div>
              <div class="text-xs text-gray-500">
                {{ getDancerCount(perf.id) }} dancers
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Dancer Management Panel -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-3">
          {{ selectedPerformance ? `Dancers for "${selectedPerformance.song_title}"` : 'Select a Performance' }}
        </h3>
        
        <div v-if="!selectedPerformance" class="text-center p-6 bg-gray-50 rounded-lg">
          <i class="pi pi-arrow-left text-2xl text-gray-400 mb-2"></i>
          <p class="text-gray-500">Select a performance from the list to manage its dancers.</p>
        </div>
        
        <div v-else>
          <div v-if="loading" class="flex justify-center my-4">
            <ProgressSpinner class="w-8 h-8" />
          </div>
          <div v-else>
            <!-- Dancer List -->
            <div class="mb-4">
              <div v-if="performanceDancers.length === 0" class="text-center p-4 bg-gray-50 rounded-lg">
                <p class="text-gray-500">No dancers assigned to this performance.</p>
              </div>
              <div v-else class="dancer-list p-2 border rounded-lg mb-4 max-h-64 overflow-y-auto">
                <div 
                  v-for="(dancer, index) in performanceDancers" 
                  :key="index"
                  class="dancer-item flex justify-between items-center py-2 px-3 border-b last:border-b-0"
                >
                  <div class="dancer-name">{{ dancer.dancer_name || dancer.student_name }}</div>
                  <Button 
                    icon="pi pi-times" 
                    class="p-button-text p-button-rounded p-button-danger p-button-sm"
                    @click="removeDancer(index)"
                  />
                </div>
              </div>
            </div>
            
            <!-- Add Dancers Form -->
            <div class="add-dancer-form border rounded-lg p-4">
              <h4 class="text-md font-medium mb-2">Add Dancers</h4>
              
              <div class="mb-3">
                <TabView>
                  <TabPanel header="Manual Entry">
                    <div class="field mb-3">
                      <label for="dancer_names" class="block text-sm font-medium text-gray-700 mb-1">Dancer Names</label>
                      <Textarea 
                        id="dancer_names" 
                        v-model="dancerNamesInput" 
                        placeholder="Enter dancer names, one per line or comma-separated"
                        rows="3"
                        class="w-full"
                      />
                      <small class="text-gray-500">Enter each dancer on a new line or separate with commas.</small>
                    </div>
                    
                    <Button 
                      label="Add Dancers" 
                      icon="pi pi-plus" 
                      @click="addManualDancers"
                      :disabled="!dancerNamesInput.trim()"
                    />
                  </TabPanel>
                  
                  <TabPanel header="Search Students">
                    <div class="field mb-3">
                      <label for="student_search" class="block text-sm font-medium text-gray-700 mb-1">Search Students</label>
                      <div class="p-inputgroup">
                        <InputText 
                          id="student_search" 
                          v-model="studentSearchQuery" 
                          placeholder="Type to search..."
                          @input="searchStudents"
                        />
                        <Button icon="pi pi-search" />
                      </div>
                      <small class="text-gray-500">Search by student name.</small>
                    </div>
                    
                    <div v-if="studentSearchResults.length > 0" class="student-results border rounded-lg p-2 max-h-40 overflow-y-auto mb-3">
                      <div 
                        v-for="student in studentSearchResults" 
                        :key="student.id"
                        class="student-item flex justify-between items-center py-2 px-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                        @click="addStudent(student)"
                      >
                        <div>{{ student.first_name }} {{ student.last_name }}</div>
                        <Button 
                          icon="pi pi-plus" 
                          class="p-button-text p-button-rounded p-button-sm"
                        />
                      </div>
                    </div>
                    <div v-else-if="isSearchingStudents" class="text-center p-2">
                      <i class="pi pi-spin pi-spinner mr-2"></i> Searching...
                    </div>
                    <div v-else-if="studentSearchQuery && studentSearchQuery.length >= 2" class="text-center p-2 text-gray-500">
                      No students found matching your search.
                    </div>
                  </TabPanel>
                </TabView>
              </div>
              
              <div class="flex justify-end">
                <Button 
                  label="Save Dancers" 
                  icon="pi pi-save" 
                  class="p-button-primary" 
                  @click="saveDancers"
                  :loading="saving"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Dancer Search Results Panel -->
    <div v-if="dancerSearchActive" class="mt-6 card">
      <h3 class="text-lg font-semibold mb-3">Dancer Search Results</h3>
      
      <div v-if="dancerSearchResults.length === 0" class="text-center p-4 bg-gray-50 rounded-lg">
        <p class="text-gray-500">No dancers found matching your search query.</p>
      </div>
      
      <div v-else>
        <DataTable :value="dancerSearchResults" stripedRows>
          <Column field="name" header="Dancer Name">
            <template #body="{ data }">
              <div class="font-medium">{{ data.name }}</div>
            </template>
          </Column>
          
          <Column field="performance_count" header="Performances" style="width: 150px">
            <template #body="{ data }">
              {{ data.performance_count }} performances
            </template>
          </Column>
          
          <Column header="Appears In" style="min-width: 300px">
            <template #body="{ data }">
              <div class="flex flex-wrap gap-1">
                <Chip 
                  v-for="perf in data.performances.slice(0, 3)" 
                  :key="perf.id"
                  :label="perf.title"
                  :style="{ backgroundColor: perf.style_color || '#cccccc', color: '#ffffff' }"
                  class="text-xs"
                />
                <Chip 
                  v-if="data.performances.length > 3"
                  :label="`+${data.performances.length - 3} more`"
                  class="text-xs bg-gray-200 text-gray-700"
                />
              </div>
            </template>
          </Column>
          
          <Column style="width: 100px">
            <template #body="{ data }">
              <Button 
                icon="pi pi-eye" 
                class="p-button-text p-button-rounded p-button-sm"
                @click="viewDancerDetails(data)"
                tooltip="View Performances"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
    
    <!-- Dancer Details Dialog -->
    <Dialog 
      v-model:visible="showDancerDetailsDialog" 
      modal 
      header="Dancer Performances" 
      :style="{width: '500px'}"
    >
      <div v-if="selectedDancer">
        <h3 class="text-xl font-semibold mb-3">{{ selectedDancer.name }}</h3>
        
        <div class="text-sm mb-4">
          Appears in {{ selectedDancer.performances.length }} performances
        </div>
        
        <div class="dancer-performances space-y-3">
          <div 
            v-for="perf in selectedDancer.performances" 
            :key="perf.id"
            class="performance-item border-b pb-2"
          >
            <div class="font-medium">{{ perf.title || 'Untitled Performance' }}</div>
            <div class="text-xs text-gray-500 flex items-center gap-2">
              <span class="bg-gray-100 px-2 py-1 rounded">Order: {{ perf.order }}</span>
              <span>{{ perf.class_name }}</span>
              <Chip 
                :label="perf.dance_style"
                :style="{ backgroundColor: perf.style_color || '#cccccc', color: '#ffffff' }"
                class="text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
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
const emit = defineEmits(['update-dancers', 'search-dancers']);

// Store
const programStore = useRecitalProgramStore();

// Local state
const selectedPerformance = ref(null);
const performanceDancers = ref([]);
const dancerNamesInput = ref('');
const searchQuery = ref('');
const dancerSearchResults = ref([]);
const dancerSearchActive = ref(false);
const saving = ref(false);

// Student search
const studentSearchQuery = ref('');
const studentSearchResults = ref([]);
const isSearchingStudents = ref(false);

// Dialog state
const showDancerDetailsDialog = ref(false);
const selectedDancer = ref(null);

// Methods
function selectPerformance(performance) {
  selectedPerformance.value = performance;
  
  // Load dancers for this performance
  const dancers = [];
  
  // Try to get dancers from performance_dancers in store first
  if (programStore.performanceDancers && programStore.performanceDancers[performance.id]) {
    dancers.push(...programStore.performanceDancers[performance.id]);
  } 
  // Then try dancers array on performance object
  else if (performance.dancers && performance.dancers.length > 0) {
    dancers.push(...performance.dancers);
  }
  // Finally, extract from notes if present
  else if (performance.notes && performance.notes.includes('Dancers:')) {
    const dancersText = performance.notes
      .substring(performance.notes.indexOf('Dancers:') + 8)
      .trim();
    
    dancersText.split(',').forEach(name => {
      const trimmedName = name.trim();
      if (trimmedName) {
        dancers.push({ dancer_name: trimmedName });
      }
    });
  }
  
  performanceDancers.value = dancers;
  dancerNamesInput.value = '';
}

function getDancerCount(performanceId) {
  // Try to get counts from different sources
  if (programStore.performanceDancers && programStore.performanceDancers[performanceId]) {
    return programStore.performanceDancers[performanceId].length;
  }
  
  const performance = props.performances.find(p => p.id === performanceId);
  if (!performance) return 0;
  
  if (performance.dancers && performance.dancers.length > 0) {
    return performance.dancers.length;
  }
  
  if (performance.notes && performance.notes.includes('Dancers:')) {
    const dancersText = performance.notes
      .substring(performance.notes.indexOf('Dancers:') + 8)
      .trim();
    
    return dancersText.split(',').filter(name => name.trim()).length;
  }
  
  return 0;
}

function removeDancer(index) {
  performanceDancers.value.splice(index, 1);
}

function addManualDancers() {
  const text = dancerNamesInput.value.trim();
  if (!text) return;
  
  // Split by newlines and commas
  let dancers = text.split(/[\n,]/)
    .map(name => name.trim())
    .filter(name => name);
  
  // Add each dancer if not already in the list
  dancers.forEach(name => {
    const exists = performanceDancers.value.some(
      d => (d.dancer_name || d.student_name || '').toLowerCase() === name.toLowerCase()
    );
    
    if (!exists) {
      performanceDancers.value.push({ dancer_name: name });
    }
  });
  
  // Clear input
  dancerNamesInput.value = '';
}

async function searchStudents() {
  const query = studentSearchQuery.value.trim();
  if (query.length < 2) {
    studentSearchResults.value = [];
    return;
  }
  
  isSearchingStudents.value = true;
  
  try {
    const client = useSupabaseClient();
    
    // Search for students
    const { data, error } = await client
      .from('profiles')
      .select('id, first_name, last_name')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .order('last_name')
      .limit(10);
    
    if (error) throw error;
    
    studentSearchResults.value = data || [];
  } catch (err) {
    console.error('Error searching students:', err);
    studentSearchResults.value = [];
  } finally {
    isSearchingStudents.value = false;
  }
}

function addStudent(student) {
  // Check if student is already in the list
  const exists = performanceDancers.value.some(
    d => d.student_id === student.id
  );
  
  if (!exists) {
    performanceDancers.value.push({
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`
    });
  }
  
  // Clear search
  studentSearchQuery.value = '';
  studentSearchResults.value = [];
}

async function saveDancers() {
  if (!selectedPerformance.value) return;
  
  saving.value = true;
  
  try {
    // Emit event to parent component
    await emit('update-dancers', selectedPerformance.value.id, performanceDancers.value);
  } catch (err) {
    console.error('Error saving dancers:', err);
  } finally {
    saving.value = false;
  }
}

async function searchDancers() {
  const query = searchQuery.value.trim();
  if (query.length < 2) {
    dancerSearchResults.value = [];
    dancerSearchActive.value = false;
    return;
  }
  
  try {
    // Use the search-dancers event to trigger search in parent
    const results = await emit('search-dancers', query);
    
    // If results are valid, show them
    if (results && results[0] && results[0].dancers) {
      dancerSearchResults.value = results[0].dancers;
      dancerSearchActive.value = true;
    }
  } catch (err) {
    console.error('Error searching dancers:', err);
    dancerSearchResults.value = [];
  }
}

function viewDancerDetails(dancer) {
  selectedDancer.value = dancer;
  showDancerDetailsDialog.value = true;
}

// Watch for performance changes to reset view
watch(() => props.performances, () => {
  // If currently selected performance is no longer in the list, reset selection
  if (selectedPerformance.value) {
    const stillExists = props.performances.some(p => p.id === selectedPerformance.value.id);
    if (!stillExists) {
      selectedPerformance.value = null;
      performanceDancers.value = [];
    }
  }
}, { deep: true });
</script>

<style scoped>
/* Add any custom styling needed */
.performance-list {
  max-height: 500px;
  overflow-y: auto;
}

.dancer-list {
  max-height: 300px;
  overflow-y: auto;
}
</style>