<template>
  <div>
    <!-- Publication Status Badge -->
    <div v-if="schedule" class="flex items-center mb-2">
      <span
        class="inline-flex items-center px-2 py-1 mr-2 rounded text-xs font-medium"
        :class="statusClass"
      >
        {{ formattedStatus }}
      </span>
      <span v-if="schedule.published_version > 0" class="text-xs text-gray-500">
        v{{ schedule.published_version }} - 
        Published {{ formatDate(schedule.published_at) }}
      </span>
    </div>

    <!-- Publication Actions -->
    <div class="flex space-x-2">
      <Button
        v-if="canPublish"
        label="Publish Schedule"
        icon="pi pi-check-circle"
        class="p-button-success"
        @click="openPublishDialog"
        :loading="loading"
        :disabled="!hasPermission"
      />
      
      <Button
        v-if="isPublished"
        label="Unpublish"
        icon="pi pi-times-circle"
        class="p-button-outlined p-button-danger"
        @click="confirmUnpublish"
        :loading="loading"
        :disabled="!hasPermission"
      />
      
      <Button
        v-if="hasHistory"
        label="View History"
        icon="pi pi-history"
        class="p-button-outlined"
        @click="openHistoryDialog"
      />
    </div>

    <!-- Publish Confirmation Dialog -->
    <Dialog
      v-model:visible="publishDialog.visible"
      :style="{ width: '450px' }"
      header="Publish Schedule"
      :modal="true"
      :closable="true"
    >
      <div class="space-y-4">
        <div v-if="isRevision" class="bg-yellow-50 border border-yellow-200 rounded p-3">
          <div class="flex items-start">
            <i class="pi pi-exclamation-triangle text-yellow-500 mt-1 mr-2"></i>
            <div>
              <h4 class="text-yellow-800 font-medium">This is a revision</h4>
              <p class="text-yellow-700 text-sm">
                Publishing will update the existing published schedule with these changes.
              </p>
            </div>
          </div>
        </div>
        
        <div class="field">
          <label for="publishNotes" class="font-medium">Publication Notes</label>
          <Textarea
            id="publishNotes"
            v-model="publishDialog.notes"
            rows="3"
            placeholder="Add notes about what changed in this version (optional)"
            class="w-full"
          ></Textarea>
        </div>
        
        <div class="flex items-start">
          <Checkbox
            v-model="publishDialog.sendNotifications"
            :binary="true"
            id="sendNotifications"
          />
          <label for="sendNotifications" class="ml-2">
            <span class="font-medium">Send notifications</span>
            <p class="text-sm text-gray-500">
              Notify relevant staff and teachers about this schedule update.
            </p>
          </label>
        </div>
      </div>
      
      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="publishDialog.visible = false"
        />
        <Button
          label="Publish"
          icon="pi pi-check"
          class="p-button-success"
          @click="publishSchedule"
          :loading="loading"
        />
      </template>
    </Dialog>

    <!-- History Dialog -->
    <Dialog
      v-model:visible="historyDialog.visible"
      :style="{ width: '600px' }"
      header="Publication History"
      :modal="true"
      :closable="true"
    >
      <div v-if="loading" class="flex justify-center p-4">
        <i class="pi pi-spin pi-spinner text-2xl"></i>
      </div>
      
      <div v-else class="space-y-4">
        <Timeline :value="publishHistory">
          <template #content="slotProps">
            <div class="text-sm">
              <div class="font-medium">Version {{ slotProps.item.version }}</div>
              <div class="text-gray-500">
                {{ formatDateTime(slotProps.item.published_at) }} by 
                {{ getPublisherName(slotProps.item) }}
              </div>
              <div v-if="slotProps.item.notes" class="p-2 bg-gray-50 rounded mt-2 text-gray-700">
                {{ slotProps.item.notes }}
              </div>
            </div>
          </template>
          <template #opposite="slotProps">
            <div 
              class="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs"
              :class="{'bg-primary-500': slotProps.index === 0, 'bg-gray-400': slotProps.index !== 0}"
            >
              v{{ slotProps.item.version }}
            </div>
          </template>
        </Timeline>
        
        <div v-if="!publishHistory.length" class="text-center text-gray-500 py-4">
          No publication history available.
        </div>
      </div>
    </Dialog>

    <!-- Unpublish Confirmation Dialog -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useScheduleTermStore } from '~/stores/useScheduleTermStore';
import { useAuthStore } from '~/stores/auth';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const props = defineProps({
  scheduleId: {
    type: String,
    required: true
  },
  hasPermission: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['published', 'unpublished']);

// State
const scheduleTermStore = useScheduleTermStore();
const authStore = useAuthStore();
const toast = useToast();
const confirm = useConfirm();

const loading = ref(false);
const publishDialog = ref({
  visible: false,
  notes: '',
  sendNotifications: true
});
const historyDialog = ref({
  visible: false
});

// Computed properties
const schedule = computed(() => scheduleTermStore.currentSchedule);
const publishHistory = computed(() => scheduleTermStore.publishHistory || []);
const canPublish = computed(() => scheduleTermStore.canPublish);
const isPublished = computed(() => schedule.value?.publication_status === 'published');
const isRevision = computed(() => schedule.value?.publication_status === 'revision');
const hasHistory = computed(() => 
  schedule.value?.published_version > 0 || 
  (publishHistory.value && publishHistory.value.length > 0)
);

const statusClass = computed(() => {
  if (!schedule.value) return '';
  
  const statusMap = {
    'draft': 'bg-gray-100 text-gray-800',
    'revision': 'bg-yellow-100 text-yellow-800',
    'published': 'bg-green-100 text-green-800'
  };
  
  return statusMap[schedule.value.publication_status] || 'bg-gray-100 text-gray-800';
});

const formattedStatus = computed(() => {
  if (!schedule.value) return '';
  
  const statusLabels = {
    'draft': 'Draft',
    'revision': 'Revision',
    'published': 'Published'
  };
  
  return statusLabels[schedule.value.publication_status] || 'Draft';
});

// Watch for schedule ID changes
watch(() => props.scheduleId, async (newId) => {
  if (newId) {
    await loadScheduleData(newId);
  }
});

onMounted(async () => {
  if (props.scheduleId) {
    await loadScheduleData(props.scheduleId);
  }
});

// Functions
async function loadScheduleData(scheduleId) {
  try {
    loading.value = true;
    await scheduleTermStore.fetchSchedule(scheduleId);
    
    // Load publication history if it exists
    if (schedule.value?.published_version > 0) {
      await scheduleTermStore.fetchPublishHistory(scheduleId);
    }
  } catch (error) {
    console.error('Error loading schedule data for publication:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load schedule publication data',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
}

function openPublishDialog() {
  publishDialog.value = {
    visible: true,
    notes: '',
    sendNotifications: true
  };
}

function openHistoryDialog() {
  historyDialog.value.visible = true;
}

async function publishSchedule() {
  try {
    loading.value = true;
    
    // Prepare publication options
    const options = {
      notes: publishDialog.value.notes,
      send_notifications: publishDialog.value.sendNotifications
    };
    
    // Publish the schedule
    await scheduleTermStore.publishSchedule(props.scheduleId, options);
    
    // Close the dialog
    publishDialog.value.visible = false;
    
    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Schedule published successfully',
      life: 3000
    });
    
    // Emit event
    emit('published');
  } catch (error) {
    console.error('Error publishing schedule:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to publish schedule',
      life: 5000
    });
  } finally {
    loading.value = false;
  }
}

function confirmUnpublish() {
  confirm.require({
    message: 'Unpublishing will return this schedule to draft status. Continue?',
    header: 'Confirm Unpublish',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        loading.value = true;
        await scheduleTermStore.unpublishSchedule(props.scheduleId);
        
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Schedule unpublished successfully',
          life: 3000
        });
        
        // Emit event
        emit('unpublished');
      } catch (error) {
        console.error('Error unpublishing schedule:', error);
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to unpublish schedule',
          life: 5000
        });
      } finally {
        loading.value = false;
      }
    }
  });
}

function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function formatDateTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function getPublisherName(historyItem) {
  if (!historyItem.profiles) return 'Unknown';
  
  return `${historyItem.profiles.first_name} ${historyItem.profiles.last_name}`;
}
</script>