<template>
  <div class="performance-uploader card p-4">
    <h3 class="text-xl font-semibold mb-4">Bulk Upload Performances</h3>

    <div class="mb-4">
      <h4 class="font-medium mb-2">Instructions:</h4>
      <ol class="list-decimal ml-5 space-y-1 text-sm">
        <li>Download the template spreadsheet</li>
        <li>Fill in your performance details</li>
        <li>Upload the completed file</li>
        <li>Map columns and class instances</li>
        <li>Click "Process Upload" to add all performances</li>
      </ol>
    </div>

    <!-- Template Download -->
    <div class="mb-4">
      <Button label="Download Template" icon="pi pi-download" @click="downloadTemplate" class="p-button-outlined" />
    </div>

    <!-- File Upload -->
    <div class="mb-4">
      <FileUpload
        mode="basic"
        name="performanceData"
        :auto="true"
        accept=".csv,.xlsx,.xls"
        :maxFileSize="1000000"
        @select="onFileSelect"
        @upload="onUpload"
        :customUpload="true"
        chooseLabel="Select File"
        class="w-full"
      />
    </div>

    <!-- Progress and Status -->
    <div v-if="loading" class="mb-4">
      <ProgressBar :value="uploadProgress" class="mb-2" />
      <p class="text-sm text-gray-600">{{ statusMessage }}</p>
    </div>

    <!-- Paste Text Area Alternative -->
    <div v-if="!fileUploaded" class="mb-4">
      <h4 class="font-medium mb-2">Or paste performance data:</h4>
      <Textarea v-model="pastedData" placeholder="Paste your performance data here..." rows="6" class="w-full" />
      <Button
        label="Process Pasted Data"
        icon="pi pi-check"
        @click="processPastedData"
        class="mt-2"
        :disabled="!pastedData.trim()"
      />
    </div>

    <!-- Data Preview -->
    <div v-if="parsedData.length > 0" class="mb-4">
      <h4 class="font-medium mb-2">Data Preview:</h4>
      <DataTable :value="parsedData.slice(0, 5)" responsiveLayout="scroll" class="p-datatable-sm">
        <Column v-for="col in columns" :key="col.field" :field="col.field" :header="col.header" />
      </DataTable>
      <p v-if="parsedData.length > 5" class="text-sm text-gray-500 mt-1">
        Showing 5 of {{ parsedData.length }} entries
      </p>
    </div>

    <!-- Column Mapping -->
    <div v-if="parsedData.length > 0" class="mb-4">
      <h4 class="font-medium mb-2">Map Columns:</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="field">
          <label class="block mb-1">Performance Number:</label>
          <Dropdown
            v-model="columnMapping.performanceNumber"
            :options="columnOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select column"
            class="w-full"
          />
        </div>
        <div class="field">
          <label class="block mb-1">Song Title:</label>
          <Dropdown
            v-model="columnMapping.songTitle"
            :options="columnOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select column"
            class="w-full"
          />
        </div>
        <div class="field">
          <label class="block mb-1">Artist:</label>
          <Dropdown
            v-model="columnMapping.artist"
            :options="columnOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select column"
            class="w-full"
          />
        </div>
        <div class="field">
          <label class="block mb-1">Choreographer:</label>
          <Dropdown
            v-model="columnMapping.choreographer"
            :options="columnOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select column"
            class="w-full"
          />
        </div>
        <div class="field">
          <label class="block mb-1">Group/Class:</label>
          <Dropdown
            v-model="columnMapping.group"
            :options="columnOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select column"
            class="w-full"
          />
        </div>
        <div class="field">
          <label class="block mb-1">Dancers:</label>
          <Dropdown
            v-model="columnMapping.dancers"
            :options="columnOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select column"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- Class Instance Matching -->
    <div v-if="uniqueGroups.length > 0" class="mb-4">
      <h4 class="font-medium mb-2">Match Groups to Class Instances:</h4>
      <div v-for="group in uniqueGroups" :key="group" class="mb-3 pb-3 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <span class="font-medium">{{ group }}:</span>
          
          <!-- Create New Class button -->
          <Button 
            label="Create New Class" 
            icon="pi pi-plus" 
            class="p-button-sm p-button-outlined"
            @click="openNewClassDialog(group)" 
          />
        </div>
        
        <div class="mt-2">
          <Dropdown
            v-model="classInstanceMapping[group]"
            :options="allClassInstances"
            optionLabel="display_name"
            optionValue="id"
            placeholder="Select class instance"
            filter
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2">
      <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="reset" />
      <Button
        label="Process Upload"
        icon="pi pi-check"
        @click="processUpload"
        :disabled="!isReadyToProcess || processing"
        :loading="processing"
      />
    </div>

    <!-- Create New Class Dialog -->
    <Dialog 
      v-model:visible="newClassDialog.visible" 
      header="Create New Class Instance" 
      :style="{width: '600px'}" 
      modal
    >
      <div class="p-2">
        <div class="mb-4">
          <span class="font-medium">For Group:</span>
          <div class="text-lg">{{ newClassDialog.groupName }}</div>
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
                     filter
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
                     filter
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
    <Dialog v-model:visible="showResults" header="Upload Results" :style="{ width: '500px' }" modal>
      <div v-if="uploadResults">
        <div
          class="mb-4 text-center"
          :class="{ 'text-green-600': uploadResults.success, 'text-red-600': !uploadResults.success }"
        >
          <i :class="uploadResults.success ? 'pi pi-check-circle' : 'pi pi-times-circle'" style="font-size: 3rem"></i>
          <h3 class="text-xl font-bold mt-2">{{ uploadResults.success ? 'Success!' : 'Upload Failed' }}</h3>
        </div>

        <div v-if="uploadResults.success">
          <p class="mb-2">Successfully processed {{ uploadResults.total }} performances:</p>
          <ul class="list-disc ml-5 mb-4">
            <li>{{ uploadResults.created }} performances created</li>
            <li>{{ uploadResults.updated }} performances updated</li>
            <li>{{ uploadResults.skipped }} performances skipped</li>
          </ul>
        </div>

        <div v-else>
          <p class="mb-2">Error: {{ uploadResults.error }}</p>
        </div>

        <div
          v-if="uploadResults.warnings && uploadResults.warnings.length > 0"
          class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded"
        >
          <p class="font-medium text-yellow-800 mb-1">Warnings:</p>
          <ul class="list-disc ml-5 text-sm text-yellow-800">
            <li v-for="(warning, index) in uploadResults.warnings" :key="index">
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
import { ref, computed, reactive, watch, onMounted } from 'vue';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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
const emit = defineEmits(['upload-complete', 'cancel']);

// State
const fileUploaded = ref(false);
const loading = ref(false);
const processing = ref(false);
const uploadProgress = ref(0);
const statusMessage = ref('');
const parsedData = ref([]);
const columns = ref([]);
const pastedData = ref('');
const uploadResults = ref(null);
const showResults = ref(false);
const danceStyles = ref([]);
const classLevels = ref([]);
const newClassInstances = ref([]);

// Column mapping
const columnMapping = reactive({
  performanceNumber: null,
  songTitle: null,
  artist: null,
  choreographer: null,
  group: null,
  dancers: null
});

// Class instance mapping
const classInstanceMapping = reactive({});

// New class dialog
const newClassDialog = reactive({
  visible: false,
  saving: false,
  groupName: '',
  formData: {
    name: '',
    dance_style_id: null,
    class_level_id: null,
    description: ''
  }
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

// Computed properties
const columnOptions = computed(() => {
  return columns.value.map((col, index) => ({
    label: col.header,
    value: col.field
  }));
});

const uniqueGroups = computed(() => {
  if (!parsedData.value.length || !columnMapping.group) return [];

  const groups = new Set();
  parsedData.value.forEach((item) => {
    if (item[columnMapping.group]) {
      groups.add(item[columnMapping.group]);
    }
  });

  return Array.from(groups);
});

const allClassInstances = computed(() => {
  // Combine original class instances with newly created ones
  return [...props.classInstances, ...newClassInstances.value];
});

const isReadyToProcess = computed(() => {
  // Check if required mappings are set
  const requiredMappings = [columnMapping.performanceNumber, columnMapping.songTitle, columnMapping.group];

  if (requiredMappings.some((mapping) => !mapping)) {
    return false;
  }

  // Check if all groups are mapped to class instances
  return uniqueGroups.value.every((group) => classInstanceMapping[group]);
});

// Fetch dance styles and class levels on mount
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

function downloadTemplate() {
  const templateData = [
    ['Performance Number', 'Song Title', 'Artist', 'Choreographer', 'Group', 'Dancers'],
    ['1', 'Example Song', 'Example Artist', 'Jane Doe', 'Beginner Ballet', 'Dancer 1, Dancer 2, Dancer 3']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Performances');

  XLSX.writeFile(workbook, 'performance_template.xlsx');
}

function onFileSelect(event) {
  const file = event.files[0];
  if (!file) return;

  fileUploaded.value = true;
  loading.value = true;
  uploadProgress.value = 20;
  statusMessage.value = 'Reading file...';

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      processFileData(file, data);
    } catch (error) {
      statusMessage.value = `Error: ${error.message}`;
      loading.value = false;
    }
  };

  reader.readAsArrayBuffer(file);
}

function onUpload() {
  // This is just a stub as we're using customUpload=true
  // Actual file processing happens in onFileSelect
}

function processFileData(file, data) {
  try {
    uploadProgress.value = 40;
    statusMessage.value = 'Processing file...';

    if (file.name.endsWith('.csv')) {
      // Process CSV file
      const text = new TextDecoder().decode(data);
      parseCsvData(text);
    } else {
      // Process Excel file
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (json.length < 2) {
        throw new Error('File is empty or has no data rows');
      }

      // Convert Excel data to our format
      parseExcelData(json);
    }

    uploadProgress.value = 100;
    statusMessage.value = 'File processed successfully';
    setTimeout(() => {
      loading.value = false;
    }, 500);
  } catch (error) {
    console.error('File processing error:', error);
    statusMessage.value = `Error: ${error.message}`;
    loading.value = false;
  }
}

function parseCsvData(csvText) {
  Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      if (results.data.length === 0) {
        statusMessage.value = 'No data found in the CSV file';
        return;
      }

      parsedData.value = results.data;
      columns.value = Object.keys(results.data[0]).map((key) => ({
        field: key,
        header: key
      }));

      // Try to auto-detect column mappings
      autoDetectColumnMappings();
    },
    error: function (error) {
      statusMessage.value = `Error parsing CSV: ${error.message}`;
    }
  });
}

function parseExcelData(jsonData) {
  if (jsonData.length < 2) {
    statusMessage.value = 'No data found in the Excel file';
    return;
  }

  // First row is headers
  const headers = jsonData[0];
  const data = [];

  // Convert the array format to object format with headers as keys
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    const obj = {};

    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        // Skip empty header columns
        obj[headers[j]] = row[j] || '';
      }
    }

    data.push(obj);
  }

  parsedData.value = data;
  columns.value = headers.map((header) => ({
    field: header,
    header: header
  }));

  // Try to auto-detect column mappings
  autoDetectColumnMappings();
}

function processPastedData() {
  if (!pastedData.value.trim()) return;

  loading.value = true;
  uploadProgress.value = 20;
  statusMessage.value = 'Processing pasted data...';

  try {
    // Split by lines and detect format
    const lines = pastedData.value.trim().split('\n');

    if (lines.length < 2) {
      throw new Error('Not enough data in pasted text');
    }

    // Check if it's CSV format (contains commas)
    if (lines[0].includes(',')) {
      parseCsvData(pastedData.value);
    } else {
      // Try to parse as tab-delimited
      const headers = lines[0].split('\t');
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split('\t');
        const obj = {};

        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) {
            obj[headers[j]] = row[j] || '';
          }
        }

        data.push(obj);
      }

      parsedData.value = data;
      columns.value = headers.map((header) => ({
        field: header,
        header: header
      }));

      // Try to auto-detect column mappings
      autoDetectColumnMappings();
    }

    uploadProgress.value = 100;
    statusMessage.value = 'Data processed successfully';
    setTimeout(() => {
      loading.value = false;
    }, 500);
  } catch (error) {
    console.error('Paste processing error:', error);
    statusMessage.value = `Error: ${error.message}`;
    loading.value = false;
  }
}

function autoDetectColumnMappings() {
  if (!columns.value.length) return;

  // Keywords to look for in column names
  const mappingPatterns = {
    performanceNumber: ['number', 'order', '#', 'no.', 'id'],
    songTitle: ['song', 'title', 'music', 'track'],
    artist: ['artist', 'performer', 'singer', 'band'],
    choreographer: ['choreographer', 'choreographed', 'choreography'],
    group: ['group', 'class', 'team', 'ensemble', 'student'],
    dancers: ['dancers', 'performer', 'members', 'students', 'names']
  };

  // Check each column name against our patterns
  for (const [mappingKey, patterns] of Object.entries(mappingPatterns)) {
    for (const col of columns.value) {
      const lowerHeader = col.header.toLowerCase();

      // Check if any pattern matches this column
      if (patterns.some((pattern) => lowerHeader.includes(pattern.toLowerCase()))) {
        columnMapping[mappingKey] = col.field;
        break;
      }
    }
  }
}

function openNewClassDialog(groupName) {
  newClassDialog.groupName = groupName;
  
  // Initialize form data with group name
  newClassDialog.formData = {
    name: groupName,
    dance_style_id: null,
    class_level_id: null,
    description: ''
  };
  
  newClassDialog.visible = true;
}

function closeNewClassDialog() {
  newClassDialog.visible = false;
}

async function createNewClass(event) {
  try {
    // Extract form values from submit event
    const { values, valid } = event;
    if (!valid) return;
    
    newClassDialog.saving = true;
    
    // First create a class definition
    const client = useSupabaseClient();
    
    // 1. Create the class definition
    const { data: classDefData, error: classDefError } = await client
      .from('class_definitions')
      .insert([{
        name: values.name,
        dance_style_id: values.dance_style_id,
        class_level_id: values.class_level_id || null,
        description: values.description || null,
        duration: 60 // Default duration in minutes
      }])
      .select()
      .single();
    
    if (classDefError) throw classDefError;
    
    // 2. Create a class instance
    const { data: classInstanceData, error: classInstanceError } = await client
      .from('class_instances')
      .insert([{
        class_definition_id: classDefData.id,
        name: values.name,
        status: 'active'
      }])
      .select(`
        id,
        name,
        class_definition:class_definition_id (
          id,
          name,
          dance_style:dance_style_id (
            id,
            name,
            color
          ),
          class_level:class_level_id (
            id,
            name
          )
        )
      `)
      .single();
    
    if (classInstanceError) throw classInstanceError;
    
    // Add display name to the class instance
    const newClassInstance = {
      ...classInstanceData,
      display_name: `${classInstanceData.name} (${classInstanceData.class_definition?.dance_style?.name || 'Unknown Style'})`
    };
    
    // Add the new class instance to our local array
    newClassInstances.value.push(newClassInstance);
    
    // Update the mapping for this group
    classInstanceMapping[newClassDialog.groupName] = newClassInstance.id;
    
    // Close the dialog
    closeNewClassDialog();
    
    // Show success notification
    statusMessage.value = `Created class "${newClassInstance.name}" successfully`;
    
  } catch (err) {
    console.error('Error creating class:', err);
    alert('Failed to create class: ' + err.message);
  } finally {
    newClassDialog.saving = false;
  }
}

async function processUpload() {
  if (!isReadyToProcess.value) return;

  processing.value = true;
  statusMessage.value = 'Uploading performances...';

  try {
    const formattedData = [];
    const warnings = [];

    // Format performance data for API
    for (const row of parsedData.value) {
      const group = row[columnMapping.group];
      if (!group || !classInstanceMapping[group]) {
        warnings.push(`Skipping row: Missing group or class instance mapping for "${group}"`);
        continue;
      }

      const performanceOrder = parseInt(row[columnMapping.performanceNumber]);
      if (isNaN(performanceOrder)) {
        warnings.push(
          `Invalid performance number for "${row[columnMapping.songTitle] || 'Unknown'}": ${
            row[columnMapping.performanceNumber]
          }`
        );
      }

      // Get dancers list
      const dancers = row[columnMapping.dancers] || '';


      // Create performance object
      formattedData.push({
        class_instance_id: classInstanceMapping[group],
        performance_order: isNaN(performanceOrder) ? null : performanceOrder,
        song_title: row[columnMapping.songTitle] || '',
        song_artist: row[columnMapping.artist] || '',
        choreographer: row[columnMapping.choreographer] || '',
        notes: '', 
        dancers: dancers
      });
    }

    if (formattedData.length === 0) {
      throw new Error('No valid performances to upload');
    }


    // Use the API endpoint
    const { data, error } = await useFetch(`/api/recital-shows/${props.recitalId}/performances/bulk`, {
      method: 'POST',
      body: {
        performances: formattedData
      }
    });

    if (error.value) throw new Error(error.value.statusMessage || 'API error occurred');

    // Handle the enhanced response from our updated API
    const apiResponse = data.value;
    
    // Extract skipped performances for warnings
    if (apiResponse.skipped && apiResponse.skipped.length > 0) {
      apiResponse.skipped.forEach(skipped => {
        const performanceDetails = skipped.performance.song_title || 'Unknown performance';
        warnings.push(`Skipped "${performanceDetails}": ${skipped.error}`);
      });
    }

    // Show results
    uploadResults.value = {
      success: true,
      total: formattedData.length,
      created: apiResponse.created || apiResponse.performances.length,
      updated: 0,
      skipped: apiResponse.skipped ? apiResponse.skipped.length : (formattedData.length - apiResponse.performances.length),
      warnings: warnings
    };

    showResults.value = true;

    // Emit complete event with both performances and any new class instances
    emit('upload-complete', {
      performances: apiResponse.performances,
      newClassInstances: newClassInstances.value
    });
  } catch (error) {
    console.error('Upload error:', error);
    uploadResults.value = {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
    showResults.value = true;
  } finally {
    processing.value = false;
  }
}

function reset() {
  fileUploaded.value = false;
  loading.value = false;
  processing.value = false;
  uploadProgress.value = 0;
  statusMessage.value = '';
  parsedData.value = [];
  columns.value = [];
  pastedData.value = '';
  newClassInstances.value = [];

  // Reset mappings
  for (const key in columnMapping) {
    columnMapping[key] = null;
  }

  // Reset class instance mappings
  for (const key in classInstanceMapping) {
    delete classInstanceMapping[key];
  }

  emit('cancel');
}

function closeResults() {
  showResults.value = false;

  // If successful, reset the form
  if (uploadResults.value && uploadResults.value.success) {
    reset();
  }
}
</script>