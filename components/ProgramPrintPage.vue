<template>
  <div class="print-only-page">
    <!-- Debug info visible during development -->
    <div v-if="!isPrintView" class="debug-panel">
      <h2>Debug Info</h2>
      <p>Recital ID: {{ recitalId }}</p>
      <p>Loading status: {{ isLoading ? 'Loading...' : 'Complete' }}</p>
      <p>Recital data: {{ recital ? 'Loaded' : 'Not loaded' }}</p>
      <p>Program data: {{ program ? 'Loaded' : 'Not loaded' }}</p>
      <button @click="forceRefresh" class="refresh-btn">Force Refresh Data</button>
    </div>
    
    <div class="program-page">
      <!-- Cover Page -->
      <div class="page-content">
        <div class="cover-page p-4 flex flex-col justify-between h-full">
          <!-- Program Title -->
          <div class="text-center mb-2">
            <h1 class="text-2xl font-bold" style="color: #9d174d;">{{ recital?.name || 'Recital Program' }}</h1>
          </div>
          
          <!-- Debug data indicator -->
          <div v-if="!isPrintView" class="debug-data-indicator">
            <pre>{{ JSON.stringify(recital, null, 2) }}</pre>
          </div>
          
          <!-- Cover Image with Border -->
          <div class="flex-grow flex items-center justify-center">
            <div class="w-[90%] aspect-[4/3] border-4 p-2 bg-white" style="border-color: #f472b6;">
              <img 
                v-if="program?.cover_image_url" 
                :src="program.proxied_cover_image_url || program.cover_image_url" 
                alt="Program Cover"
                class="w-full h-full object-contain mx-auto"
              />
              <div v-else class="w-full h-full flex flex-col items-center justify-center" style="background-color: #fdf2f8;">
                <div class="text-center p-4">
                  <i class="pi pi-image text-4xl mb-2" style="color: #f9a8d4;"></i>
                  <p class="text-sm" style="color: #6b7280;">Cover image placeholder</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer information -->
          <div class="mt-4 pt-3" style="border-top: 1px solid #f9a8d4;">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium" style="color: #9d174d;">
                {{ recital?.name || 'Recital Program' }}
              </div>
            </div>
            <div class="flex items-center justify-between text-sm" style="color: #be185d;">
              <div>
                {{ formatDate(recital?.date) }}
              </div>
              <div>
                {{ recital?.location || 'Location TBD' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

// Define page meta
definePageMeta({
  layout: 'print', // Use the print layout
});

// Route and query information
const route = useRoute();
const recitalId = route.params.id;
const isPrintView = ref(route.query.print === 'true');

// Loading state
const isLoading = ref(true);

// Fetch the right endpoints based on your API structure
// Let's try different API patterns to see which one works
const { data: recitalData, refresh: refreshRecital } = useFetch(`/api/recitals/shows/${recitalId}`);
const { data: programData, refresh: refreshProgram } = useFetch(`/api/recitals/shows/${recitalId}/program`);

// Create reactive references to track loaded data
const recital = ref(null);
const program = ref(null);

// Try alternative endpoint patterns if needed
const tryAlternativeEndpoints = async () => {
  console.log('Trying alternative API endpoints...');
  
  try {
    // Try direct API call instead of useFetch
    const recitalResponse = await fetch(`/api/recitals/shows/${recitalId}`);
    if (recitalResponse.ok) {
      const data = await recitalResponse.json();
      recital.value = data;
      console.log('Loaded recital data from direct fetch:', data);
    }
    
    const programResponse = await fetch(`/api/recitals/shows/${recitalId}/program`);
    if (programResponse.ok) {
      const data = await programResponse.json();
      program.value = data;
      console.log('Loaded program data from direct fetch:', data);
    }
  } catch (error) {
    console.error('Error with direct fetch:', error);
  }
};

// Format a date string
const formatDate = (dateString) => {
  if (!dateString) return 'Date TBD';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    console.error('Date formatting error:', e);
    return 'Invalid Date';
  }
};

// Force refresh data
const forceRefresh = async () => {
  console.log('Forcing data refresh...');
  isLoading.value = true;
  
  try {
    await refreshRecital();
    await refreshProgram();
    await tryAlternativeEndpoints();
  } catch (error) {
    console.error('Refresh error:', error);
  }
  
  isLoading.value = false;
};

// Watch for data changes
watch(recitalData, (newData) => {
  console.log('Recital data updated:', newData);
  if (newData) {
    recital.value = newData;
  }
});

watch(programData, (newData) => {
  console.log('Program data updated:', newData);
  if (newData) {
    program.value = newData;
  }
});

// On mount, try to load data
onMounted(async () => {
  console.log('Component mounted, recital ID:', recitalId);
  
  // First try with useFetch
  if (recitalData.value) {
    recital.value = recitalData.value;
    console.log('Loaded recital data:', recitalData.value);
  }
  
  if (programData.value) {
    program.value = programData.value;
    console.log('Loaded program data:', programData.value);
  }
  
  // If data not loaded, try alternative endpoints
  if (!recital.value || !program.value) {
    await tryAlternativeEndpoints();
  }
  
  // Mark page as loaded for Puppeteer
  document.body.setAttribute('data-page-loaded', 'true');
  isLoading.value = false;
  
  // Set a flag in localStorage that puppeteer can check
  localStorage.setItem('program-data-loaded', 'true');
  
  console.log('Page fully loaded');
});
</script>

<style>
/* Debug panel styling */
.debug-panel {
  position: fixed;
  top: 0;
  right: 0;
  background: #f0f0f0;
  padding: 10px;
  border: 1px solid #ccc;
  z-index: 9999;
  width: 300px;
  font-family: monospace;
  font-size: 12px;
}

.debug-data-indicator {
  background: rgba(0,0,0,0.05);
  padding: 10px;
  font-size: 10px;
  overflow: auto;
  max-height: 100px;
}

.refresh-btn {
  background: #4a90e2;
  color: white;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  margin-top: 10px;
}

/* Print page styling */
.print-only-page {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
}

.program-page {
  width: 396px; /* 5.5 inches at 72 DPI */
  height: 612px; /* 8.5 inches at 72 DPI */
  background-color: white;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.page-content {
  height: 100%;
  width: 100%;
  position: relative;
}

.cover-page {
  height: 100%;
  width: 100%;
  position: relative;
}

/* Hide debug elements when in print view */
@media print {
  .debug-panel, .debug-data-indicator {
    display: none !important;
  }
}
</style>