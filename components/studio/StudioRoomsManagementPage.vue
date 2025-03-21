<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">Studio Rooms</h1>
        <p v-if="location" class="text-gray-600">
          {{ location.name }} Location
          <NuxtLink :to="`/studio/locations`" class="text-primary-600 hover:underline ml-2">
            <i class="pi pi-arrow-left text-xs"></i> Back to Locations
          </NuxtLink>
        </p>
      </div>
      <Button label="Add Room" icon="pi pi-plus" @click="openNewRoomDialog" />
    </div>

    <div v-if="loading" class="flex justify-center my-8">
      <i class="pi pi-spin pi-spinner text-2xl"></i>
    </div>

    <div v-else-if="rooms.length === 0" class="card text-center py-12">
      <i class="pi pi-th-large text-5xl text-gray-300 mb-3"></i>
      <h3 class="text-xl font-semibold text-gray-500">No Rooms Found</h3>
      <p class="text-gray-400 mt-2 mb-6">
        You haven't added any studio rooms to this location yet.
      </p>
      <Button label="Add Your First Room" icon="pi pi-plus" @click="openNewRoomDialog" />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="room in rooms" :key="room.id" class="card">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-xl font-bold">{{ room.name }}</h3>
            <Badge v-if="room.is_active" value="Active" severity="success" class="mt-1" />
            <Badge v-else value="Inactive" severity="warning" class="mt-1" />
          </div>
          <Menu :model="getRoomMenuItems(room)" :popup="true">
            <template #trigger="{ toggle, id }">
              <Button icon="pi pi-ellipsis-v" class="p-button-text p-button-sm" @click="toggle($event, id)" />
            </template>
          </Menu>
        </div>

        <p v-if="room.description" class="text-gray-600 mt-3">{{ room.description }}</p>

        <div class="mt-4 space-y-2">
          <div v-if="room.capacity" class="flex items-center">
            <i class="pi pi-users mr-2 text-gray-500"></i>
            <div>Capacity: {{ room.capacity }} students</div>
          </div>

          <div v-if="room.area_sqft" class="flex items-center">
            <i class="pi pi-th-large mr-2 text-gray-500"></i>
            <div>Area: {{ room.area_sqft }} sq ft</div>
          </div>

          <div v-if="room.features && room.features.length > 0" class="mt-3">
            <div class="text-sm font-semibold mb-1">Features:</div>
            <div class="flex flex-wrap gap-1">
              <Chip v-for="(feature, index) in room.features" :key="index" :label="feature" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New/Edit Room Dialog -->
    <Dialog
      v-model:visible="roomDialog.visible"
      :header="roomDialog.isNew ? 'Add Room' : 'Edit Room'"
      :modal="true"
      :closable="true"
      :style="{ width: '90%', maxWidth: '600px' }"
      class="room-dialog"
    >
      <form @submit.prevent="saveRoom" class="space-y-4">
        <div>
          <label for="roomName" class="label">Room Name*</label>
          <InputText
            id="roomName"
            v-model="roomDialog.form.name"
            class="w-full"
            :class="{ 'p-invalid': roomDialog.errors.name }"
            required
          />
          <small v-if="roomDialog.errors.name" class="p-error">{{ roomDialog.errors.name }}</small>
        </div>

        <div>
          <label for="roomDescription" class="label">Description</label>
          <Textarea id="roomDescription" v-model="roomDialog.form.description" rows="3" class="w-full" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="roomCapacity" class="label">Capacity (students)</label>
            <InputNumber
              id="roomCapacity"
              v-model="roomDialog.form.capacity"
              class="w-full"
              min="0"
              showButtons
            />
          </div>

          <div>
            <label for="roomArea" class="label">Area (sq ft)</label>
            <InputNumber id="roomArea" v-model="roomDialog.form.areaSqft" class="w-full" min="0" showButtons />
          </div>
        </div>

        <div>
          <label for="roomFeatures" class="label">Features</label>
          <Chips v-model="roomDialog.form.features" class="w-full" />
          <small class="text-gray-500">Enter a feature and press Enter to add</small>
        </div>

        <div class="flex items-center">
          <Checkbox v-model="roomDialog.form.isActive" :binary="true" inputId="roomActive" />
          <label for="roomActive" class="ml-2">Active</label>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <Button
            label="Cancel"
            type="button"
            class="p-button-text"
            @click="roomDialog.visible = false"
            :disabled="roomDialog.saving"
          />
          <Button label="Save" type="submit" :loading="roomDialog.saving" />
        </div>
      </form>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useStudioStore } from '~/stores/studio';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useRoute, useRouter } from 'vue-router';

// Component setup
definePageMeta({
  layout: 'default',
  middleware: ['auth']
});

// Store and services
const studioStore = useStudioStore();
const toast = useToast();
const confirm = useConfirm();
const route = useRoute();
const router = useRouter();

// State
const loading = ref(true);
const location = ref(null);
const rooms = ref([]);
const locationId = route.params.id;

// Room dialog state
const roomDialog = reactive({
  visible: false,
  isNew: true,
  saving: false,
  form: {
    id: null,
    locationId: locationId,
    name: '',
    description: '',
    capacity: null,
    areaSqft: null,
    features: [],
    isActive: true
  },
  errors: {}
});

// Load data
onMounted(async () => {
  if (!locationId) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No location ID provided',
      life: 3000
    });
    router.push('/studio/locations');
    return;
  }

  try {
    loading.value = true;

    // Fetch location details
    const locationData = await studioStore.fetchLocationById(locationId);
    location.value = locationData;

    // Fetch rooms for this location
    const roomsData = await studioStore.fetchRoomsByLocation(locationId);
    rooms.value = roomsData || [];
  } catch (error) {
    console.error('Error loading rooms:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load studio rooms.',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
});

// Actions
const openNewRoomDialog = () => {
  roomDialog.isNew = true;
  roomDialog.form = {
    id: null,
    locationId: locationId,
    name: '',
    description: '',
    capacity: null,
    areaSqft: null,
    features: [],
    isActive: true
  };
  roomDialog.errors = {};
  roomDialog.visible = true;
};

const openEditRoomDialog = (room) => {
  roomDialog.isNew = false;
  roomDialog.form = {
    id: room.id,
    locationId: locationId,
    name: room.name,
    description: room.description || '',
    capacity: room.capacity,
    areaSqft: room.area_sqft,
    features: room.features || [],
    isActive: room.is_active
  };
  roomDialog.errors = {};
  roomDialog.visible = true;
};

const validateRoomForm = () => {
  const errors = {};

  if (!roomDialog.form.name.trim()) {
    errors.name = 'Room name is required';
  }

  roomDialog.errors = errors;
  return Object.keys(errors).length === 0;
};

const saveRoom = async () => {
  if (!validateRoomForm()) return;

  try {
    roomDialog.saving = true;

    if (roomDialog.isNew) {
      // Create new room
      const newPlayload = {
        locationId: locationId,
        ...roomDialog.form
      }
      const result = await studioStore.createRoom(newPlayload);

      if (result) {
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Room has been created successfully.',
          life: 3000
        });

        // Refresh rooms list
        const refreshedData = await studioStore.fetchRoomsByLocation(locationId);
        rooms.value = refreshedData || [];

        roomDialog.visible = false;
      } else {
        throw new Error('Failed to create room');
      }
    } else {
      // Update existing room
      const result = await studioStore.updateRoom(roomDialog.form.id, roomDialog.form);

      if (result) {
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Room has been updated successfully.',
          life: 3000
        });

        // Update in the rooms list
        const index = rooms.value.findIndex((r) => r.id === roomDialog.form.id);
        if (index !== -1) {
          rooms.value[index] = { ...rooms.value[index], ...result };
        }

        roomDialog.visible = false;
      } else {
        throw new Error('Failed to update room');
      }
    }
  } catch (error) {
    console.error('Error saving room:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save room.',
      life: 3000
    });
  } finally {
    roomDialog.saving = false;
  }
};

const confirmDeleteRoom = (room) => {
  confirm.require({
    message: `Are you sure you want to delete the room "${room.name}"?`,
    header: 'Delete Room',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteRoom(room.id),
    reject: () => {}
  });
};

const deleteRoom = async (id) => {
  try {
    loading.value = true;

    const result = await studioStore.deleteRoom(id);

    if (result) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Room has been deleted successfully.',
        life: 3000
      });

      // Remove from local list
      rooms.value = rooms.value.filter((r) => r.id !== id);
    } else {
      throw new Error('Failed to delete room');
    }
  } catch (error) {
    console.error('Error deleting room:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to delete room. It may be in use.',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const getRoomMenuItems = (room) => {
  return [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: () => openEditRoomDialog(room)
    },
    {
      label: room.is_active ? 'Deactivate' : 'Activate',
      icon: room.is_active ? 'pi pi-times' : 'pi pi-check',
      command: () => toggleRoomStatus(room)
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: () => confirmDeleteRoom(room)
    }
  ];
};

const toggleRoomStatus = async (room) => {
  try {
    loading.value = true;

    const result = await studioStore.updateRoom(room.id, {
      isActive: !room.is_active
    });

    if (result) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `Room has been ${result.is_active ? 'activated' : 'deactivated'}.`,
        life: 3000
      });

      // Update in the rooms list
      const index = rooms.value.findIndex((r) => r.id === room.id);
      if (index !== -1) {
        rooms.value[index] = { ...rooms.value[index], is_active: !room.is_active };
      }
    } else {
      throw new Error('Failed to update room status');
    }
  } catch (error) {
    console.error('Error updating room status:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update room status.',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};
</script>