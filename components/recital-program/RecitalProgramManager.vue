<template>
  <div class="recital-program-manager">
    <div class="card mb-4">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold text-primary-800">{{ recital?.name }} Program</h1>
        <div class="flex gap-2">
          <Button 
            label="Preview" 
            icon="pi pi-eye" 
            class="p-button-outlined" 
            @click="showPreview = true" 
            :disabled="loading.program" 
          />
          <Button 
            label="Generate PDF" 
            icon="pi pi-file-pdf" 
            @click="generatePdf" 
            :loading="loading.generating" 
            :disabled="loading.program" 
          />
        </div>
      </div>

      <ProgressSpinner v-if="loading.program" class="w-8 h-8 mx-auto my-4" />
    </div>

    <div v-if="!loading.program">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="performances">Performances</Tab>
          <Tab value="content">Program Content</Tab>
          <Tab value="cover">Cover & Design</Tab>
          <Tab value="ads">Advertisements</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel value="performances">
            <RecitalProgramPerformanceOrderManager 
              :performances="performances"
              :loading="loading.saving"
              @save="savePerformanceOrder"
              @update-performance="updatePerformance"
            />
          </TabPanel>
          
          <TabPanel value="content">
            <RecitalProgramContentEditor 
              :program-content="programContent"
              :loading="loading.saving" 
              @save="saveProgramContent"
            />
          </TabPanel>
          
          <TabPanel value="cover">
            <RecitalProgramCoverImageUploader 
              :cover-image="program?.cover_image_url"
              :loading="loading.saving"
              @upload="uploadCoverImage"
            />
          </TabPanel>
          
          <TabPanel value="ads">
            <RecitalProgramAdvertisementManager 
              :advertisements="advertisements"
              :loading="loading.saving"
              @add="addAdvertisement"
              @update="updateAdvertisement"
              @delete="deleteAdvertisement"
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>

    <!-- Program Preview Dialog -->
    <Dialog 
      v-model:visible="showPreview" 
      modal 
      header="Program Preview" 
      :style="{width: '90vw', height: '90vh'}" 
      :maximizable="true"
    >
      <RecitalProgramPreview 
        :recital="recital"
        :program="program"
        :performances="performances"
        :advertisements="advertisements"
        @generate-pdf="generatePdf"
      />
    </Dialog>
    
    <!-- Error Toast -->
    <Toast position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { useRecitalProgramStore } from '~/stores/recitalProgramStore';
import { useToast } from 'primevue/usetoast';

// Import the new Tab components
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';

// Props
const props = defineProps({
  recitalId: {
    type: String,
    required: true
  }
});

// Component refs
const toast = useToast();
const programStore = useRecitalProgramStore();
const showPreview = ref(false);
const activeTab = ref('performances'); // Default active tab

// Computed properties
const recital = computed(() => programStore.recital);
const program = computed(() => programStore.program);
const performances = computed(() => programStore.orderedPerformances);
const advertisements = computed(() => programStore.orderedAdvertisements);
const loading = computed(() => programStore.loading);
const programContent = computed(() => ({
  artisticDirectorNote: program.value?.artistic_director_note || '',
  acknowledgments: program.value?.acknowledgments || ''
}));

// Load program data on component mount
onMounted(async () => {
  await loadProgramData();
});

// Methods
async function loadProgramData() {
  const result = await programStore.fetchProgram(props.recitalId);
  
  if (!result) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: programStore.error || 'Failed to load program data',
      life: 3000
    });
  }
}

async function savePerformanceOrder(updatedPerformances) {
  const result = await programStore.savePerformanceOrder(props.recitalId, updatedPerformances);
  
  if (result) {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Performance order saved successfully',
      life: 3000
    });
  } else {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: programStore.error || 'Failed to save performance order',
      life: 3000
    });
  }
}

async function updatePerformance(performanceId, performanceData) {
  const result = await programStore.updatePerformance(
    props.recitalId, 
    performanceId, 
    performanceData
  );
  
  if (result) {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Performance updated successfully',
      life: 3000
    });
  } else {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: programStore.error || 'Failed to update performance',
      life: 3000
    });
  }
}

async function saveProgramContent(content) {
  const result = await programStore.saveProgramContent(props.recitalId, content);
  
  if (result) {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Program content saved successfully',
      life: 3000
    });
  } else {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: programStore.error || 'Failed to save program content',
      life: 3000
    });
  }
}

async function uploadCoverImage(imageFile) {
  const result = await programStore.uploadCoverImage(props.recitalId, imageFile);
  
  if (result) {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Cover image uploaded successfully',
      life: 3000
    });
  } else {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: programStore.error || 'Failed to upload cover image',
      life: 3000
    });
  }
}

async function addAdvertisement(advertisementData) {
  const result = await programStore.addAdvertisement(props.recitalId, advertisementData);
  
  if (result) {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Advertisement added successfully',
      life: 3000
    });
  } else {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: programStore.error || 'Failed to add advertisement',
      life: 3000
    });
  }
}

async function updateAdvertisement(adId, advertisementData) {
  const result = await programStore.updateAdvertisement(
    props.recitalId, 
    adId, 
    advertisementData
  );
  
  if (result) {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Advertisement updated successfully',
      life: 3000
    });
  } else {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: programStore.error || 'Failed to update advertisement',
      life: 3000
    });
  }
}

async function deleteAdvertisement(adId) {
  const result = await programStore.deleteAdvertisement(props.recitalId, adId);
  
  if (result) {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Advertisement deleted successfully',
      life: 3000
    });
  } else {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: programStore.error || 'Failed to delete advertisement',
      life: 3000
    });
  }
}

async function generatePdf() {
  const result = await programStore.generatePdf(props.recitalId);
  
  if (!result) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: programStore.error || 'Failed to generate PDF',
      life: 3000
    });
  }
}
</script>