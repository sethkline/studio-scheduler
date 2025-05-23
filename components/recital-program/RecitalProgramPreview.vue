<template>
  <div class="program-preview">
    <div class="flex justify-between items-center mb-4">
  <h2 class="text-xl font-semibold">Program Preview</h2>
  <div class="flex gap-2">
    <Button 
      label="Print-Ready Version" 
      icon="pi pi-print" 
      @click="generatePrintableVersion" 
      :loading="isGeneratingPdf"
      class="p-button-primary"
      tooltip="Open a high-quality printable version in a new window"
    />
    <Button 
      label="Generate PDF (Server)" 
      icon="pi pi-file-pdf" 
      @click="handleGeneratePdf" 
      :loading="isGeneratingPdf"
      class="p-button-outlined"
      tooltip="Use the server to generate a PDF (original method)"
    />
  </div>
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
      <div
        class="flex-grow border border-gray-200 rounded-lg overflow-hidden bg-gray-100 flex justify-center items-center p-4"
      >
        <div class="program-page">
          <!-- Cover Page -->
          <div v-if="isPageType('cover')" class="page-content">
            <div class="cover-page p-4 flex flex-col justify-between h-full">
              <!-- Program Title -->
              <div class="text-center mb-2">
                <!-- <pre> {{ recital.series }}</pre> -->
                <h1 class="text-2xl font-bold text-primary-800">{{ recital?.series?.name  || 'Recital Program' }}</h1>
                <h2 class="text-lg font-semibold text-primary-600">{{ recital?.series.theme || '' }}</h2>
              </div>

              <!-- Cover Image -->
              <div class="flex-grow flex items-center justify-center">
                <div class="w-[90%] aspect-[4/3] rounded-lg p-2 bg-white">
                  <img
                    v-if="program?.cover_image_url"
                    :src="program.proxied_cover_image_url || program.cover_image_url"
                    alt="Program Cover"
                    class="w-full h-full object-contain mx-auto"
                  />
                  <div v-else class="w-full h-full flex flex-col items-center justify-center bg-primary-50">
                    <div class="text-center p-4">
                      <i class="pi pi-image text-4xl mb-2 text-primary-300"></i>
                      <p class="text-sm text-gray-500">Cover image placeholder</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer information -->
              <div class="mt-4 pt-3 border-t border-primary-300">
                <div class="flex items-center justify-between mb-2">
                  <div class="text-sm font-medium text-primary-800">
                    {{ recital?.name || 'Recital Program' }}
                  </div>
                </div>
                <div class="flex items-center justify-between text-sm text-primary-700">
                  <div>
                    {{ formatDate(recital?.date) }}
                  </div>
                  <div>
                    {{ recital?.location }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Director's Note -->
          <div v-else-if="isPageType('director-note')" class="page-content p-6">
            <h2 class="text-xl font-bold mb-6 text-center text-primary-800">Artistic Director's Note</h2>
            <div
              v-if="program?.artistic_director_note"
              class="prose mx-auto"
              v-html="program.artistic_director_note"
            ></div>
            <div v-else class="text-center text-gray-500 p-8">
              <i class="pi pi-info-circle text-2xl mb-2"></i>
              <p>No artistic director's note has been added yet.</p>
            </div>

            <!-- Page number at bottom -->
            <div class="page-number absolute bottom-2 w-full text-center text-xs text-gray-500">1</div>
          </div>

          <!-- Performance Pages -->
          <div v-else-if="isPageType('performance')" class="page-content">
            <div class="p-3">
              <h2 class="text-lg font-bold mb-2 text-center text-primary-800">
                Performance Lineup
              </h2>

              <div v-if="processedPerformances.length === 0" class="text-center text-gray-500 p-4">
                <i class="pi pi-info-circle text-xl mb-1"></i>
                <p>No performances have been added to this recital yet.</p>
              </div>

              <div v-else class="performances-container">
                <div
                  v-for="perf in currentPagePerformances"
                  :key="perf.id"
                  class="performance-item py-0.5 px-1.5 border-b border-gray-100"
                >
                  <div class="flex items-start gap-1.5">
                    <div
                      class="performance-number text-sm font-bold text-primary-700 w-4 text-center flex-shrink-0 mt-0.5"
                    >
                      {{ perf.displayNumber }}
                    </div>
                    <div class="flex-grow">
                      <h3 class="font-bold text-xs">{{ perf.song_title || 'Untitled Performance' }}</h3>
                      <div class="text-xxs text-gray-700">
                        <span v-if="perf.song_artist" class="mr-1.5">
                          <i class="pi pi-volume-up text-xxs"></i>
                          {{ perf.song_artist }}
                        </span>
                        <span v-if="perf.choreographer" class="mr-1.5">
                          <i class="pi pi-user text-xxs"></i>
                          Choreography by {{ perf.choreographer }}
                        </span>
                        <span class="text-primary-700">
                          <i class="pi pi-users text-xxs"></i>
                          {{ getClassDisplayName(perf) }}
                        </span>
                      </div>

                      <!-- Dancers Display -->
                      <div v-if="getDancers(perf).length > 0" class="mt-0.5">
                        <div class="dancers-list">
                          <span class="font-medium text-xxs">Dancers:</span>
                          <span class="text-xxs text-gray-600">{{ getDancers(perf).join(', ') }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Page number at bottom -->
              <div class="page-number absolute bottom-2 w-full text-center text-xs text-gray-500">
                {{ getCurrentPerformancePageIndex() + 2 }}
              </div>
            </div>
          </div>

          <!-- Acknowledgments -->
          <div v-else-if="isPageType('acknowledgments')" class="page-content p-6">
            <h2 class="text-xl font-bold mb-6 text-center text-primary-800">Acknowledgments</h2>
            <div v-if="program?.acknowledgments" class="prose mx-auto" v-html="program.acknowledgments"></div>
            <div v-else class="text-center text-gray-500 p-8">
              <i class="pi pi-info-circle text-2xl mb-2"></i>
              <p>No acknowledgments have been added yet.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden rendering area for measurement - not visible to user -->
    <div ref="measurementContainer" class="hidden-measurement-container">
      <div
        v-for="perf in performances"
        :key="perf.id"
        class="performance-item py-0.5 px-1.5 border-b border-gray-100"
        :ref="(el) => addPerformanceRef(perf.id, el)"
      >
        <div class="flex items-start gap-1.5">
          <div class="performance-number text-sm font-bold text-primary-700 w-4 text-center flex-shrink-0 mt-0.5">
            {{ 1 }}
          </div>
          <div class="flex-grow">
            <h3 class="font-bold text-xs">{{ perf.song_title || 'Untitled Performance' }}</h3>
            <div class="text-xxs text-gray-700">
              <span v-if="perf.song_artist" class="mr-1.5">
                <i class="pi pi-volume-up text-xxs"></i>
                {{ perf.song_artist }}
              </span>
              <span v-if="perf.choreographer" class="mr-1.5">
                <i class="pi pi-user text-xxs"></i>
                Choreography by {{ perf.choreographer }}
              </span>
              <span class="text-primary-700">
                <i class="pi pi-users text-xxs"></i>
                {{ getClassDisplayName(perf) }}
              </span>
            </div>

            <!-- Dancers Display -->
            <div v-if="getDancers(perf).length > 0" class="mt-0.5">
              <div class="dancers-list">
                <span class="font-medium text-xxs">Dancers:</span>
                <span class="text-xxs text-gray-600">{{ getDancers(perf).join(', ') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast for notifications -->
    <Toast position="bottom-right" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useToast } from 'primevue/usetoast';

// Set up toast
const toast = useToast();

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
const measurementContainer = ref(null);
const performanceRefs = ref({});
const performanceHeights = ref({});
const processedPerformances = ref([]);
const performancePages = ref([]);
const isGeneratingPdf = ref(false);
const route = useRoute();

// Add a reference to measure individual performance heights
const addPerformanceRef = (id, el) => {
  if (el) {
    performanceRefs.value[id] = el;
  }
};

// Define the maximum available height for performances on a page (in pixels)
// This value should be adjusted based on the page size and header space
const MAX_PAGE_CONTENT_HEIGHT = 520; // Approx. height available for performances after header
const HEADER_HEIGHT = 60; // Height of the page header (title and page number)
const SAFETY_MARGIN = 10; // Safety margin to prevent overflow

// Function to measure performance heights and calculate pagination
const calculatePagination = async () => {
  // Wait for the next DOM update to ensure refs are populated
  await nextTick();

  // Reset previous measurements
  performanceHeights.value = {};

  // Measure each performance's height
  for (const id in performanceRefs.value) {
    const el = performanceRefs.value[id];
    if (el) {
      performanceHeights.value[id] = el.offsetHeight;
    }
  }

  // Reset processed data
  processedPerformances.value = [];
  performancePages.value = [];

  // Add display number to each performance
  const numbered = props.performances.map((perf, index) => ({
    ...perf,
    displayNumber: index + 1,
    // Use a smaller height estimate for print version
    measuredHeight: (performanceHeights.value[perf.id] || 50) * 0.7 // Reduce by 30% to fit more
  }));

  // Increase available height for performances on a page
  const MAX_PRINT_CONTENT_HEIGHT = 700; // Increased from previous 520
  
  // Distribute performances across pages
  let currentPageItems = [];
  let currentHeight = 0;

  for (const perf of numbered) {
    // If adding this performance would exceed page height, start a new page
    if (currentHeight + perf.measuredHeight > MAX_PRINT_CONTENT_HEIGHT - SAFETY_MARGIN) {
      if (currentPageItems.length > 0) {
        performancePages.value.push([...currentPageItems]);
        currentPageItems = [];
        currentHeight = 0;
      }
    }

    // Add performance to current page
    currentPageItems.push(perf);
    currentHeight += perf.measuredHeight;
  }

  // Add the last page if it has items
  if (currentPageItems.length > 0) {
    performancePages.value.push(currentPageItems);
  }

  // Flatten all items for easier access
  processedPerformances.value = numbered;
};

// Get current performance page content
const currentPagePerformances = computed(() => {
  if (!isPageType('performance')) return [];
  const pageIndex = getCurrentPerformancePageIndex();
  return pageIndex >= 0 && pageIndex < performancePages.value.length ? performancePages.value[pageIndex] : [];
});

// Define all pages for navigation
const pages = computed(() => [
  { type: 'cover', label: 'Cover Page' },
  { type: 'director-note', label: "Director's Note" },
  ...performancePages.value.map((_, idx) => ({
    type: 'performance',
    label: `Performances (${idx + 1}/${performancePages.value.length})`,
    pageIndex: idx
  })),
  { type: 'acknowledgments', label: 'Acknowledgments' }
]);

// Check if current page is of a specific type
const isPageType = (type) => {
  return pages.value[currentPage.value]?.type === type;
};

// Get current performance page index
const getCurrentPerformancePageIndex = () => {
  if (!isPageType('performance')) return -1;
  return pages.value[currentPage.value]?.pageIndex || 0;
};

// Get current performance page number
const getCurrentPerformancePageNumber = () => {
  return getCurrentPerformancePageIndex() + 1;
};

// Format a date string
const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

// Get class name display
const getClassDisplayName = (performance) => {
  return performance.class_instance?.name || performance.class_instance?.class_definition?.name || 'Unknown Class';
};

// Get dancer list from performance
const getDancers = (performance) => {
  if (performance.dancers?.length > 0) {
    return performance.dancers.map((dancer) => dancer.student_name || dancer.dancer_name);
  }

  if (performance.notes?.includes('Dancers:')) {
    const dancerText = performance.notes.substring(performance.notes.indexOf('Dancers:') + 8).trim();
    return dancerText
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name);
  }

  return [];
};

// Convert the program pages to high-res JPEGs
const renderPagesToImages = async () => {
  isGeneratingPdf.value = true;
  const images = [];
  
  try {
    // Import domtoimage library
    const domtoimage = await import('dom-to-image');
    
    // Save current page
    const originalPage = currentPage.value;
    
    // For each page in the program
    for (let i = 0; i < pages.value.length; i++) {
      // Set the current page
      currentPage.value = i;
      
      // Wait for the page to render
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get the page element
      const pageElement = document.querySelector('.program-page');
      if (!pageElement) continue;
      
      // Calculate dimensions for 300 DPI
      const scale = 300 / 72; // Convert from 72 DPI to 300 DPI
      const width = Math.round(pageElement.offsetWidth * scale);
      const height = Math.round(pageElement.offsetHeight * scale);
      
      // Create configuration for dom-to-image
      const config = {
        width: pageElement.offsetWidth,
        height: pageElement.offsetHeight,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${pageElement.offsetWidth}px`,
          height: `${pageElement.offsetHeight}px`,
        },
        quality: 1.0,
        bgcolor: 'white'
      };
      
      // Generate JPEG using dom-to-image
      const dataUrl = await domtoimage.toJpeg(pageElement, config);
      
      // Process the image with canvas to ensure correct DPI
      const img = new Image();
      img.src = dataUrl;
      
      // Wait for image to load
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Create a canvas with the desired dimensions
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      // Draw the image to the canvas at the desired scale
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to high-quality JPEG
      const highResDataUrl = canvas.toDataURL('image/jpeg', 1.0);
      
      // Add to images array
      const pageName = pages.value[i].label.replace(/\s/g, '_').replace(/\//g, '-');
      images.push({
        dataUrl: highResDataUrl,
        name: `${props.recital?.name || 'Recital'}_${pageName}_300dpi.jpg`
      });
    }
    
    // Restore original page
    currentPage.value = originalPage;
    
    return images;
  } catch (error) {
    console.error('Error generating images:', error);
    toast.add({
      severity: 'error',
      summary: 'Image Generation Failed',
      detail: error.message || 'Failed to generate images',
      life: 5000
    });
    return [];
  } finally {
    isGeneratingPdf.value = false;
  }
};

// Function to download all images as individual files
const downloadImages = async () => {
  isGeneratingPdf.value = true;
  
  try {
    const images = await renderPagesToImages();
    
    if (images.length === 0) {
      throw new Error('No images were generated');
    }
    
    // Download each image
    for (const image of images) {
      const link = document.createElement('a');
      link.href = image.dataUrl;
      link.download = image.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Small delay between downloads to prevent browser issues
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    toast.add({
      severity: 'success',
      summary: 'Images Generated',
      detail: `${images.length} high-resolution images have been downloaded`,
      life: 3000
    });
  } catch (error) {
    console.error('Error downloading images:', error);
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: error.message || 'Failed to download images',
      life: 5000
    });
  } finally {
    isGeneratingPdf.value = false;
  }
};

// Function to download all images as a ZIP file
const downloadImagesAsZip = async () => {
  isGeneratingPdf.value = true;
  
  try {
    const images = await renderPagesToImages();
    
    if (images.length === 0) {
      throw new Error('No images were generated');
    }
    
    // Create a new JSZip instance
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    // Add each image to the zip
    for (const image of images) {
      // Convert base64 data URL to binary
      const binary = atob(image.dataUrl.split(',')[1]);
      const array = [];
      for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
      }
      const blob = new Uint8Array(array);
      
      // Add to zip
      zip.file(image.name, blob);
    }
    
    // Generate the zip file
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${props.recital?.name || 'Recital'}_Program_Images_300dpi.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    toast.add({
      severity: 'success',
      summary: 'Images Generated',
      detail: `${images.length} high-resolution images have been downloaded as a ZIP file`,
      life: 3000
    });
  } catch (error) {
    console.error('Error downloading images as ZIP:', error);
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: error.message || 'Failed to download images as ZIP',
      life: 5000
    });
  } finally {
    isGeneratingPdf.value = false;
  }
};

// Helper function to open a print window with controlled dimensions
// Helper function to open a print window with controlled dimensions
const openPrintWindow = async () => {
  isGeneratingPdf.value = true;
  
  try {
    // Save current page
    const originalPage = currentPage.value;
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
    }
    
    // Write the base HTML structure first, without the problematic script tag
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${props.recital?.name || 'Recital'} Program</title>
        <style>
          @media print {
            @page {
              size: 5.5in 8.5in;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .page-container {
              page-break-after: always;
              width: 5.5in;
              height: 8.5in;
              position: relative;
              overflow: hidden;
            }
            .page-content {
              width: 100%;
              height: 100%;
              box-sizing: border-box;
            }
          }
          body {
            background-color: white;
            font-family: Arial, sans-serif;
          }
          .page-container {
            width: 5.5in;
            height: 8.5in;
            margin: 20px auto;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            position: relative;
            background-color: white;
          }
          .page-content {
            padding: 0.25in;
            box-sizing: border-box;
            width: 100%;
          }
          .cover-title {
            font-size: 24pt;
            font-weight: bold;
            text-align: center;
            margin-bottom: 0.5in;
            color: #d81b60;
          }
          .cover-image {
            width: 90%;
            max-height: 5in;
            margin: 0 auto;
            display: block;
            object-fit: contain;
            padding: 0.125in;
          }
          .cover-footer {
            position: absolute;
            bottom: 0.25in;
            left: 0.25in;
            right: 0.25in;
            border-top: 1px solid #ec407a;
            padding-top: 0.125in;
          }
          .cover-footer-info {
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
          }
          .section-title {
            font-size: 18pt;
            font-weight: bold;
            text-align: center;
            margin-bottom: 0.25in;
            color: #d81b60;
            width: 100%;
          }
          .page-number {
            position: absolute;
            bottom: 0.125in;
            width: 100%;
            text-align: center;
            font-size: 8pt;
            color: #666;
          }
   .performance-item {
  border-bottom: 1px solid #f3f3f3;
  padding: 0.05in 0; /* Reduced from 0.1in */
  width: 100%;
  margin-bottom: 0.05in;
}
          .performance-header {
            display: flex;
            align-items: flex-start;
            width: 100%;
          }
          .performance-number {
            width: 0.25in;
            font-weight: bold;
            color: #d81b60;
            text-align: center;
            font-size: 10pt;
            flex-shrink: 0;
          }
          .performance-details {
            flex-grow: 1;
            width: calc(100% - 0.25in);
          }
.performance-title {
  font-weight: bold;
  font-size: 10pt; /* Reduced from 11pt */
  width: 100%;
  margin-bottom: 0.02in;
}
.performance-meta {
  font-size: 7pt; /* Reduced from 8pt */
  color: #444;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  line-height: 1.2;
}
          .performance-meta span {
            margin-right: 0.15in;
          }
.dancers-list {
  font-size: 7pt; /* Reduced from 8pt */
  margin-top: 0.03in; /* Reduced from 0.05in */
  width: 100%;
  line-height: 1.2;
}
          .dancers-list-label {
            font-weight: medium;
          }
          .dancers-list-names {
            color: #666;
          }
          .performances-container {
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div id="program-container"></div>
      </body>
      </html>
    `);
    
    // Now add the print functionality by directly creating a script element
    const scriptElement = printWindow.document.createElement('script');
    scriptElement.textContent = `
      window.onload = function() {
        window.setTimeout(function() {
          window.print();
          // Don't close the window automatically so user can save as PDF
          // window.close();
        }, 1000);
      };
    `;
    printWindow.document.head.appendChild(scriptElement);
    
    const container = printWindow.document.getElementById('program-container');
    
    // For each page in the program, create a full-page representation
    for (let i = 0; i < pages.value.length; i++) {
      // Set the current page
      currentPage.value = i;
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const page = pages.value[i];
      const pageDiv = printWindow.document.createElement('div');
      pageDiv.className = 'page-container';
      
      const contentDiv = printWindow.document.createElement('div');
      contentDiv.className = 'page-content';
      
      // Fill in content based on page type
      if (page.type === 'cover') {
        // Cover page content
        contentDiv.innerHTML = `
        
          <div class="cover-title">${props.recital?.series.name || 'Recital Program'}</div>
          <div style="text-align: center;">
            ${props.program?.cover_image_url ? 
              `<img src="${props.program.proxied_cover_image_url || props.program.cover_image_url}" 
                   alt="Program Cover" class="cover-image" />` : 
              `<div style="width: 90%; height: 5in; margin: 0 auto; 
                        padding: 0.125in; text-align: center; background-color: #fce4ec;">
                <p style="margin-top: 2in; color: #999;">Cover image placeholder</p>
              </div>`
            }
          </div>
          <div class="cover-footer">
            <div class="cover-footer-info">
              <div>${props.recital?.name || 'Recital Program'}</div>
              <div>${formatDate(props.recital?.date)}</div>
            </div>
            <div class="cover-footer-info" style="margin-top: 0.05in;">
              <div></div>
              <div>${props.recital?.location || ''}</div>
            </div>
          </div>
        `;
      } else if (page.type === 'director-note') {
        // Director's note
        contentDiv.innerHTML = `
          <div class="section-title">Artistic Director's Note</div>
          <div style="font-size: 10pt; line-height: 1.4; width: 100%;">
            ${props.program?.artistic_director_note || 
              '<p style="text-align: center; color: #999;">No artistic director\'s note has been added yet.</p>'}
          </div>
          <div class="page-number">1</div>
        `;
      } else if (page.type === 'performance') {
        // Performance pages
        const pageIndex = page.pageIndex || 0;
        const pagePerformances = pageIndex >= 0 && pageIndex < performancePages.value.length 
          ? performancePages.value[pageIndex] 
          : [];
        
        let performancesHtml = '';
        if (pagePerformances.length === 0) {
          performancesHtml = `
            <p style="text-align: center; color: #999;">
              No performances have been added to this recital yet.
            </p>
          `;
        } else {
          pagePerformances.forEach(perf => {
            const dancers = getDancers(perf);
            
            performancesHtml += `
              <div class="performance-item">
                <div class="performance-header">
                  <div class="performance-number">${perf.displayNumber}</div>
                  <div class="performance-details">
                    <div class="performance-title">${perf.song_title || 'Untitled Performance'}</div>
                    <div class="performance-meta">
                      ${perf.song_artist ? 
                        `<span><i>Music:</i> ${perf.song_artist}</span>` : ''}
                      ${perf.choreographer ? 
                        `<span><i>Choreography:</i> ${perf.choreographer}</span>` : ''}
                      <span><i>Class:</i> ${getClassDisplayName(perf)}</span>
                    </div>
                    ${dancers.length > 0 ? 
                      `<div class="dancers-list">
                        <span class="dancers-list-label">Dancers:</span>
                        <span class="dancers-list-names">${dancers.join(', ')}</span>
                      </div>` : ''}
                  </div>
                </div>
              </div>
            `;
          });
        }
        
        contentDiv.innerHTML = `
          <div class="section-title">
            Performance Lineup
          </div>
          <div class="performances-container">
            ${performancesHtml}
          </div>
          <div class="page-number">${pageIndex + 2}</div>
        `;
      } else if (page.type === 'acknowledgments') {
        // Acknowledgments
        contentDiv.innerHTML = `
          <div class="section-title">Acknowledgments</div>
          <div style="font-size: 10pt; line-height: 1.4; width: 100%;">
            ${props.program?.acknowledgments || 
              '<p style="text-align: center; color: #999;">No acknowledgments have been added yet.</p>'}
          </div>
          <div class="page-number">${pages.value.length - 1}</div>
        `;
      }
      
      pageDiv.appendChild(contentDiv);
      container.appendChild(pageDiv);
    }
    
    // Restore original page
    currentPage.value = originalPage;
    
    // Close document for writing
    printWindow.document.close();
    
    toast.add({
      severity: 'success',
      summary: 'Print View Generated',
      detail: 'Your program is ready for printing. Use the browser print dialog to save as PDF.',
      life: 5000
    });
    
    return printWindow;
  } catch (error) {
    console.error('Error generating print view:', error);
    toast.add({
      severity: 'error',
      summary: 'Print View Failed',
      detail: error.message || 'Failed to generate print view',
      life: 5000
    });
    return null;
  } finally {
    isGeneratingPdf.value = false;
  }
};

// Function to generate high-quality print-ready version
const generatePrintableVersion = async () => {
  const printWindow = await openPrintWindow();
  if (!printWindow) {
    toast.add({
      severity: 'error',
      summary: 'Print Generation Failed',
      detail: 'Could not create print window. Please check if pop-ups are blocked.',
      life: 5000
    });
  }
};

// Function to handle PDF generation through server
const handleGeneratePdf = async () => {
  isGeneratingPdf.value = true;

  try {
    const recitalId = props.recital?.id || route.params.id;
    console.log('Recital object:', recitalId);
    // Get the recital ID from the props or route

    if (!recitalId) {
      throw new Error('Recital ID is required');
    }

    // Call the server API endpoint to generate the high-quality PDF
    const response = await fetch('/api/generate-program-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recitalId,
        // Optionally include any additional parameters needed
        currentPage: currentPage.value
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.statusMessage || 'Failed to generate PDF');
    }

    // Get the PDF blob
    const blob = await response.blob();

    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create a link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.recital?.name || 'Recital'}_Program_Print_Quality.pdf`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.add({
      severity: 'success',
      summary: 'PDF Generated',
      detail: 'Your print-shop quality PDF has been generated successfully',
      life: 3000
    });
  } catch (err) {
    console.error('Error generating PDF:', err);

    toast.add({
      severity: 'error',
      summary: 'PDF Generation Failed',
      detail: err.message || 'Failed to generate PDF',
      life: 5000
    });
  } finally {
    isGeneratingPdf.value = false;
  }
};

// Watch for changes to performances and recalculate pagination
watch(
  () => props.performances,
  async () => {
    await calculatePagination();
  },
  { deep: true, immediate: false }
);

// Initialize calculations after mounting
onMounted(async () => {
  await calculatePagination();
});
</script>

<style scoped>
.program-page {
  width: 100%;
  max-width: 396px; /* 5.5 inches at 72 DPI */
  height: 612px; /* 8.5 inches at 72 DPI */
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  position: relative;
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

/* Extra extra small text size for dancers */
.text-xxs {
  font-size: 0.65rem;
  line-height: 1rem;
}

/* Fix for long dancer lists */
.dancers-list {
  max-width: 100%;
  line-height: 1.1;
  word-wrap: break-word;
  white-space: normal; /* Ensure text wraps to prevent cutoff */
}

/* Style for rich text content */
:deep(.prose) {
  max-width: 100%;
  line-height: 1.4;
  font-size: 0.9rem;
}

:deep(.prose h1) {
  font-size: 1.5rem;
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-weight: 700;
}

:deep(.prose h2) {
  font-size: 1.25rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

:deep(.prose p) {
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}

:deep(.prose ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}

/* Performance items */
.performance-item {
  break-inside: avoid; /* Prevent performances from breaking across pages */
  page-break-inside: avoid;
}

/* Performances container - ensures proper positioning */
.performances-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Hidden container for measurement - not visible but still rendered */
.hidden-measurement-container {
  position: absolute;
  visibility: hidden;
  overflow: hidden;
  height: 0;
  width: 396px; /* Same width as the page */
  z-index: -9999;
}

/* Page number styling */
.page-number {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.7rem;
  color: #6b7280;
}
</style>
