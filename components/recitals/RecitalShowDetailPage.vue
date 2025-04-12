<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-bold">Program Management</h1>
        <div v-if="showData" class="text-gray-600">
          {{ showData.name }} - {{ formatDate(showData.date) }} {{ formatTime(showData.start_time) }}
        </div>
      </div>
      
      <div class="flex gap-2">
        <Button 
          label="Back to Shows" 
          icon="pi pi-arrow-left" 
          outlined
          @click="router.push(`/recitals/series/${showData?.series_id}`)"
        />
        <Button 
          label="Generate PDF" 
          icon="pi pi-file-pdf" 
          severity="success"
          @click="generatePDF"
          :loading="generatingPDF"
        />
        <Button 
          label="Preview" 
          icon="pi pi-eye" 
          @click="showPreview = true"
        />
      </div>
    </div>
    
    <div v-if="loading" class="flex justify-center p-6">
      <i class="pi pi-spin pi-spinner text-2xl"></i>
    </div>
    
    <div v-else>
      <TabView>
        <TabPanel header="Cover & Details">
          <CoverImageUploader
            :coverImage="programData?.cover_image_url"
            :loading="uploading"
            @upload="uploadCover"
            @remove="removeCover"
          />
        </TabPanel>
        
        <TabPanel header="Performance Order">
          <PerformanceOrderManager
            :performances="performances"
            :loading="updatingPerformances"
            @save="savePerformanceOrder"
            @update-performance="updatePerformanceDetails"
          />
        </TabPanel>
        
        <TabPanel header="Program Content">
          <ProgramContentEditor
            :programContent="programContentData"
            :loading="savingContent"
            @save="saveProgramContent"
          />
        </TabPanel>
        
        <TabPanel header="Advertisements">
          <AdvertisementManager
            :advertisements="advertisements"
            :loading="managingAds"
            @add="addAdvertisement"
            @update="updateAdvertisement"
            @delete="deleteAdvertisement"
          />
        </TabPanel>
      </TabView>
    </div>
    
    <!-- Program Preview Modal -->
    <Dialog 
      v-model:visible="showPreview" 
      header="Program Preview" 
      modal 
      maximizable
      class="w-full md:w-4/5 lg:w-3/4"
    >
      <ProgramPreview
        :recital="showData"
        :program="programData"
        :performances="performances"
        :advertisements="advertisements"
        @generate-pdf="generatePDF"
      />
    </Dialog>
  </div>
</template>

<script setup>
import { useToast } from 'primevue/usetoast';

const route = useRoute();
const router = useRouter();
const showId = computed(() => route.params.id);

// State
const showData = ref(null);
const programData = ref(null);
const performances = ref([]);
const advertisements = ref([]);
const showPreview = ref(false);

// Loading states
const loading = ref(true);
const uploading = ref(false);
const updatingPerformances = ref(false);
const savingContent = ref(false);
const managingAds = ref(false);
const generatingPDF = ref(false);

// Services
const toast = useToast();
const { 
  fetchRecitalShowById,
  fetchRecitalProgram, 
  updateProgramDetails,
  uploadCoverImage,
  updateProgramContentByType,
  updatePerformanceOrder,
  updatePerformance,
  generateProgramPDF
} = useApiService();

// Computed
const programContentData = computed(() => {
  if (!programData.value) return { artistic_director_note: '', acknowledgments: '' };
  
  return {
    artistic_director_note: programData.value.artistic_director_note || '',
    acknowledgments: programData.value.acknowledgments || ''
  };
});

// Format functions
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString();
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Load data
const loadData = async () => {
  loading.value = true;
  try {
    // Load show details
    const { data: showResponse, error: showError } = await fetchRecitalShowById(showId.value);
    
    if (showError.value) {
      throw new Error(showError.value.message || 'Failed to load show details');
    }
    
    showData.value = showResponse.value.show;
    
    // Load program data
    const { data: programResponse, error: programError } = await fetchRecitalProgram(showId.value);
    
    if (programError.value) {
      throw new Error(programError.value.message || 'Failed to load program data');
    }
    
    programData.value = programResponse.value.program;
    performances.value = programResponse.value.performances || [];
    advertisements.value = programResponse.value.advertisements || [];
  } catch (error) {
    console.error('Error loading program data:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load program data',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

// Upload cover image
const uploadCover = async (file) => {
  uploading.value = true;
  try {
    const { data, error } = await uploadCoverImage(showId.value, file);
    
    if (error.value) {
      throw new Error(error.value.message || 'Failed to upload cover image');
    }
    
    programData.value = data.value.program;
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Cover image uploaded successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to upload cover image',
      life: 3000
    });
  } finally {
    uploading.value = false;
  }
};

// Remove cover image
const removeCover = async () => {
  uploading.value = true;
  try {
    const { data, error } = await updateProgramDetails(showId.value, {
      cover_image_url: null
    });
    
    if (error.value) {
      throw new Error(error.value.message || 'Failed to remove cover image');
    }
    
    programData.value = data.value.program;
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Cover image removed successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error removing cover image:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to remove cover image',
      life: 3000
    });
  } finally {
    uploading.value = false;
  }
};

// Save program content
const saveProgramContent = async (content) => {
  savingContent.value = true;
  try {
    const { data, error } = await updateProgramDetails(showId.value, content);
    
    if (error.value) {
      throw new Error(error.value.message || 'Failed to update program content');
    }
    
    programData.value = data.value.program;
    
    return true; // Success
  } catch (error) {
    console.error('Error saving program content:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save program content',
      life: 3000
    });
    throw error; // Re-throw for component handling
  } finally {
    savingContent.value = false;
  }
};

// Update performance order
const savePerformanceOrder = async (orderedPerformances) => {
  updatingPerformances.value = true;
  try {
    const performanceIds = orderedPerformances.map(p => p.id);
    
    const { data, error } = await updatePerformanceOrder(showId.value, performanceIds);
    
    if (error.value) {
      throw new Error(error.value.message || 'Failed to update performance order');
    }
    
    performances.value = data.value.performances;
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Performance order updated successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error updating performance order:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update performance order',
      life: 3000
    });
  } finally {
    updatingPerformances.value = false;
  }
};

// Update performance details
const updatePerformanceDetails = async (performanceId, performanceData) => {
  updatingPerformances.value = true;
  try {
    const { data, error } = await updatePerformance(showId.value, performanceId, performanceData);
    
    if (error.value) {
      throw new Error(error.value.message || 'Failed to update performance details');
    }
    
    // Update the performance in the list
    const index = performances.value.findIndex(p => p.id === performanceId);
    if (index !== -1) {
      performances.value[index] = data.value.performance;
    }
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Performance details updated successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error updating performance details:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update performance details',
      life: 3000
    });
  } finally {
    updatingPerformances.value = false;
  }
};

// Manage advertisements
const addAdvertisement = async (adData) => {
  // Implementation depends on specific advertisement handling
  // Will interact with API to add advertisement
};

const updateAdvertisement = async (adId, adData) => {
  // Implementation depends on specific advertisement handling
  // Will interact with API to update advertisement
};

const deleteAdvertisement = async (adId) => {
  // Implementation depends on specific advertisement handling
  // Will interact with API to delete advertisement
};

// Generate PDF
const generatePDF = async () => {
  generatingPDF.value = true;
  try {
    const { data, error } = await generateProgramPDF(showId.value);
    
    if (error.value) {
      throw new Error(error.value.message || 'Failed to generate PDF');
    }
    
    // Create a download link for the PDF blob
    const blob = new Blob([data.value], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${showData.value.name.replace(/\s+/g, '-')}-program.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Program PDF generated and downloaded',
      life: 3000
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to generate PDF',
      life: 3000
    });
  } finally {
    generatingPDF.value = false;
  }
};

// Load data on component mount
onMounted(() => {
  loadData();
});
</script>