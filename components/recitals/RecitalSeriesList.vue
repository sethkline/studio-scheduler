<template>
  <div class="space-y-4">
    <div class="flex justify-between mb-4">
      <h1 class="text-2xl font-bold">Recital Series</h1>
      <Button 
        label="Create New Series" 
        icon="pi pi-plus" 
        @click="showCreateSeriesDialog = true"
      />
    </div>
    
    <DataTable 
      :value="recitalSeries" 
      :loading="loading" 
      stripedRows 
      class="p-datatable-sm"
      :paginator="true"
      :rows="10"
      :rowsPerPageOptions="[5, 10, 20]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
    >
      <Column field="name" header="Name">
        <template #body="{ data }">
          <NuxtLink :to="`/recitals/series/${data.id}`" class="text-primary-600 hover:text-primary-800">
            {{ data.name }}
          </NuxtLink>
        </template>
      </Column>
      <Column field="year" header="Year" :sortable="true" />
      <Column field="season" header="Season" />
      <Column field="theme" header="Theme" />
      <Column header="Actions" style="width: 100px">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button 
              icon="pi pi-pencil" 
              severity="secondary"
              text 
              rounded 
              aria-label="Edit" 
              @click="editSeries(data)"
            />
            <Button 
              icon="pi pi-trash" 
              severity="danger" 
              text 
              rounded 
              aria-label="Delete" 
              @click="confirmDeleteSeries(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
    
    <!-- Create/Edit Series Dialog -->
    <Dialog 
      v-model:visible="showCreateSeriesDialog" 
      :header="editMode ? 'Edit Recital Series' : 'Create Recital Series'" 
      modal 
      class="w-full max-w-lg"
    >
      <Form
        v-slot="$form"
        :initialValues="seriesForm"
        :resolver="formResolver"
        @submit="saveSeries"
        class="space-y-4"
      >
        <div class="field">
          <label for="name" class="font-medium text-sm mb-1 block">Series Name*</label>
          <InputText 
            id="name" 
            name="name"
            class="w-full" 
            aria-describedby="name-error"
          />
          <Message 
            v-if="$form.name?.invalid && $form.name?.touched" 
            severity="error" 
            size="small"
            variant="simple"
          >
            {{ $form.name.error?.message }}
          </Message>
        </div>
        
        <div class="field">
          <label for="year" class="font-medium text-sm mb-1 block">Year*</label>
          <InputNumber 
            id="year" 
            name="year"
            class="w-full" 
            aria-describedby="year-error"
            :min="2000"
            :max="2100"
          />
          <Message 
            v-if="$form.year?.invalid && $form.year?.touched" 
            severity="error" 
            size="small"
            variant="simple"
          >
            {{ $form.year.error?.message }}
          </Message>
        </div>
        
        <div class="field">
          <label for="season" class="font-medium text-sm mb-1 block">Season</label>
          <Dropdown
            id="season"
            name="season"
            class="w-full"
            :options="seasons"
            optionLabel="name"
            optionValue="value"
            placeholder="Select a season"
          />
        </div>
        
        <div class="field">
          <label for="theme" class="font-medium text-sm mb-1 block">Theme</label>
          <InputText 
            id="theme" 
            name="theme"
            class="w-full" 
          />
        </div>
        
        <div class="field">
          <label for="description" class="font-medium text-sm mb-1 block">Description</label>
          <Textarea 
            id="description" 
            name="description"
            class="w-full" 
            rows="3"
          />
        </div>
        
        <div class="flex justify-end gap-2 pt-4">
          <Button 
            type="button" 
            label="Cancel" 
            class="p-button-text" 
            @click="closeSeriesDialog"
            :disabled="saving"
          />
          <Button 
            type="submit" 
            label="Save" 
            icon="pi pi-save"
            :loading="saving"
          />
        </div>
      </Form>
    </Dialog>
    
    <!-- Delete Confirmation -->
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { Form } from '@primevue/forms';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

// State
const recitalSeries = ref([]);
const loading = ref(true);
const saving = ref(false);
const showCreateSeriesDialog = ref(false);
const editMode = ref(false);
const seriesForm = ref({
  name: '',
  year: new Date().getFullYear(),
  season: '',
  theme: '',
  description: ''
});

const currentSeriesId = ref(null);

// Services
const toast = useToast();
const confirm = useConfirm();
const { fetchRecitalSeries, createRecitalSeries, updateRecitalSeries, deleteRecitalSeries } = useApiService();

// Form validation
const seriesSchema = z.object({
  name: z.string().min(1, 'Series name is required'),
  year: z.number().min(2000, 'Year must be 2000 or later').max(2100, 'Year must be 2100 or earlier'),
  season: z.string().optional(),
  theme: z.string().optional(),
  description: z.string().optional()
});

const formResolver = zodResolver(seriesSchema);

// Options
const seasons = [
  { name: 'Spring', value: 'Spring' },
  { name: 'Summer', value: 'Summer' },
  { name: 'Fall', value: 'Fall' },
  { name: 'Winter', value: 'Winter' }
];

// Methods
const loadRecitalSeries = async () => {
  loading.value = true;
  try {
    const { data, error } = await fetchRecitalSeries();
    
    if (error.value) {
      throw new Error(error.value.message || 'Failed to load recital series');
    }
    
    recitalSeries.value = data.value.series;
  } catch (error) {
    console.error('Error loading recital series:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load recital series',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const editSeries = (series) => {
  currentSeriesId.value = series.id;
  seriesForm.value = { ...series };
  editMode.value = true;
  showCreateSeriesDialog.value = true;
};

const closeSeriesDialog = () => {
  showCreateSeriesDialog.value = false;
  // Reset form after dialog closes
  setTimeout(() => {
    editMode.value = false;
    currentSeriesId.value = null;
    seriesForm.value = {
      name: '',
      year: new Date().getFullYear(),
      season: '',
      theme: '',
      description: ''
    };
  }, 300);
};

const saveSeries = async ({ values, valid }) => {
  if (!valid) return;
  
  saving.value = true;
  try {
    if (editMode.value) {
      const { data, error } = await updateRecitalSeries(currentSeriesId.value, values);
      
      if (error.value) {
        throw new Error(error.value.message || 'Failed to update recital series');
      }
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Recital series updated successfully',
        life: 3000
      });
    } else {
      const { data, error } = await createRecitalSeries(values);
      
      if (error.value) {
        throw new Error(error.value.message || 'Failed to create recital series');
      }
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Recital series created successfully',
        life: 3000
      });
    }
    
    // Reload data and close dialog
    await loadRecitalSeries();
    closeSeriesDialog();
  } catch (error) {
    console.error('Error saving recital series:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save recital series',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
};

const confirmDeleteSeries = (series) => {
  confirm.require({
    message: `Are you sure you want to delete "${series.name}"? This action cannot be undone.`,
    header: 'Delete Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteSeries(series.id)
  });
};

const deleteSeries = async (id) => {
  try {
    const { error } = await deleteRecitalSeries(id);
    
    if (error.value) {
      throw new Error(error.value.message || 'Failed to delete recital series');
    }
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Recital series deleted successfully',
      life: 3000
    });
    
    // Reload data
    await loadRecitalSeries();
  } catch (error) {
    console.error('Error deleting recital series:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete recital series',
      life: 3000
    });
  }
};

// Load data on component mount
onMounted(() => {
  loadRecitalSeries();
});
</script>