<template>
 <div class="space-y-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Program Content</h2>
      <div class="flex items-center gap-2">
        <span v-if="isSaving" class="text-sm text-gray-500">Saving...</span>
        <span v-else-if="lastSaved" class="text-sm text-gray-500">Last saved: {{ formatLastSaved() }}</span>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">Artistic Director's Note</h3>
          <Button 
            v-if="needsSave && !autoSave" 
            icon="pi pi-save" 
            label="Save" 
            @click="saveContent" 
            :loading="isSaving"
            size="small"
          />
        </div>
        
        <div class="border rounded-lg overflow-hidden">
          <TipTapEditor
            v-model="artisticDirectorNote"
            height="400px"
            @update:modelValue="onContentChange"
          />
        </div>
      </div>
      
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">Acknowledgments</h3>
          <Button 
            v-if="needsSave && !autoSave" 
            icon="pi pi-save" 
            label="Save" 
            @click="saveContent" 
            :loading="isSaving"
            size="small"
          />
        </div>
        
        <div class="border rounded-lg overflow-hidden">
          <TipTapEditor
            v-model="acknowledgments"
            height="400px"
            @update:modelValue="onContentChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';

// Props
const props = defineProps({
  programContent: {
    type: Object,
    required: true,
    default: () => ({ artisticDirectorNote: '', acknowledgments: '' })
  },
  loading: {
    type: Boolean,
    default: false
  },
  autoSave: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits(['save']);

const artisticDirectorNote = ref(props.programContent?.artistic_director_note || '');
const acknowledgments = ref(props.programContent?.acknowledgments || '');
const needsSave = ref(false);
const isSaving = ref(false);
const lastSaved = ref(null);
const saveTimeout = ref(null);

const toast = useToast();

// Initialize content when programContent changes externally
watch(() => props.programContent, (newContent) => {
  if (newContent) {
    artisticDirectorNote.value = newContent.artistic_director_note || '';
    acknowledgments.value = newContent.acknowledgments || '';
    needsSave.value = false;
  }
}, { deep: true });

// Handle content changes
const onContentChange = () => {
  needsSave.value = true;
  
  if (props.autoSave) {
    if (saveTimeout.value) {
      clearTimeout(saveTimeout.value);
    }
    
    // Debounce save to avoid too many API calls
    saveTimeout.value = setTimeout(() => {
      saveContent();
    }, 2000);
  }
};

// Save content to parent
const saveContent = async () => {
  if (!needsSave.value) return;
  
  try {
    isSaving.value = true;
    
    const content = {
      artistic_director_note: artisticDirectorNote.value,
      acknowledgments: acknowledgments.value
    };
    
    // Let parent handle the actual API call
    await emit('save', content);
    
    needsSave.value = false;
    lastSaved.value = new Date();
    
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Program content updated successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error saving program content:', error);
    
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save program content',
      life: 3000
    });
  } finally {
    isSaving.value = false;
  }
};

// Format last saved time
const formatLastSaved = () => {
  if (!lastSaved.value) return '';
  
  const now = new Date();
  const diff = now - lastSaved.value;
  
  // If less than a minute ago
  if (diff < 60000) {
    return 'Just now';
  }
  
  // If less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  // Return formatted time
  return lastSaved.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Clear the timeout when component is unmounted
onBeforeUnmount(() => {
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value);
  }
  
  // If there are unsaved changes, save them before unmounting
  if (needsSave.value) {
    saveContent();
  }
});
</script>