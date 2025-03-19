<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-primary-800">Teachers</h1>
      <Button label="Add Teacher" icon="pi pi-plus" @click="openNewTeacherModal" />
    </div>

    <div class="card">
      <div class="mb-4 flex items-center gap-2">
        <span class="p-input-icon-left flex-1 max-w-md">
          <i class="pi pi-search" />
          <InputText v-model="searchTerm" placeholder="Search teachers..." class="w-full" />
        </span>

        <Dropdown
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Filter by status"
          class="w-40"
        />
      </div>

      <DataTable
        :value="teachers"
        :loading="loading"
        :paginator="true"
        :rows="10"
        :totalRecords="pagination.totalItems"
        :rowsPerPageOptions="[5, 10, 20, 50]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        responsiveLayout="scroll"
        stripedRows
      >
        <Column field="first_name" header="First Name" sortable></Column>
        <Column field="last_name" header="Last Name" sortable></Column>
        <Column field="email" header="Email" sortable></Column>
        <Column field="phone" header="Phone"></Column>
        <Column field="status" header="Status" sortable>
          <template #body="slotProps">
            <Tag :severity="slotProps.data.status === 'active' ? 'success' : 'danger'" :value="slotProps.data.status" />
          </template>
        </Column>
        <Column header="Actions" :exportable="false">
          <template #body="slotProps">
            <div class="flex gap-2">
              <Button icon="pi pi-eye" class="p-button-text p-button-rounded" @click="viewTeacher(slotProps.data)" />
              <Button
                icon="pi pi-calendar"
                class="p-button-text p-button-rounded p-button-info"
                @click="viewAvailability(slotProps.data)"
                tooltip="View Availability"
              />
              <Button
                icon="pi pi-chart-bar"
                class="p-button-text p-button-rounded p-button-success"
                @click="viewWorkload(slotProps.data)"
                tooltip="View Workload"
              />
              <Button icon="pi pi-pencil" class="p-button-text p-button-rounded" @click="editTeacher(slotProps.data)" />
              <Button
                icon="pi pi-trash"
                class="p-button-text p-button-rounded p-button-danger"
                @click="confirmDeleteTeacher(slotProps.data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- New/Edit Teacher Modal -->
    <Dialog
      v-model:visible="teacherModalVisible"
      :header="modalMode === 'create' ? 'Add Teacher' : 'Edit Teacher'"
      modal
      class="p-fluid"
      :style="{ width: '650px' }"
    >
      <div class="grid grid-cols-2 gap-4">
        <div class="field">
          <label for="first_name">First Name*</label>
          <InputText
            id="first_name"
            v-model="teacherForm.first_name"
            required
            autofocus
            :class="{ 'p-invalid': submitted && !teacherForm.first_name }"
          />
          <small v-if="submitted && !teacherForm.first_name" class="p-error">First name is required.</small>
        </div>
        <div class="field">
          <label for="last_name">Last Name*</label>
          <InputText
            id="last_name"
            v-model="teacherForm.last_name"
            required
            :class="{ 'p-invalid': submitted && !teacherForm.last_name }"
          />
          <small v-if="submitted && !teacherForm.last_name" class="p-error">Last name is required.</small>
        </div>
        <div class="field">
          <label for="email">Email</label>
          <InputText id="email" v-model="teacherForm.email" type="email" />
        </div>
        <div class="field">
          <label for="phone">Phone</label>
          <InputText id="phone" v-model="teacherForm.phone" />
        </div>
        <div class="field col-span-2">
          <label for="bio">Bio</label>
          <Textarea id="bio" v-model="teacherForm.bio" rows="5" />
        </div>
        <!-- Profile Image Upload -->
        <div class="field col-span-2">
          <label for="profile_image">Profile Image</label>
          <div class="flex items-center gap-4">
            <div v-if="teacherForm.profile_image_url" class="w-24 h-24 overflow-hidden rounded-lg">
              <img :src="teacherForm.profile_image_url" alt="Profile" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-24 h-24 flex items-center justify-center bg-gray-100 rounded-lg">
              <i class="pi pi-user text-4xl text-gray-400"></i>
            </div>
            <Button label="Upload Image" icon="pi pi-upload" class="p-button-outlined" />
          </div>
        </div>
        <div class="field col-span-2">
          <label for="status">Status</label>
          <Dropdown
            id="status"
            v-model="teacherForm.status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="closeTeacherModal" />
        <Button label="Save" icon="pi pi-check" @click="saveTeacher" />
      </template>
    </Dialog>

    <!-- View Teacher Details Dialog -->
    <Dialog
      v-model:visible="viewTeacherModalVisible"
      header="Teacher Details"
      modal
      class="p-fluid"
      :style="{ width: '650px' }"
    >
      <div v-if="selectedTeacher" class="grid grid-cols-2 gap-4">
        <div class="flex justify-center col-span-2 mb-4">
          <div v-if="selectedTeacher.profile_image_url" class="w-32 h-32 overflow-hidden rounded-full">
            <img :src="selectedTeacher.profile_image_url" alt="Profile" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-32 h-32 flex items-center justify-center bg-gray-100 rounded-full">
            <i class="pi pi-user text-6xl text-gray-400"></i>
          </div>
        </div>
        <div class="field">
          <label>First Name</label>
          <div class="p-2 bg-gray-50 rounded">{{ selectedTeacher.first_name }}</div>
        </div>
        <div class="field">
          <label>Last Name</label>
          <div class="p-2 bg-gray-50 rounded">{{ selectedTeacher.last_name }}</div>
        </div>
        <div class="field">
          <label>Email</label>
          <div class="p-2 bg-gray-50 rounded">{{ selectedTeacher.email || 'Not provided' }}</div>
        </div>
        <div class="field">
          <label>Phone</label>
          <div class="p-2 bg-gray-50 rounded">{{ selectedTeacher.phone || 'Not provided' }}</div>
        </div>
        <div class="field col-span-2">
          <label>Bio</label>
          <div class="p-2 bg-gray-50 rounded">{{ selectedTeacher.bio || 'No bio available' }}</div>
        </div>
        <div class="field">
          <label>Status</label>
          <div class="p-2">
            <Tag
              :severity="selectedTeacher.status === 'active' ? 'success' : 'danger'"
              :value="selectedTeacher.status"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Close" icon="pi pi-times" @click="viewTeacherModalVisible = false" />
        <Button label="Edit" icon="pi pi-pencil" class="p-button-secondary" @click="editFromViewModal" />
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { useTeacherStore } from '~/stores/teacherStore';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { debounce } from 'lodash';

const teacherStore = useTeacherStore();
const confirm = useConfirm();
const toast = useToast();

const loading = computed(() => teacherStore.loading);
const teachers = computed(() => teacherStore.teachers);
const pagination = computed(() => teacherStore.pagination);
const searchTerm = ref('');
const statusFilter = ref('');
const teacherModalVisible = ref(false);
const viewTeacherModalVisible = ref(false);
const modalMode = ref('create');
const selectedTeacher = ref(null);
const submitted = ref(false);

const teacherForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  bio: '',
  profile_image_url: '',
  status: 'active'
});

const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
];

// Watch for filter changes and refresh data
watch(
  [searchTerm, statusFilter],
  debounce(() => {
    fetchTeachers();
  }, 300)
);

onMounted(() => {
  fetchTeachers();
});

const fetchTeachers = async () => {
  const params = {
    search: searchTerm.value,
    status: statusFilter.value
  };

  await teacherStore.fetchTeachers(params);
};

const openNewTeacherModal = () => {
  teacherForm.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    profile_image_url: '',
    status: 'active'
  };
  modalMode.value = 'create';
  submitted.value = false;
  teacherModalVisible.value = true;
};

const editTeacher = (teacher) => {
  teacherForm.value = { ...teacher };
  modalMode.value = 'edit';
  submitted.value = false;
  teacherModalVisible.value = true;
};

const closeTeacherModal = () => {
  teacherModalVisible.value = false;
  submitted.value = false;
};

const saveTeacher = async () => {
  submitted.value = true;

  // Validate form
  if (!teacherForm.value.first_name || !teacherForm.value.last_name) {
    return;
  }

  try {
    if (modalMode.value === 'create') {
      await teacherStore.createTeacher(teacherForm.value);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Teacher created successfully',
        life: 3000
      });
    } else {
      await teacherStore.updateTeacher(teacherForm.value.id, teacherForm.value);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Teacher updated successfully',
        life: 3000
      });
    }

    closeTeacherModal();
    await fetchTeachers();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save teacher',
      life: 5000
    });
  }
};

const viewTeacher = (teacher) => {
  selectedTeacher.value = { ...teacher };
  viewTeacherModalVisible.value = true;
};

const editFromViewModal = () => {
  viewTeacherModalVisible.value = false;
  editTeacher(selectedTeacher.value);
};

function viewAvailability(teacher) {
  console.log(`/teachers/${teacher.id}/availability`)
  navigateTo(`/teachers/${teacher.id}/availability`)
}

function viewWorkload(teacher) {
  navigateTo(`/teachers/${teacher.id}/workload`)
}

const confirmDeleteTeacher = (teacher) => {
  confirm.require({
    message: `Are you sure you want to delete ${teacher.first_name} ${teacher.last_name}?`,
    header: 'Delete Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteTeacher(teacher.id),
    reject: () => {}
  });
};

const deleteTeacher = async (id) => {
  try {
    await teacherStore.deleteTeacher(id);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Teacher deleted successfully',
      life: 3000
    });
    await fetchTeachers();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete teacher',
      life: 5000
    });
  }
};
</script>
