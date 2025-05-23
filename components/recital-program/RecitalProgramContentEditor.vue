<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Program Content</h2>
      <div class="flex items-center gap-2">
        <span v-if="isSaving" class="text-sm text-gray-500">Saving...</span>
        <span v-else-if="lastSaved" class="text-sm text-gray-500">Last saved: {{ formatLastSaved() }}</span>
      </div>
    </div>
    
    <div v-if="loading" class="p-4 flex justify-center">
      <ProgressSpinner style="width: 50px; height: 50px" />
    </div>
    
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">Artistic Director's Note</h3>
          <Button 
            icon="pi pi-save" 
            label="Save" 
            @click="saveArtisticDirectorNote" 
            :loading="isSaving"
            size="small"
          />
        </div>
        
        <div class="border rounded-lg overflow-hidden">
          <TipTapEditor
            v-model="artisticDirectorNote"
            height="400px"
            placeholder="Enter the artistic director's note here..."
            @update:modelValue="onArtisticNoteChange"
          />
        </div>
        <small class="text-red-500" v-if="errors.artisticDirectorNote">{{ errors.artisticDirectorNote }}</small>
      </div>
      
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">Acknowledgments</h3>
          <Button 
            icon="pi pi-save" 
            label="Save" 
            @click="saveAcknowledgments" 
            :loading="isSaving"
            size="small"
          />
        </div>
        
        <div class="border rounded-lg overflow-hidden">
          <TipTapEditor
            v-model="acknowledgments"
            height="400px"
            placeholder="Enter acknowledgments here..."
            @update:modelValue="onAcknowledgmentsChange"
          />
        </div>
        <small class="text-red-500" v-if="errors.acknowledgments">{{ errors.acknowledgments }}</small>
      </div>
    </div>

    <div class="flex justify-end mt-4">
      <Button 
        label="Save All Content" 
        icon="pi pi-save" 
        @click="saveAllContent" 
        :loading="isSaving"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

// Props
const props = defineProps({
  programContent: {
    type: Object,
    required: true,
    default: () => ({ 
      artistic_director_note: '', 
      acknowledgments: '' 
    })
  },
  loading: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['save']);

// Set up reactive state with safe defaults
const artisticDirectorNote = ref('<p></p>');
const acknowledgments = ref('<p></p>');
const isSaving = ref(false);
const lastSaved = ref(null);
const errors = ref({
  artisticDirectorNote: '',
  acknowledgments: ''
});

const toast = useToast();

// Initialize content on mount
onMounted(() => {
  if (props.programContent) {
    artisticDirectorNote.value = props.programContent.artisticDirectorNote || '<p></p>';
    acknowledgments.value = props.programContent.acknowledgments || '<p></p>';
  }
});

// Watch for programContent changes
watch(() => props.programContent, (newContent) => {
  console.log("programContent changed:", newContent);
  
  if (newContent) {
    if (newContent.artistic_director_note) {
      artisticDirectorNote.value = newContent.artistic_director_note;
      console.log("Updated artistic note from props:", artisticDirectorNote.value);
    }
    
    if (newContent.acknowledgments) {
      acknowledgments.value = newContent.acknowledgments;
      console.log("Updated acknowledgments from props:", acknowledgments.value);
    }
  }
}, { deep: true, immediate: true });

// Handle content changes
const onArtisticNoteChange = () => {
  errors.value.artisticDirectorNote = '';
};

const onAcknowledgmentsChange = () => {
  errors.value.acknowledgments = '';
};

// Helper function to check if content is empty
const isContentEmpty = (content) => {
  if (!content) return true;
  
  // Remove HTML tags to check if there's actual content
  const div = document.createElement('div');
  div.innerHTML = content;
  const text = div.textContent || div.innerText || '';
  return text.trim() === '';
};

// Prepare content for saving
const prepareContentForSave = (content) => {
  if (isContentEmpty(content)) {
    return '<p>Not provided</p>';
  }
  return content;
};

// Save artistic director's note
const saveArtisticDirectorNote = async () => {
  try {
    isSaving.value = true;
    errors.value.artisticDirectorNote = '';
    
    const preparedContent = prepareContentForSave(artisticDirectorNote.value);
    
    // Save just the artistic director's note
    await emit('save', {
      artistic_director_note: preparedContent,
      acknowledgments: undefined // undefined means don't update this field
    });
    
    lastSaved.value = new Date();
    
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Artistic Director\'s Note updated successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error saving artistic director\'s note:', error);
    errors.value.artisticDirectorNote = 'Failed to save: Please ensure content is not empty';
    
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save Artistic Director\'s Note',
      life: 3000
    });
  } finally {
    isSaving.value = false;
  }
};

// Save acknowledgments
const saveAcknowledgments = async () => {
  try {
    isSaving.value = true;
    errors.value.acknowledgments = '';
    
    const preparedContent = prepareContentForSave(acknowledgments.value);
    
    // Save just the acknowledgments
    await emit('save', {
      artistic_director_note: undefined, // undefined means don't update this field
      acknowledgments: preparedContent
    });
    
    lastSaved.value = new Date();
    
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Acknowledgments updated successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error saving acknowledgments:', error);
    errors.value.acknowledgments = 'Failed to save: Please ensure content is not empty';
    
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save Acknowledgments',
      life: 3000
    });
  } finally {
    isSaving.value = false;
  }
};

// Save all content
const saveAllContent = async () => {
  try {
    isSaving.value = true;
    errors.value = { artisticDirectorNote: '', acknowledgments: '' };
    
    const content = {
      artistic_director_note: prepareContentForSave(artisticDirectorNote.value),
      acknowledgments: prepareContentForSave(acknowledgments.value)
    };
    
    // Log the content we're saving
    console.log("Saving content:", content);
    
    // Let parent handle the actual API call
    await emit('save', content);
    
    lastSaved.value = new Date();
    
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'All program content updated successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error saving program content:', error);
    
    // Attempt to identify which section had the error
    if (error.message && error.message.includes('artistic')) {
      errors.value.artisticDirectorNote = 'Failed to save: Please ensure content is not empty';
    } else if (error.message && error.message.includes('acknowledgments')) {
      errors.value.acknowledgments = 'Failed to save: Please ensure content is not empty';
    } else {
      // Generic error for both
      errors.value = {
        artisticDirectorNote: 'Failed to save content',
        acknowledgments: 'Failed to save content'
      };
    }
    
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save program content. Please check for errors.',
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
</script>