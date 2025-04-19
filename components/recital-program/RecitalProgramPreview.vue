<template>
  <div class="program-preview">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Program Preview</h2>
      <Button 
        label="Generate PDF" 
        icon="pi pi-file-pdf" 
        @click="$emit('generate-pdf')" 
      />
    </div>
    
    <div class="flex flex-col md:flex-row gap-4 h-full">
      <!-- Page navigation -->
      <div class="md:w-48 flex md:flex-col overflow-x-auto md:overflow-y-auto gap-2 p-2 bg-gray-50 rounded-lg">
        <Button 
          v-for="(page, index) in pages" 
          :key="index"
          :label="page.label" 
          :class="{ 'p-button-outlined': currentPage !== index, 'p-button-primary': currentPage === index }"
          class="mb-1 flex-shrink-0 w-full text-left"
          @click="currentPage = index"
        />
      </div>
      
      <!-- Preview area -->
      <div class="flex-grow border border-gray-200 rounded-lg overflow-hidden bg-gray-100 flex justify-center">
        <div class="program-page bg-white shadow-md my-4">
          <!-- Cover Page -->
          <div v-if="currentPage === 0" class="page-content">
            <div class="cover-page">
              <img 
                v-if="program?.cover_image_url" 
                :src="program.cover_image_url" 
                alt="Program Cover"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex flex-col items-center justify-center bg-primary-50">
                <div class="text-center px-8">
                  <h1 class="text-3xl font-bold mb-4 text-primary-800">{{ recital?.name || 'Recital Program' }}</h1>
                  <p class="text-lg mb-4 text-primary-600">{{ formatDate(recital?.date) }}</p>
                  <p class="text-lg text-primary-700">{{ recital?.location }}</p>
                  
                  <div class="mt-12 text-sm text-gray-500">
                    <p>Cover image placeholder</p>
                    <p>Upload a cover image in the Cover & Design tab</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Director's Note -->
          <div v-else-if="currentPage === 1" class="page-content p-8">
            <h2 class="text-2xl font-bold mb-6 text-center text-primary-800">Artistic Director's Note</h2>
            <div 
              v-if="program?.artistic_director_note" 
              class="prose mx-auto"
              v-html="program.artistic_director_note"
            ></div>
            <div v-else class="text-center text-gray-500 p-12">
              <i class="pi pi-info-circle text-2xl mb-2"></i>
              <p>No artistic director's note has been added yet.</p>
              <p class="text-sm mt-2">Add content in the Program Content tab.</p>
            </div>
          </div>
          
          <!-- Performance Lineup -->
          <div v-else-if="currentPage === 2" class="page-content p-8">
            <h2 class="text-2xl font-bold mb-6 text-center text-primary-800">Performance Lineup</h2>
            
            <div v-if="performances.length === 0" class="text-center text-gray-500 p-12">
              <i class="pi pi-info-circle text-2xl mb-2"></i>
              <p>No performances have been added to this recital yet.</p>
            </div>
            
            <div v-else class="space-y-4">
              <div v-for="(perf, index) in performances" :key="perf.id" class="performance-item p-3 border-b">
                <div class="flex items-center gap-2">
                  <div class="performance-number text-xl font-bold text-primary-700 w-8 text-center">
                    {{ index + 1 }}
                  </div>
                  <div class="flex-grow">
                    <h3 class="font-bold text-lg">{{ perf.song_title || 'Untitled Performance' }}</h3>
                    <div class="text-sm flex flex-wrap gap-4 text-gray-700">
                      <span v-if="perf.song_artist" class="flex items-center gap-1">
                        <i class="pi pi-volume-up text-xs"></i>
                        {{ perf.song_artist }}
                      </span>
                      <span v-if="perf.choreographer" class="flex items-center gap-1">
                        <i class="pi pi-user text-xs"></i>
                        Choreography by {{ perf.choreographer }}
                      </span>
                      <span class="flex items-center gap-1 text-primary-700">
                        <i class="pi pi-users text-xs"></i>
                        {{ getClassDisplayName(perf) }}
                      </span>
                    </div>
                    
                    <!-- Dancers Display -->
                    <div class="mt-2 text-sm text-gray-600">
                      <div v-if="getDancers(perf).length > 0" class="dancers-list">
                        <div class="font-medium">Dancers:</div>
                        <div>{{ getDancers(perf).join(', ') }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Acknowledgments -->
          <div v-else-if="currentPage === 3" class="page-content p-8">
            <h2 class="text-2xl font-bold mb-6 text-center text-primary-800">Acknowledgments</h2>
            <div 
              v-if="program?.acknowledgments" 
              class="prose mx-auto"
              v-html="program.acknowledgments"
            ></div>
            <div v-else class="text-center text-gray-500 p-12">
              <i class="pi pi-info-circle text-2xl mb-2"></i>
              <p>No acknowledgments have been added yet.</p>
              <p class="text-sm mt-2">Add content in the Program Content tab.</p>
            </div>
          </div>
          
          <!-- Advertisements -->
          <div v-else-if="currentPage === 4" class="page-content p-8">
            <h2 class="text-2xl font-bold mb-6 text-center text-primary-800">Advertisements</h2>
            
            <div v-if="advertisements.length === 0" class="text-center text-gray-500 p-12">
              <i class="pi pi-info-circle text-2xl mb-2"></i>
              <p>No advertisements have been added yet.</p>
              <p class="text-sm mt-2">Add advertisements in the Advertisements tab.</p>
            </div>
            
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-for="ad in sortedAdvertisements" :key="ad.id" class="ad-item border p-3 rounded">
                <div class="text-center mb-3">
                  <img 
                    v-if="ad.image_url" 
                    :src="ad.image_url" 
                    :alt="ad.title" 
                    class="max-w-full max-h-32 mx-auto"
                  />
                  <div v-else class="bg-gray-100 h-20 flex items-center justify-center">
                    <span class="text-sm text-gray-400">No image</span>
                  </div>
                </div>
                <h3 class="font-bold text-center">{{ ad.title }}</h3>
                <p v-if="ad.description" class="text-sm text-center text-gray-600 mt-1">
                  {{ ad.description }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Dancer Index -->
          <div v-else-if="currentPage === 5" class="page-content p-8">
            <h2 class="text-2xl font-bold mb-6 text-center text-primary-800">Dancer Index</h2>
            
            <div v-if="dancerPerformanceMap.size === 0" class="text-center text-gray-500 p-12">
              <i class="pi pi-info-circle text-2xl mb-2"></i>
              <p>No dancers have been added to any performances yet.</p>
            </div>
            
            <div v-else class="dancers-index space-y-4">
              <div class="text-sm text-right text-gray-500 mb-2">
                * Numbers indicate performance order
              </div>
              
              <div v-for="[dancer, perfIndices] in sortedDancerEntries" :key="dancer" class="dancer-entry border-b pb-2">
                <div class="flex justify-between">
                  <div class="font-medium">{{ dancer }}</div>
                  <div class="text-sm text-gray-600">
                    <span v-for="(perfIndex, i) in perfIndices" :key="i" class="performance-ref">
                      <span v-if="i > 0">, </span>{{ perfIndex }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// Props
const props = defineProps({
  recital: {
    type: Object,
    default: () => ({})
  },
  program: {
    type: Object,
    default: () => ({})
  },
  performances: {
    type: Array,
    default: () => []
  },
  advertisements: {
    type: Array,
    default: () => []
  }
});

// Emits
defineEmits(['generate-pdf']);

// Local state
const currentPage = ref(0);

// Computed
const pages = computed(() => [
  { label: 'Cover Page', value: 'cover' },
  { label: "Director's Note", value: 'director-note' },
  { label: 'Performance Lineup', value: 'performances' },
  { label: 'Acknowledgments', value: 'acknowledgments' },
  { label: 'Advertisements', value: 'advertisements' },
  { label: 'Dancer Index', value: 'dancer-index' }
]);

const sortedAdvertisements = computed(() => {
  return [...props.advertisements].sort((a, b) => a.order_position - b.order_position);
});

// Dancer index mapping
const dancerPerformanceMap = computed(() => {
  const map = new Map();
  
  props.performances.forEach((perf, index) => {
    const dancers = getDancers(perf);
    dancers.forEach(dancer => {
      if (!map.has(dancer)) {
        map.set(dancer, []);
      }
      map.get(dancer).push(index + 1); // Add 1 to get the display number
    });
  });
  
  return map;
});

// Sort dancer entries alphabetically
const sortedDancerEntries = computed(() => {
  return [...dancerPerformanceMap.value.entries()].sort((a, b) => a[0].localeCompare(b[0]));
});

// Methods
function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function getClassDisplayName(performance) {
  // Use class instance name, or use the class_definition name if available
  const name = performance.class_instance?.name || 
               performance.class_instance?.class_definition?.name || 
               'Unknown Class';
  return name;
}

function getDancers(performance) {
  // Extract dancers from different sources with priority
  if (performance.dancers && performance.dancers.length > 0) {
    return performance.dancers.map(dancer => dancer.student_name || dancer.dancer_name);
  }
  
  if (performance.notes && performance.notes.includes('Dancers:')) {
    const dancerText = performance.notes.substring(performance.notes.indexOf('Dancers:') + 8).trim();
    return dancerText.split(',').map(name => name.trim()).filter(name => name);
  }
  
  return [];
}
</script>

<style scoped>
.program-page {
  width: 100%;
  max-width: 595px; /* A4 width at 72 DPI */
  aspect-ratio: 1 / 1.414; /* A4 aspect ratio */
  position: relative;
}

.page-content {
  height: 100%;
  overflow-y: auto;
}

.cover-page {
  height: 100%;
  width: 100%;
  position: relative;
}

/* Add some styling for rich text content */
:deep(.prose) {
  max-width: 65ch;
  line-height: 1.6;
}

:deep(.prose h1) {
  font-size: 1.875rem;
  margin-top: 0;
  margin-bottom: 1rem;
  font-weight: 700;
}

:deep(.prose h2) {
  font-size: 1.5rem;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

:deep(.prose p) {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

:deep(.prose ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

:deep(.prose ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.dancers-index {
  columns: 1;
}

@media (min-width: 640px) {
  .dancers-index {
    columns: 2;
    column-gap: 2rem;
  }
}
</style>