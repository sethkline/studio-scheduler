<template>
  <div class="program-content-editor">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Artistic Director's Note -->
      <div class="card p-4">
        <h3 class="text-lg font-semibold mb-3">Artistic Director's Note</h3>
        <p class="text-sm text-gray-600 mb-3">
          Write a welcome message or artistic statement from the director that will appear in the program.
        </p>
        
        <div class="mb-3">
          <TipTapEditor
            v-model="localContent.artisticDirectorNote"
            :height="'320px'"
            :editable="true"
          />
        </div>
      </div>
      
      <!-- Acknowledgments -->
      <div class="card p-4">
        <h3 class="text-lg font-semibold mb-3">Acknowledgments</h3>
        <p class="text-sm text-gray-600 mb-3">
          Add acknowledgments, thank you notes, and special mentions for the recital.
        </p>
        
        <div class="mb-3">
          <TipTapEditor
            v-model="localContent.acknowledgments"
            :height="'320px'"
            :editable="true"
          />
        </div>
      </div>
    </div>
    
    <div class="flex justify-end mt-4">
      <Button 
        label="Save Content" 
        icon="pi pi-save" 
        @click="saveContent" 
        :loading="loading"
        :disabled="!hasChanges"
      />
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
  }
});

// Emits
const emit = defineEmits(['save']);

// Local state
const localContent = ref({
  artisticDirectorNote: props.programContent.artisticDirectorNote || '',
  acknowledgments: props.programContent.acknowledgments || ''
});

// Computed properties
const hasChanges = computed(() => {
  return localContent.value.artisticDirectorNote !== props.programContent.artisticDirectorNote ||
         localContent.value.acknowledgments !== props.programContent.acknowledgments;
});

// Watch for prop changes
watch(() => props.programContent, (newContent) => {
  localContent.value = {
    artisticDirectorNote: newContent.artisticDirectorNote || '',
    acknowledgments: newContent.acknowledgments || ''
  };
}, { deep: true });

// Auto-save timer
let autoSaveTimer = null;

// Watch for content changes
watch(localContent, () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  
  // Auto-save after 2 seconds of inactivity
  autoSaveTimer = setTimeout(() => {
    if (hasChanges.value) {
      saveContent();
    }
  }, 2000);
}, { deep: true });

// Clean up when component is unmounted
onBeforeUnmount(() => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
});

// Methods
function saveContent() {
  emit('save', {
    artisticDirectorNote: localContent.value.artisticDirectorNote,
    acknowledgments: localContent.value.acknowledgments
  });
}
</script>