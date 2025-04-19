<template>
  <div>
    <!-- Import Button -->
    <Button 
      label="Import Performances" 
      icon="pi pi-upload" 
      class="p-button-outlined" 
      @click="openImportDialog" 
    />
    
    <!-- Import Dialog -->
    <Dialog 
      v-model:visible="showDialog" 
      header="Import Performances" 
      :style="{width: '90vw', maxWidth: '1000px'}" 
      modal
      @hide="onHide"
    >
      <div v-if="loading" class="flex justify-center p-6">
        <ProgressSpinner />
      </div>
      
      <div v-else class="import-dialog-content">
        <TabView>
          <TabPanel header="Upload Spreadsheet">
            <RecitalShowPerformanceDataUploader 
              :recital-id="recitalId" 
              :class-instances="classInstances" 
              @upload-complete="handleImportComplete" 
              @cancel="showDialog = false"
            />
          </TabPanel>
          
          <TabPanel header="Paste Program Text">
            <RecitalPerformanceTextParser 
              :recital-id="recitalId" 
              :class-instances="classInstances" 
              @import-complete="handleImportComplete" 
              @cancel="showDialog = false"
            />
          </TabPanel>
        </TabView>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Props
const props = defineProps({
  recitalId: {
    type: String,
    required: true
  }
});

// Emits
const emit = defineEmits(['import-complete']);

// State
const showDialog = ref(false);
const loading = ref(false);
const classInstances = ref([]);

// Methods
function openImportDialog() {
  showDialog.value = true;
  loading.value = true;
  fetchClassInstances();
}

function onHide() {
  // Clean up if needed
}

async function fetchClassInstances() {
  try {
    const client = useSupabaseClient();
    
    const { data, error } = await client
      .from('class_instances')
      .select(`
        id,
        name,
        class_definition:class_definition_id (
          id,
          name,
          dance_style:dance_style_id (
            id,
            name
          )
        )
      `)
      .eq('status', 'active')
      .order('name');
      
    if (error) throw error;
    
    classInstances.value = data.map(instance => ({
      ...instance,
      display_name: `${instance.name || instance.class_definition?.name} (${instance.class_definition?.dance_style?.name || 'Unknown Style'})`
    }));
    
  } catch (err) {
    console.error('Error fetching class instances:', err);
    // Handle error
  } finally {
    loading.value = false;
  }
}

function handleImportComplete(performances) {
  emit('import-complete', performances);
  // Close dialog after a short delay to allow the user to see success message
  setTimeout(() => {
    showDialog.value = false;
  }, 2000);
}
</script>