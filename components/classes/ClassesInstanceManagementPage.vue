<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Class Instances</h1>
    
    <div class="flex justify-between mb-4">
      <Button label="Create New Instance" icon="pi pi-plus" @click="openNewInstanceDialog" />
      
      <div class="flex gap-2">
        <Dropdown v-model="filterClassDef" :options="classDefOptions" 
                 optionLabel="name" optionValue="id" placeholder="Filter by class" class="w-64" />
                 
        <Dropdown v-model="filterTeacher" :options="teacherOptions" 
                 optionLabel="name" optionValue="id" placeholder="Filter by teacher" class="w-64" />
      </div>
    </div>
    
    <DataTable :value="classInstances" :loading="loading" stripedRows responsiveLayout="scroll">
      <Column field="name" header="Instance Name"></Column>
      <Column header="Class Definition">
        <template #body="{ data }">
          {{ getClassDefName(data.class_definition_id) }}
        </template>
      </Column>
      <Column header="Teacher">
        <template #body="{ data }">
          {{ getTeacherName(data.teacher_id) }}
        </template>
      </Column>
      <Column header="Status">
        <template #body="{ data }">
          <Badge :value="data.status" :severity="getStatusSeverity(data.status)" />
        </template>
      </Column>
      <Column header="Actions">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" class="p-button-sm" @click="editInstance(slotProps.data)" />
            <Button icon="pi pi-trash" class="p-button-sm p-button-danger" @click="confirmDelete(slotProps.data)" />
          </div>
        </template>
      </Column>
    </DataTable>
    
    <!-- Dialog for creating/editing class instances -->
    <Dialog v-model:visible="instanceDialog.visible" :header="instanceDialog.isEdit ? 'Edit Class Instance' : 'Create Class Instance'" modal>
      <div class="space-y-4 p-4">
        <div class="field">
          <label for="instanceName">Instance Name</label>
          <InputText id="instanceName" v-model="instanceDialog.data.name" class="w-full" />
          <small>Leave blank to use class definition name</small>
        </div>
        
        <div class="field">
          <label for="classDefinition">Class Type*</label>
          <Dropdown id="classDefinition" v-model="instanceDialog.data.class_definition_id" 
                   :options="classDefOptions" optionLabel="name" optionValue="id" 
                   placeholder="Select class type" class="w-full" :filter="true" />
        </div>
        
        <div class="field">
          <label for="teacher">Teacher</label>
          <Dropdown id="teacher" v-model="instanceDialog.data.teacher_id" 
                   :options="teacherOptions" optionLabel="name" optionValue="id" 
                   placeholder="Select teacher" class="w-full" :filter="true" />
        </div>
        
        <div class="field">
          <label for="status">Status</label>
          <Dropdown id="status" v-model="instanceDialog.data.status" 
                   :options="statusOptions" placeholder="Select status" optionValue="value" optionLabel="label" class="w-full" />
        </div>
      </div>
      
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="instanceDialog.visible = false" />
        <Button label="Save" icon="pi pi-check" @click="saveInstance" />
      </template>
    </Dialog>
    
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const toast = useToast();
const confirm = useConfirm();

// State
const loading = ref(true);
const classInstances = ref([]);
const classDefinitions = ref([]);
const teachers = ref([]);
const filterClassDef = ref(null);
const filterTeacher = ref(null);

// Dialog state
const instanceDialog = reactive({
  visible: false,
  isEdit: false,
  data: {
    id: null,
    name: '',
    class_definition_id: null,
    teacher_id: null,
    status: 'active'
  }
});

// Options
const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
];

// Computed properties
const classDefOptions = computed(() => {
  return classDefinitions.value.map(def => ({
    id: def.id,
    name: def.name
  }));
});

const teacherOptions = computed(() => {
  return teachers.value.map(teacher => ({
    id: teacher.id,
    name: `${teacher.first_name} ${teacher.last_name}`
  }));
});

async function checkDatabaseTables() {
  try {
    const client = useSupabaseClient();
    
    // Check class_definitions table
    const { data: classData, error: classError } = await client
      .from('class_definitions')
      .select('count(*)');
    
    if (classError) throw classError;
    console.log('Number of class definitions:', classData[0].count);
    
    // Check teachers table
    const { data: teacherData, error: teacherError } = await client
      .from('teachers')
      .select('count(*)');
    
    if (teacherError) throw teacherError;
    console.log('Number of teachers:', teacherData[0].count);
    
  } catch (error) {
    console.error('Error checking database tables:', error);
  }
}

// Load data
onMounted(async () => {
  await checkDatabaseTables();
  await Promise.all([
    fetchClassInstances(),
    fetchClassDefinitions(),
    fetchTeachers()
  ]);
});

// Watch for filter changes
watch([filterClassDef, filterTeacher], () => {
  fetchClassInstances();
});

// Fetch class instances
async function fetchClassInstances() {
  loading.value = true;
  try {
    const params = {};
    
    if (filterClassDef.value) {
      params.class_definition_id = filterClassDef.value;
    }
    
    if (filterTeacher.value) {
      params.teacher_id = filterTeacher.value;
    }
    
    const response = await useFetch('/api/class-instances', { params });
    console.log('Class instances response:', response);
    
    if (response.error.value) throw response.error.value;
    classInstances.value = response.data.value || [];
    
    console.log('Class instances loaded:', classInstances.value);
  } catch (error) {
    console.error('Error fetching class instances:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load class instances',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
}

async function fetchClassDefinitions() {
  try {
    const client = useSupabaseClient();
    
    // Direct database query
    const { data, error } = await client
      .from('class_definitions')
      .select(`
        id,
        name,
        min_age,
        max_age,
        description,
        duration,
        max_students,
        dance_style:dance_style_id (id, name, color),
        class_level:class_level_id (id, name)
      `);
    
    if (error) throw error;
    classDefinitions.value = data || [];
    console.log('Class definitions loaded directly:', classDefinitions.value);
  } catch (error) {
    console.error('Error fetching class definitions:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load class definitions',
      life: 3000
    });
  }
}

async function fetchTeachers() {
  try {
    console.log('Fetching teachers using API endpoint...');
    
    const response = await useFetch('/api/teachers', { 
      params: {
        limit: 100 // Get more teachers at once
      }
    });
    
    console.log('API response for teachers:', response);
    
    if (response.error.value) {
      console.error('API error:', response.error.value);
      throw response.error.value;
    }
    
    // Check the shape of the response
    if (response.data.value && response.data.value.teachers) {
      teachers.value = response.data.value.teachers;
    } else {
      teachers.value = response.data.value || [];
    }
    
    console.log('Teachers loaded via API:', teachers.value);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load teachers: ' + (error.message || 'Unknown error'),
      life: 3000
    });
  }
}
// Helper functions
function getClassDefName(id) {
  const def = classDefinitions.value.find(d => d.id === id);
  return def ? def.name : 'Unknown';
}

function getTeacherName(id) {
  if (!id) return 'Not assigned';
  const teacher = teachers.value.find(t => t.id === id);
  return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown';
}

function getStatusSeverity(status) {
  return status === 'active' ? 'success' : 'danger';
}

// Dialog functions
function openNewInstanceDialog() {
  instanceDialog.isEdit = false;
  instanceDialog.data = {
    id: null,
    name: '',
    class_definition_id: null,
    teacher_id: null,
    status: 'active'
  };
  instanceDialog.visible = true;
}

// Edit instance function
function editInstance(instance) {
  instanceDialog.isEdit = true;
  instanceDialog.data = {
    id: instance.id,
    name: instance.name,
    class_definition_id: instance.class_definition_id,
    teacher_id: instance.teacher_id,
    status: instance.status
  };
  instanceDialog.visible = true;
}

// Save instance
async function saveInstance() {
  if (!instanceDialog.data.class_definition_id) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Class type is required',
      life: 3000
    });
    return;
  }
  
  try {
    // If name is empty, use class definition name
    if (!instanceDialog.data.name) {
      const classDef = classDefinitions.value.find(d => d.id === instanceDialog.data.class_definition_id);
      if (classDef) {
        instanceDialog.data.name = classDef.name;
      }
    }
    
    let response;
    
    if (instanceDialog.isEdit) {
      // Update using PUT endpoint
      response = await useFetch(`/api/class-instances/${instanceDialog.data.id}`, {
        method: 'PUT',
        body: {
          name: instanceDialog.data.name,
          class_definition_id: instanceDialog.data.class_definition_id,
          teacher_id: instanceDialog.data.teacher_id,
          status: instanceDialog.data.status
        }
      });
    } else {
      // Create using POST endpoint
      response = await useFetch('/api/class-instances/add', {
        method: 'POST',
        body: {
          name: instanceDialog.data.name,
          class_definition_id: instanceDialog.data.class_definition_id,
          teacher_id: instanceDialog.data.teacher_id,
          status: instanceDialog.data.status
        }
      });
    }
    
    const { error } = response;
    
    if (error.value) throw error.value;
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: instanceDialog.isEdit 
        ? 'Class instance updated successfully' 
        : 'Class instance created successfully',
      life: 3000
    });
    
    instanceDialog.visible = false;
    fetchClassInstances();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save class instance',
      life: 3000
    });
    console.error(error);
  }
}

// Confirm delete
function confirmDelete(instance) {
  confirm.require({
    message: `Are you sure you want to delete the class instance "${instance.name}"?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteInstance(instance.id)
  });
}

// Delete instance
async function deleteInstance(id) {
  try {
    const { error } = await useFetch(`/api/class-instances/${id}`, {
      method: 'DELETE'
    });
    
    if (error.value) throw error.value;
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Class instance deleted successfully',
      life: 3000
    });
    
    fetchClassInstances();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete class instance',
      life: 3000
    });
    console.error(error);
  }
}
</script>