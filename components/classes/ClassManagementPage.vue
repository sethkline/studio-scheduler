<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Class Definitions</h1>
      <Button label="Add New Class" icon="pi pi-plus" @click="navigateToNewClass" />
    </div>

    <div class="mb-4 flex flex-wrap gap-2">
      <div class="p-input-icon-left">
        <i class="pi pi-search" />
        <InputText v-model="filters.global" placeholder="Search classes..." class="w-full md:w-auto" />
      </div>
      <div class="flex gap-2">
        <Dropdown
          v-model="filters.danceStyle"
          :options="danceStyles"
          optionLabel="name"
          optionValue="id"
          placeholder="Filter by Style"
          class="w-full md:w-auto"
          showClear
        />
        <Dropdown
          v-model="filters.classLevel"
          :options="classLevels"
          optionLabel="name"
          optionValue="id"
          placeholder="Filter by Level"
          class="w-full md:w-auto"
          showClear
        />
      </div>
    </div>

    <DataTable
      :value="filteredClasses"
      :loading="loading"
      stripedRows
      :paginator="filteredClasses.length > 10"
      :rows="10"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      :rowsPerPageOptions="[10, 20, 50]"
      dataKey="id"
      class="p-datatable-sm"
    >
      <Column field="name" header="Class Name" sortable>
        <template #body="{ data }">
          <div class="flex items-center">
            <div
              v-if="data.dance_style?.color"
              :style="`background-color: ${data.dance_style.color}`"
              class="w-3 h-3 rounded-full mr-2"
            ></div>
            {{ data.name }}
          </div>
        </template>
      </Column>

      <Column field="dance_style.name" header="Style" sortable>
        <template #body="{ data }">
          {{ data.dance_style?.name || 'N/A' }}
        </template>
      </Column>

      <Column field="class_level.name" header="Level" sortable>
        <template #body="{ data }">
          {{ data.class_level?.name || 'N/A' }}
        </template>
      </Column>

      <Column header="Age Range">
        <template #body="{ data }">
          <span v-if="data.min_age && data.max_age">{{ data.min_age }} - {{ data.max_age }} years</span>
          <span v-else-if="data.min_age">{{ data.min_age }}+ years</span>
          <span v-else-if="data.max_age">Up to {{ data.max_age }} years</span>
          <span v-else>All ages</span>
        </template>
      </Column>

      <Column field="duration" header="Duration" sortable>
        <template #body="{ data }"> {{ data.duration }} min </template>
      </Column>

      <Column field="max_students" header="Capacity">
        <template #body="{ data }">
          {{ data.max_students || 'Unlimited' }}
        </template>
      </Column>

      <Column header="Actions" :exportable="false" style="min-width: 12rem">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" outlined severity="info" @click="navigateToEditClass(data.id)" />
            <Button icon="pi pi-copy" outlined severity="secondary" @click="duplicateClass(data)" />
            <Button icon="pi pi-trash" outlined severity="danger" @click="confirmDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Delete confirmation dialog -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'dashboard'
});

const router = useRouter();
const toast = useToast();
const confirmDialog = useConfirm();

const classes = ref([]);
const danceStyles = ref([]);
const classLevels = ref([]);
const loading = ref(true);
const filters = ref({
  global: '',
  danceStyle: null,
  classLevel: null
});

// API service
const { fetchClasses, deleteClass, fetchDanceStyles, fetchClassLevels, createClass } = useApiService();

// Computed filtered classes based on filters
const filteredClasses = computed(() => {
  let result = [...classes.value];

  // Filter by global search
  if (filters.value.global) {
    const searchTerm = filters.value.global.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm) ||
        c.description?.toLowerCase().includes(searchTerm) ||
        c.dance_style?.name.toLowerCase().includes(searchTerm) ||
        c.class_level?.name.toLowerCase().includes(searchTerm)
    );
  }

  // Filter by dance style
  if (filters.value.danceStyle) {
    result = result.filter((c) => c.dance_style?.id === filters.value.danceStyle);
  }

  // Filter by class level
  if (filters.value.classLevel) {
    result = result.filter((c) => c.class_level?.id === filters.value.classLevel);
  }

  return result;
});

// Load class definitions
const loadClasses = async () => {
  loading.value = true;
  try {
    const { data, error } = await fetchClasses({ limit: 100 });

    if (error.value) throw new Error(error.value.data?.statusMessage || 'Failed to load classes');

    classes.value = data.value?.classes || [];
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message,
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

// Load dance styles for filtering
const loadDanceStyles = async () => {
  try {
    const { data, error } = await fetchDanceStyles();

    if (error.value) throw new Error(error.value.data?.statusMessage || 'Failed to load dance styles');

    danceStyles.value = data.value || [];
  } catch (err) {
    console.error('Error loading dance styles:', err);
  }
};

// Load class levels for filtering
const loadClassLevels = async () => {
  try {
    const { data, error } = await fetchClassLevels();

    if (error.value) throw new Error(error.value.data?.statusMessage || 'Failed to load class levels');

    classLevels.value = data.value || [];
  } catch (err) {
    console.error('Error loading class levels:', err);
  }
};

// Lifecycle
onMounted(() => {
  loadClasses();
  loadDanceStyles();
  loadClassLevels();
});

// Navigate to new class page
const navigateToNewClass = () => {
  router.push('/classes/new');
};

// Navigate to edit class page
const navigateToEditClass = (id) => {
  router.push(`/classes/edit/${id}`);
};

// Duplicate existing class
const duplicateClass = async (originalClass) => {
  try {
    // Create a new class based on original but with a new name
    const newClass = {
      name: `${originalClass.name} (Copy)`,
      dance_style_id: originalClass.dance_style?.id,
      class_level_id: originalClass.class_level?.id,
      min_age: originalClass.min_age,
      max_age: originalClass.max_age,
      description: originalClass.description,
      duration: originalClass.duration,
      max_students: originalClass.max_students
    };

    const { data, error } = await createClass(newClass);

    if (error.value) {
      throw new Error(error.value.data?.statusMessage || 'Failed to duplicate class');
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Class duplicated successfully',
      life: 3000
    });

    // Refresh the list
    loadClasses();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message,
      life: 3000
    });
  }
};

// Confirm and delete class
const confirmDelete = (data) => {
  confirmDialog.require({
    message: `Are you sure you want to delete the "${data.name}" class?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const { error } = await deleteClass(data.id);

        if (error.value) {
          throw new Error(error.value.data?.statusMessage || 'Failed to delete class');
        }

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Class deleted successfully',
          life: 3000
        });

        // Refresh the list
        loadClasses();
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.message,
          life: 3000
        });
      }
    }
  });
};
</script>
