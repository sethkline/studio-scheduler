<template>
  <div class="performance-text-parser card p-4">
    <h3 class="text-xl font-semibold mb-4">Import Performance Program Data</h3>
    
    <div class="mb-4">
      <h4 class="font-medium mb-2">Instructions:</h4>
      <ol class="list-decimal ml-5 space-y-1 text-sm">
        <li>Paste your performance data in the format shown below</li>
        <li>Click "Parse Data" to extract performance information</li>
        <li>Review and map each performance to a class instance (or create one)</li>
        <li>Click "Import Performances" to add all performances</li>
      </ol>
    </div>
    
    <!-- Format Example -->
    <div class="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
      <h4 class="font-medium mb-1 text-sm">Example Format:</h4>
      <pre class="text-xs whitespace-pre-wrap">1. Made for This                                    Carrolton
Choreographed by Ashlyn Auriemma             Student Leaders
Dancers: Abigail Hanes, Aliyah Melhorn, Annie Brown, Kylie Kinsey, Kate Koppenhaver, ...</pre>
    </div>
    
    <!-- Paste Text Area -->
    <div class="mb-4">
      <label class="block font-medium mb-2">Paste Program Text:</label>
      <Textarea v-model="programText" 
                placeholder="Paste your performance program text here..." 
                rows="10" 
                class="w-full" />
    </div>
    
    <div class="mb-4">
      <Button label="Parse Performance Data" 
              icon="pi pi-check" 
              @click="parseText" 
              class="p-button-primary"
              :disabled="!programText.trim()" />
    </div>
    
    <!-- Parse Results -->
    <div v-if="parsedPerformances.length > 0" class="mb-6">
      <h4 class="font-medium mb-3">Parsed Performances:</h4>
      <div v-for="(performance, index) in parsedPerformances" :key="index" class="mb-4 p-3 border rounded-lg">
        <div class="flex justify-between">
          <div class="font-medium">{{ performance.orderNumber }}. {{ performance.songTitle }}</div>
          <Tag v-if="performance.isValid" value="Valid" severity="success" />
          <Tag v-else value="Missing Data" severity="warning" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          <div>
            <div class="text-sm text-gray-500">Artist</div>
            <div>{{ performance.artist || 'Not specified' }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Choreographer</div>
            <div>{{ performance.choreographer || 'Not specified' }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Group</div>
            <div>{{ performance.group || 'Not specified' }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Class Instance</div>
            <div class="mt-1">
              <div v-if="performance.classInstanceId">
                <Dropdown v-model="performance.classInstanceId" 
                        :options="classInstances" 
                        optionLabel="display_name" 
                        optionValue="id" 
                        placeholder="Select class instance" 
                        class="w-full" />
              </div>
              <div v-else>
                <Button 
                  label="Select Class" 
                  icon="pi pi-link" 
                  class="p-button-sm mr-2"
                  @click="openClassSelection(performance)" />
                
                <Button 
                  label="Create New Class" 
                  icon="pi pi-plus" 
                  class="p-button-sm p-button-outlined"
                  @click="openNewClassDialog(performance)" />
              </div>
            </div>
          </div>
        </div>
        <div class="mt-2">
          <div class="text-sm text-gray-500">Dancers</div>
          <div>{{ performance.dancers }}</div>
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="flex justify-between">
      <Button label="Clear" 
              icon="pi pi-trash" 
              class="p-button-outlined p-button-danger" 
              @click="clearAll"
              v-if="parsedPerformances.length > 0" />
              
      <Button label="Import Performances" 
              icon="pi pi-upload" 
              class="p-button-primary" 
              @click="importPerformances"
              :disabled="!hasValidPerformances || importing"
              :loading="importing"
              v-if="parsedPerformances.length > 0" />
    </div>

    <!-- Class Selection Dialog -->
    <Dialog 
      v-model:visible="classSelectionDialog.visible" 
      header="Select Class Instance" 
      :style="{width: '600px'}" 
      modal
    >
      <div class="p-2">
        <div class="mb-4">
          <span class="font-medium">Performance:</span>
          <div class="text-lg">{{ classSelectionDialog.songTitle }}</div>
          <div class="text-sm text-gray-600">Group: {{ classSelectionDialog.group }}</div>
        </div>
        
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <label class="font-medium">Search Class Instances:</label>
            <div class="flex gap-2">
              <Dropdown 
                v-model="classFilter.danceStyle"
                :options="danceStyles"
                optionLabel="name"
                optionValue="id"
                placeholder="All Styles"
                class="w-32"
              />
              <InputText 
                v-model="classFilter.searchTerm" 
                placeholder="Search..." 
                class="w-40"
              />
            </div>
          </div>
          
          <DataTable 
            :value="filteredClassInstances"
            v-model:selection="classSelectionDialog.selectedClass"
            selectionMode="single"
            dataKey="id"
            class="p-datatable-sm"
            :rows="5"
            :paginator="true"
            :loading="classSelectionDialog.loading"
            responsiveLayout="scroll"
            :rowHover="true"
          >
            <Column selectionMode="single" style="width: 3rem" />
            <Column field="display_name" header="Class Name">
              <template #body="{ data }">
                <div>
                  <div class="font-medium">{{ data.name || data.class_definition?.name }}</div>
                  <div v-if="data.class_definition?.dance_style" class="text-xs flex items-center">
                    <div class="w-2 h-2 rounded-full mr-1" 
                        :style="`background-color: ${data.class_definition?.dance_style?.color || '#cccccc'}`"></div>
                    <span>{{ data.class_definition?.dance_style?.name }}</span>
                  </div>
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
        
        <div class="flex justify-end gap-2">
          <Button 
            label="Cancel" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="closeClassSelectionDialog" 
          />
          <Button 
            label="Select" 
            icon="pi pi-check" 
            @click="confirmClassSelection"
            :disabled="!classSelectionDialog.selectedClass" 
          />
        </div>
      </div>
    </Dialog>

    <!-- New Class Dialog -->
    <Dialog 
      v-model:visible="newClassDialog.visible" 
      header="Create New Class Instance" 
      :style="{width: '600px'}" 
      modal
    >
      <div class="p-2">
        <div class="mb-4">
          <span class="font-medium">For Performance:</span>
          <div class="text-lg">{{ newClassDialog.songTitle }}</div>
          <div class="text-sm text-gray-600">Group: {{ newClassDialog.group }}</div>
        </div>
        
        <Form 
          v-if="newClassDialog.visible"
          v-slot="$form" 
          :initialValues="newClassDialog.formData"
          :resolver="classFormResolver"
          @submit="createNewClass"
          class="space-y-4"
        >
          <div class="field">
            <label for="name" class="font-medium text-sm mb-1 block">Class Name*</label>
            <InputText id="name" 
                      name="name"
                      class="w-full" 
                      :value="newClassDialog.group"
                      aria-describedby="name-error" />
            <Message 
              v-if="$form.name?.invalid" 
              severity="error" 
              size="small" 
              variant="simple"
            >
              {{ $form.name.error?.message }}
            </Message>
          </div>

          <div class="field">
            <label for="dance_style_id" class="font-medium text-sm mb-1 block">Dance Style*</label>
            <Dropdown id="dance_style_id" 
                     name="dance_style_id"
                     :options="danceStyles" 
                     optionLabel="name" 
                     optionValue="id"
                     placeholder="Select a dance style" 
                     class="w-full" 
                     aria-describedby="dance_style_id-error" />
            <Message 
              v-if="$form.dance_style_id?.invalid" 
              severity="error" 
              size="small" 
              variant="simple"
            >
              {{ $form.dance_style_id.error?.message }}
            </Message>
          </div>

          <div class="field">
            <label for="class_level_id" class="font-medium text-sm mb-1 block">Class Level</label>
            <Dropdown id="class_level_id" 
                     name="class_level_id"
                     :options="classLevels" 
                     optionLabel="name" 
                     optionValue="id"
                     placeholder="Select a class level" 
                     class="w-full" 
                     aria-describedby="class_level_id-error" />
          </div>

          <div class="field">
            <label for="description" class="font-medium text-sm mb-1 block">Description</label>
            <Textarea id="description" 
                     name="description"
                     rows="3" 
                     class="w-full" />
          </div>
          
          <div class="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              label="Cancel" 
              icon="pi pi-times" 
              class="p-button-text" 
              @click="closeNewClassDialog"
              :disabled="newClassDialog.saving"
            />
            <Button 
              type="submit" 
              label="Create Class" 
              icon="pi pi-check"
              :loading="newClassDialog.saving"
            />
          </div>
        </Form>
      </div>
    </Dialog>

    <!-- Results Dialog -->
    <Dialog v-model:visible="showResults" header="Import Results" :style="{width: '500px'}" modal>
      <div v-if="importResults">
        <div class="mb-4 text-center" :class="{'text-green-600': importResults.success, 'text-red-600': !importResults.success}">
          <i :class="importResults.success ? 'pi pi-check-circle' : 'pi pi-times-circle'" style="font-size: 3rem"></i>
          <h3 class="text-xl font-bold mt-2">{{ importResults.success ? 'Success!' : 'Import Failed' }}</h3>
        </div>
        
        <div v-if="importResults.success">
          <p class="mb-2">Successfully imported {{ importResults.total }} performances:</p>
          <ul class="list-disc ml-5 mb-4">
            <li>{{ importResults.created }} performances created</li>
            <li>{{ importResults.skipped }} performances skipped</li>
          </ul>
        </div>
        
        <div v-else>
          <p class="mb-2">Error: {{ importResults.error }}</p>
        </div>
        
        <div v-if="importResults.warnings && importResults.warnings.length > 0" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p class="font-medium text-yellow-800 mb-1">Warnings:</p>
          <ul class="list-disc ml-5 text-sm text-yellow-800">
            <li v-for="(warning, index) in importResults.warnings" :key="index">
              {{ warning }}
            </li>
          </ul>
        </div>
        
        <div class="flex justify-end">
          <Button label="Close" @click="closeResults" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { Form } from '@primevue/forms';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';

// Props
const props = defineProps({
  recitalId: {
    type: String,
    required: true
  },
  classInstances: {
    type: Array,
    required: true
  }
});

// Emits
const emit = defineEmits(['import-complete', 'cancel']);

// State
const programText = ref('');
const parsedPerformances = ref([]);
const importing = ref(false);
const importResults = ref(null);
const showResults = ref(false);
const danceStyles = ref([]);
const classLevels = ref([]);

// Class selection dialog
const classSelectionDialog = reactive({
  visible: false,
  loading: false,
  performance: null,
  songTitle: '',
  group: '',
  selectedClass: null
});

// New class dialog
const newClassDialog = reactive({
  visible: false,
  saving: false,
  performance: null,
  songTitle: '',
  group: '',
  formData: {
    name: '',
    dance_style_id: null,
    class_level_id: null,
    description: ''
  }
});

// Filter for class instances
const classFilter = reactive({
  searchTerm: '',
  danceStyle: null
});

// Computed
const hasValidPerformances = computed(() => {
  return parsedPerformances.value.some(p => 
    p.classInstanceId && p.songTitle.trim() && p.isValid
  );
});

const filteredClassInstances = computed(() => {
  if (!props.classInstances.length) return [];
  
  return props.classInstances.filter(instance => {
    // Filter by search term
    const searchMatch = !classFilter.searchTerm || 
      instance.display_name.toLowerCase().includes(classFilter.searchTerm.toLowerCase());
    
    // Filter by dance style
    const styleMatch = !classFilter.danceStyle || 
      instance.class_definition?.dance_style?.id === classFilter.danceStyle;
    
    return searchMatch && styleMatch;
  });
});

// Validation schemas
const classFormSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  dance_style_id: z.string().min(1, "Dance style is required"),
  class_level_id: z.string().optional().nullable(),
  description: z.string().optional()
});

// Create resolver
const classFormResolver = zodResolver(classFormSchema);

// Load dance styles and class levels on mount
onMounted(async () => {
  await fetchDanceStyles();
  await fetchClassLevels();
});

// Methods
async function fetchDanceStyles() {
  try {
    const client = useSupabaseClient();
    
    const { data, error } = await client
      .from('dance_styles')
      .select('id, name, color')
      .order('name');
      
    if (error) throw error;
    
    danceStyles.value = data;
  } catch (err) {
    console.error('Error fetching dance styles:', err);
  }
}

async function fetchClassLevels() {
  try {
    const client = useSupabaseClient();
    
    const { data, error } = await client
      .from('class_levels')
      .select('id, name')
      .order('name');
      
    if (error) throw error;
    
    classLevels.value = data;
  } catch (err) {
    console.error('Error fetching class levels:', err);
  }
}

function parseText() {
  if (!programText.value.trim()) return;
  
  const performances = [];
  let currentPerformance = null;
  
  // Split by lines and process
  const lines = programText.value.trim().split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check if this is a new performance (starts with a number)
    const performanceMatch = line.match(/^(\d+)\.\s+(.*?)(?:\s{2,}|\t+)(.*)$/);
    if (performanceMatch) {
      // Save previous performance if exists
      if (currentPerformance) {
        performances.push(currentPerformance);
      }
      
      // Start new performance
      currentPerformance = {
        orderNumber: parseInt(performanceMatch[1]),
        songTitle: performanceMatch[2].trim(),
        artist: performanceMatch[3].trim(),
        choreographer: '',
        group: '',
        dancers: '',
        classInstanceId: null,
        isValid: false
      };
    } 
    // Check if this is a choreographer line
    else if (line.toLowerCase().includes('choreographed by') && currentPerformance) {
      const parts = line.split(/\s{2,}|\t+/);
      currentPerformance.choreographer = parts[0].replace(/choreographed by/i, '').trim();
      if (parts.length > 1) {
        currentPerformance.group = parts[1].trim();
      }
    }
    // Check if this is a dancers line
    else if (line.toLowerCase().includes('dancers:') && currentPerformance) {
      currentPerformance.dancers = line.replace(/dancers:/i, '').trim();
    }
    // Append to dancers if continuation
    else if (currentPerformance && currentPerformance.dancers) {
      currentPerformance.dancers += ', ' + line.trim();
    }
  }
  
  // Add the last performance
  if (currentPerformance) {
    performances.push(currentPerformance);
  }
  
  // Mark performances as valid if they have required fields
  performances.forEach(p => {
    p.isValid = Boolean(p.songTitle && p.orderNumber);
    
    // Try to auto-match class instance based on group name
    if (p.group && props.classInstances.length > 0) {
      const match = props.classInstances.find(instance => 
        instance.name?.toLowerCase() === p.group.toLowerCase() ||
        instance.display_name?.toLowerCase().includes(p.group.toLowerCase())
      );
      
      if (match) {
        p.classInstanceId = match.id;
      }
    }
  });
  
  parsedPerformances.value = performances;
}

function clearAll() {
  programText.value = '';
  parsedPerformances.value = [];
}

function openClassSelection(performance) {
  classSelectionDialog.performance = performance;
  classSelectionDialog.songTitle = performance.songTitle;
  classSelectionDialog.group = performance.group;
  classSelectionDialog.selectedClass = null;
  classSelectionDialog.visible = true;
  
  // Reset filters
  classFilter.searchTerm = performance.group;
  classFilter.danceStyle = null;
}

function closeClassSelectionDialog() {
  classSelectionDialog.visible = false;
  classSelectionDialog.performance = null;
}

function confirmClassSelection() {
  if (!classSelectionDialog.selectedClass || !classSelectionDialog.performance) return;
  
  // Update the performance with the selected class
  classSelectionDialog.performance.classInstanceId = classSelectionDialog.selectedClass.id;
  
  // Close the dialog
  closeClassSelectionDialog();
}

function openNewClassDialog(performance) {
  newClassDialog.performance = performance;
  newClassDialog.songTitle = performance.songTitle;
  newClassDialog.group = performance.group;
  
  // Initialize form data with group name
  newClassDialog.formData = {
    name: performance.group,
    dance_style_id: null,
    class_level_id: null,
    description: ''
  };
  
  newClassDialog.visible = true;
}

function closeNewClassDialog() {
  newClassDialog.visible = false;
  newClassDialog.performance = null;
}

async function createNewClass(event) {
  try {
    // Extract form values from submit event
    const { values, valid } = event;
    if (!valid) return;
    
    newClassDialog.saving = true;
    
    // Call the API endpoint to create a class definition and instance
    const { data, error } = await useFetch('/api/class-definitions/add-with-instance', {
      method: 'POST',
      body: {
        name: values.name,
        dance_style_id: values.dance_style_id,
        class_level_id: values.class_level_id || null,
        description: values.description || '',
        duration: 60 // Default duration in minutes
      }
    });
    
    if (error.value) throw new Error(error.value.statusMessage || 'API error occurred');
    
    if (!data.value || !data.value.classInstance) {
      throw new Error('No class instance was returned from the API');
    }
    
    // Add display name to the class instance
    const newClassInstance = {
      ...data.value.classInstance,
      display_name: `${data.value.classInstance.name} (${data.value.classInstance.class_definition?.dance_style?.name || 'Unknown Style'})`
    };
    
    // Update the performance with the new class instance ID
    newClassDialog.performance.classInstanceId = newClassInstance.id;
    
    // Add the new class instance to the list
    if (Array.isArray(props.classInstances)) {
      props.classInstances.push(newClassInstance);
    }
    
    // Close the dialog
    closeNewClassDialog();
    
  } catch (err) {
    console.error('Error creating class:', err);
    
    // Show error message
    alert('Failed to create class: ' + (err.message || 'Unknown error'));
  } finally {
    newClassDialog.saving = false;
  }
}

async function importPerformances() {
  const validPerformances = parsedPerformances.value.filter(p => 
    p.isValid && p.classInstanceId
  );
  
  if (validPerformances.length === 0) return;
  
  importing.value = true;
  const warnings = [];
  
  try {
    // Format performances for API
    const formattedData = validPerformances.map(p => ({
      class_instance_id: p.classInstanceId,
      performance_order: p.orderNumber,
      song_title: p.songTitle,
      song_artist: p.artist || '',
      choreographer: p.choreographer || '',
      notes: p.dancers ? `Dancers: ${p.dancers}` : ''
    }));
    
    // Call API endpoint
    const { data, error } = await useFetch(`/api/recital-shows/${props.recitalId}/performances/bulk`, {
      method: 'POST',
      body: {
        performances: formattedData
      }
    });
    
    if (error.value) throw new Error(error.value.statusMessage || 'API error occurred');
    
    // Show results
    importResults.value = {
      success: true,
      total: validPerformances.length,
      created: data.value.performances.length,
      skipped: validPerformances.length - data.value.performances.length,
      warnings: warnings
    };
    
    showResults.value = true;
    
    // Emit complete event
    emit('import-complete', data.value.performances);
    
  } catch (error) {
    console.error('Import error:', error);
    importResults.value = {
      success: false,
      error: error.message || 'Unknown error occurred',
      warnings: warnings
    };
    showResults.value = true;
  } finally {
    importing.value = false;
  }
}

function closeResults() {
  showResults.value = false;
  
  // If successful, clear the form
  if (importResults.value && importResults.value.success) {
    clearAll();
  }
}
</script>