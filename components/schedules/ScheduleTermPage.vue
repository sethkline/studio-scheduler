<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Schedule Seasons</h1>

    <div class="flex justify-between mb-6">
      <div>
        <Button label="Add New Season" icon="pi pi-plus" @click="openNewTermModal" :disabled="!hasPermission" />
      </div>

      <div class="flex space-x-2">
        <Dropdown
          v-model="filterStatus"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Filter by status"
          class="w-40"
        />

        <InputText v-model="searchQuery" placeholder="Search seasons..." class="w-64" />
      </div>
    </div>

    <DataTable
      :value="scheduleStore.schedules"
      :loading="scheduleStore.loading"
      responsiveLayout="scroll"
      stripedRows
      class="p-datatable-sm"
    >
      <Column field="name" header="Season Name">
        <template #body="{ data }">
          <div class="flex items-center">
            <span
              v-if="data.is_active"
              class="inline-flex items-center px-2 py-0.5 mr-2 rounded text-xs font-medium bg-green-100 text-green-800"
            >
              Active
            </span>
            <span>{{ data.name }}</span>
          </div>
        </template>
      </Column>

      <Column header="Date Range">
        <template #body="{ data }"> {{ formatDate(data.start_date) }} - {{ formatDate(data.end_date) }} </template>
      </Column>

      <Column field="description" header="Description" />

      <Column header="Actions" :exportable="false">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button
              icon="pi pi-calendar"
              class="p-button-sm p-button-secondary"
              @click="goToScheduleBuilder(slotProps.data)"
              tooltip="Schedule Builder"
            />

            <Button
              icon="pi pi-copy"
              class="p-button-sm p-button-secondary"
              @click="openDuplicateModal(slotProps.data)"
              tooltip="Duplicate"
              :disabled="!hasPermission"
            />

            <Button
              icon="pi pi-pencil"
              class="p-button-sm p-button-secondary"
              @click="editTerm(slotProps.data)"
              tooltip="Edit"
              :disabled="!hasPermission"
            />

            <Button
              v-if="!slotProps.data.is_active"
              icon="pi pi-check-circle"
              class="p-button-sm p-button-success"
              @click="activateTerm(slotProps.data)"
              tooltip="Set as Active"
              :disabled="!hasPermission"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Pagination -->
    <div class="flex justify-between items-center mt-4">
      <div>
        Showing {{ (scheduleStore.pagination.page - 1) * scheduleStore.pagination.limit + 1 }} to
        {{
          Math.min(scheduleStore.pagination.page * scheduleStore.pagination.limit, scheduleStore.pagination.totalItems)
        }}
        of {{ scheduleStore.pagination.totalItems }} terms
      </div>

      <Paginator
        :rows="scheduleStore.pagination.limit"
        :totalRecords="scheduleStore.pagination.totalItems"
        :first="(scheduleStore.pagination.page - 1) * scheduleStore.pagination.limit"
        @page="onPageChange($event)"
      />
    </div>

    <!-- Term Form Dialog -->
    <Dialog
      v-model:visible="termDialog.visible"
      :style="{ width: '500px' }"
      :header="termDialog.isEdit ? 'Edit Schedule Season' : 'New Schedule Season'"
      :modal="true"
      :closable="true"
    >
      <div class="space-y-4">
        <div class="field">
          <label for="name" class="font-medium">Season Name*</label>
          <InputText
            id="name"
            v-model="scheduleStore.formData.name"
            required
            autofocus
            class="w-full"
            :class="{ 'p-invalid': termDialog.submitted && !scheduleStore.formData.name }"
          />
          <small v-if="termDialog.submitted && !scheduleStore.formData.name" class="p-error">
            Season name is required.
          </small>
        </div>

        <div class="field">
          <label for="description" class="font-medium">Description</label>
          <Textarea id="description" v-model="scheduleStore.formData.description" rows="3" class="w-full" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label for="startDate" class="font-medium">Start Date*</label>
            <Calendar
              id="startDate"
              v-model="scheduleStore.formData.start_date"
              dateFormat="yy-mm-dd"
              class="w-full"
              :class="{ 'p-invalid': termDialog.submitted && !scheduleStore.formData.start_date }"
            />
            <small v-if="termDialog.submitted && !scheduleStore.formData.start_date" class="p-error">
              Start date is required.
            </small>
          </div>

          <div class="field">
            <label for="endDate" class="font-medium">End Date*</label>
            <Calendar
              id="endDate"
              v-model="scheduleStore.formData.end_date"
              dateFormat="yy-mm-dd"
              class="w-full"
              :class="{ 'p-invalid': termDialog.submitted && !scheduleStore.formData.end_date }"
              :minDate="scheduleStore.formData.start_date ? new Date(scheduleStore.formData.start_date) : undefined"
            />
            <small v-if="termDialog.submitted && !scheduleStore.formData.end_date" class="p-error">
              End date is required.
            </small>
          </div>
        </div>

        <div class="field-checkbox">
          <Checkbox id="isActive" v-model="scheduleStore.formData.is_active" :binary="true" />
          <label for="isActive" class="ml-2">Set as active term</label>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="closeTerm" />
        <Button label="Save" icon="pi pi-check" class="p-button-primary" @click="saveTerm" />
      </template>
    </Dialog>

    <!-- Duplicate Dialog -->
    <Dialog
      v-model:visible="duplicateDialog.visible"
      :style="{ width: '500px' }"
      header="Duplicate Schedule Season"
      :modal="true"
      :closable="true"
    >
      <div class="space-y-4">
        <div class="field">
          <label for="newName" class="font-medium">New Season Name*</label>
          <InputText
            id="newName"
            v-model="duplicateDialog.formData.newName"
            required
            autofocus
            class="w-full"
            :class="{ 'p-invalid': duplicateDialog.submitted && !duplicateDialog.formData.newName }"
          />
          <small v-if="duplicateDialog.submitted && !duplicateDialog.formData.newName" class="p-error">
            Season name is required.
          </small>
        </div>

        <div class="field">
          <label for="newDescription" class="font-medium">Description</label>
          <Textarea id="newDescription" v-model="duplicateDialog.formData.newDescription" rows="3" class="w-full" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label for="newStartDate" class="font-medium">Start Date*</label>
            <Calendar
              id="newStartDate"
              v-model="duplicateDialog.formData.newStartDate"
              dateFormat="yy-mm-dd"
              class="w-full"
              :class="{ 'p-invalid': duplicateDialog.submitted && !duplicateDialog.formData.newStartDate }"
            />
            <small v-if="duplicateDialog.submitted && !duplicateDialog.formData.newStartDate" class="p-error">
              Start date is required.
            </small>
          </div>

          <div class="field">
            <label for="newEndDate" class="font-medium">End Date*</label>
            <Calendar
              id="newEndDate"
              v-model="duplicateDialog.formData.newEndDate"
              dateFormat="yy-mm-dd"
              class="w-full"
              :class="{ 'p-invalid': duplicateDialog.submitted && !duplicateDialog.formData.newEndDate }"
              :minDate="
                duplicateDialog.formData.newStartDate ? new Date(duplicateDialog.formData.newStartDate) : undefined
              "
            />
            <small v-if="duplicateDialog.submitted && !duplicateDialog.formData.newEndDate" class="p-error">
              End date is required.
            </small>
          </div>
        </div>

        <div class="field-checkbox">
          <Checkbox id="duplicateClasses" v-model="duplicateDialog.formData.cloneClasses" :binary="true" />
          <label for="duplicateClasses" class="ml-2">Clone all classes from original season</label>
        </div>

        <div class="field-checkbox">
          <Checkbox id="duplicateIsActive" v-model="duplicateDialog.formData.isActive" :binary="true" />
          <label for="duplicateIsActive" class="ml-2">Set as active season</label>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="duplicateDialog.visible = false" />
        <Button label="Duplicate" icon="pi pi-copy" class="p-button-primary" @click="duplicateTerm" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { useScheduleTermStore } from '~/stores/useScheduleTermStore';
import { useAuthStore } from '~/stores/auth';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const router = useRouter();
const authStore = useAuthStore();
const scheduleStore = useScheduleTermStore();

// Permissions check
const hasPermission = computed(() => {
  // TODO change this when there are more roles
  // return authStore.hasRole(['admin', 'staff'])
  return true;
});

// Filtering and search
const searchQuery = ref('');
const filterStatus = ref(null);
const statusOptions = [
  { label: 'All Terms', value: null },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' }
];

// Form dialog state
const termDialog = reactive({
  visible: false,
  isEdit: false,
  submitted: false
});

// Duplicate dialog state
const duplicateDialog = reactive({
  visible: false,
  submitted: false,
  sourceSchedule: null,
  formData: {
    sourceScheduleId: '',
    newName: '',
    newDescription: '',
    newStartDate: '',
    newEndDate: '',
    cloneClasses: true,
    isActive: false
  }
});

// Load schedules on component mount
onMounted(async () => {
  await fetchSchedules();
});

// Watch for filter changes
watch([filterStatus], async () => {
  await fetchSchedules();
});

// Watch for search query changes (with debounce)
const debouncedSearch = refDebounced(searchQuery, 300);
watch(debouncedSearch, async () => {
  await fetchSchedules();
});

// Fetch schedules with current filters
async function fetchSchedules() {
  const params = {};

  if (filterStatus.value !== null) {
    params.isActive = filterStatus.value;
  }

  if (searchQuery.value) {
    params.search = searchQuery.value;
  }

  await scheduleStore.fetchSchedules(params);
}

// Pagination handler
function onPageChange(event) {
  scheduleStore.pagination.page = event.page + 1;
  fetchSchedules();
}

// Date formatter
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

// Open new term dialog
function openNewTermModal() {
  termDialog.isEdit = false;
  scheduleStore.resetForm();

  // Set default dates (current date for start, 4 months later for end)
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 4);

  scheduleStore.formData.start_date = startDate.toISOString().split('T')[0];
  scheduleStore.formData.end_date = endDate.toISOString().split('T')[0];

  termDialog.visible = true;
  termDialog.submitted = false;
}

function editTerm(schedule) {
  termDialog.isEdit = true;
  scheduleStore.setFormData({
    id: schedule.id,
    name: schedule.name,
    description: schedule.description,
    start_date: schedule.start_date,
    end_date: schedule.end_date,
    is_active: schedule.is_active
  });

  termDialog.visible = true;
  termDialog.submitted = false;
}

// Close term dialog
function closeTerm() {
  termDialog.visible = false;
  termDialog.submitted = false;
}

// Save term (create or update)
async function saveTerm() {
  termDialog.submitted = true;

  // Validate form
  if (!scheduleStore.formData.name || !scheduleStore.formData.start_date || !scheduleStore.formData.end_date) {
    return;
  }

  try {
    if (termDialog.isEdit) {
      // Update existing term
      const id = scheduleStore.formData.id;
      const updates = {
        name: scheduleStore.formData.name,
        description: scheduleStore.formData.description,
        start_date: scheduleStore.formData.start_date,
        end_date: scheduleStore.formData.end_date,
        is_active: scheduleStore.formData.is_active
      };

      await scheduleStore.updateSchedule(id, updates);

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Schedule term updated successfully',
        life: 3000
      });
    } else {
      // Create new term
      await scheduleStore.createSchedule(scheduleStore.formData);

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Schedule term created successfully',
        life: 3000
      });
    }

    // Close dialog and reset form
    closeTerm();
    await fetchSchedules();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save schedule term',
      life: 5000
    });
  }
}

// Open duplicate dialog
function openDuplicateModal(schedule) {
  duplicateDialog.sourceSchedule = schedule;

  // Create suggested new term name based on season/year pattern
  let newName = schedule.name;

  // If name has a year pattern (e.g., "Fall 2024"), increment the year
  const yearMatch = schedule.name.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const currentYear = parseInt(yearMatch[1]);
    const nextYear = currentYear + 1;
    newName = schedule.name.replace(yearMatch[1], nextYear.toString());
  } else {
    // Otherwise just append "- Copy"
    newName += ' - Copy';
  }

  // Calculate suggested dates (shift by 1 year if there's a year in the name)
  const startDate = new Date(schedule.start_date);
  const endDate = new Date(schedule.end_date);

  if (yearMatch) {
    startDate.setFullYear(startDate.getFullYear() + 1);
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  // Set form data
  duplicateDialog.formData = {
    sourceScheduleId: schedule.id,
    newName: newName,
    newDescription: schedule.description,
    newStartDate: startDate.toISOString().split('T')[0],
    newEndDate: endDate.toISOString().split('T')[0],
    cloneClasses: true,
    isActive: false
  };

  duplicateDialog.visible = true;
  duplicateDialog.submitted = false;
}

// Duplicate term
async function duplicateTerm() {
  duplicateDialog.submitted = true;

  // Validate form
  if (
    !duplicateDialog.formData.newName ||
    !duplicateDialog.formData.newStartDate ||
    !duplicateDialog.formData.newEndDate
  ) {
    return;
  }

  try {
    await scheduleStore.duplicateSchedule(duplicateDialog.formData);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Schedule term duplicated successfully',
      life: 3000
    });

    // Close dialog
    duplicateDialog.visible = false;
    duplicateDialog.submitted = false;
    await fetchSchedules();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to duplicate schedule term',
      life: 5000
    });
  }
}

// Activate term
async function activateTerm(schedule) {
  try {
    await scheduleStore.setActiveSchedule(schedule.id);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `"${schedule.name}" is now the active term`,
      life: 3000
    });

    await fetchSchedules();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to set active term',
      life: 5000
    });
  }
}

// Navigate to schedule builder
function goToScheduleBuilder(schedule) {
  router.push(`/schedules/${schedule.id}/builder`);
}
</script>
