<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-bold">Ticket Verification</h1>
      <p class="text-gray-600 mt-2">Scan or enter a ticket code to verify its validity</p>
    </div>

    <!-- Ticket input form -->
    <div class="card p-6 max-w-md mx-auto">
      <div class="mb-4">
        <label for="ticket-code" class="block text-sm font-medium mb-1">Ticket Code</label>
        <div class="flex">
          <InputText 
            id="ticket-code" 
            v-model="ticketCode" 
            placeholder="Enter ticket code" 
            class="flex-grow mr-2" 
            :disabled="loading"
            @keyup.enter="verifyTicket"
          />
          <Button icon="pi pi-search" @click="verifyTicket" :loading="loading" />
        </div>
      </div>
      
      <div class="text-center">
        <p class="text-sm text-gray-500 mb-4">or</p>
        <Button 
          label="Scan QR Code" 
          icon="pi pi-camera" 
          severity="secondary" 
          @click="startScanner" 
          :disabled="loading || isScannerActive"
        />
      </div>
      
      <!-- Scanner container -->
      <div v-if="isScannerActive" class="mt-4">
        <div id="scanner-container" class="w-full h-64 bg-black rounded-lg overflow-hidden"></div>
        <div class="text-center mt-2">
          <Button icon="pi pi-times" label="Cancel" @click="stopScanner" severity="secondary" />
        </div>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="mt-6 max-w-md mx-auto">
      <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
        <div class="flex items-center">
          <i class="pi pi-exclamation-circle text-red-500 mr-2"></i>
          <div>{{ error }}</div>
        </div>
      </div>
    </div>

    <!-- Valid ticket result -->
    <div v-if="ticketData && isValid" class="mt-6 max-w-md mx-auto">
      <div class="card bg-green-50 border border-green-200 p-6">
        <div class="text-center mb-4">
          <i class="pi pi-check-circle text-green-500 text-5xl"></i>
          <h2 class="text-xl font-bold text-green-700 mt-2">Valid Ticket</h2>
        </div>
        
        <div class="space-y-4">
          <div class="flex justify-between">
            <span class="text-gray-600">Ticket Code:</span>
            <span class="font-semibold">{{ ticketData.ticket_code }}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Show:</span>
            <span class="font-semibold">{{ ticketData.show.name }}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Date & Time:</span>
            <span class="font-semibold">{{ formatDate(ticketData.show.date) }} at {{ formatTime(ticketData.show.start_time) }}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Location:</span>
            <span class="font-semibold">{{ ticketData.show.location }}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Seat:</span>
            <span class="font-semibold">Section {{ ticketData.seat.section }}, Row {{ ticketData.seat.row_name }}, Seat {{ ticketData.seat.seat_number }}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Customer:</span>
            <span class="font-semibold">{{ ticketData.customer_name }}</span>
          </div>
        </div>
        
        <div class="mt-6 text-center">
          <Button 
            label="Mark as Used" 
            icon="pi pi-check" 
            severity="success" 
            @click="markTicketUsed" 
            :loading="markingUsed"
          />
        </div>
      </div>
    </div>

    <!-- Invalid ticket result -->
    <div v-if="ticketData && !isValid" class="mt-6 max-w-md mx-auto">
      <div class="card bg-red-50 border border-red-200 p-6">
        <div class="text-center mb-4">
          <i class="pi pi-times-circle text-red-500 text-5xl"></i>
          <h2 class="text-xl font-bold text-red-700 mt-2">Invalid Ticket</h2>
          <p class="text-red-600 mt-1">{{ ticketErrorMessage }}</p>
        </div>
      </div>
    </div>

    <div class="mt-8 text-center">
      <Button 
        v-if="ticketData" 
        label="Check Another Ticket" 
        icon="pi pi-replay" 
        @click="resetForm" 
        :disabled="loading || markingUsed"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import jsQR from 'jsqr';

const ticketCode = ref('');
const loading = ref(false);
const error = ref('');
const ticketData = ref(null);
const isValid = ref(false);
const ticketErrorMessage = ref('');
const isScannerActive = ref(false);
const markingUsed = ref(false);

let videoElement = null;
let canvasElement = null;
let canvasContext = null;
let videoStream = null;

// Start QR code scanner
async function startScanner() {
  isScannerActive.value = true;
  error.value = '';
  
  try {
    // Create scanner container elements if they don't exist
    const container = document.getElementById('scanner-container');
    
    // Create video element
    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', 'true'); // required for iOS Safari
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = 'cover';
    
    // Create canvas for processing
    canvasElement = document.createElement('canvas');
    canvasElement.style.display = 'none';
    canvasContext = canvasElement.getContext('2d');
    
    // Add elements to container
    container.innerHTML = '';
    container.appendChild(videoElement);
    container.appendChild(canvasElement);
    
    // Request camera access
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    videoElement.srcObject = videoStream;
    videoElement.play();
    
    // Start scanning
    requestAnimationFrame(scanQRCode);
  } catch (err) {
    console.error('Error starting scanner:', err);
    error.value = 'Could not access camera. Please check permissions or enter code manually.';
    isScannerActive.value = false;
  }
}

// Stop QR code scanner
function stopScanner() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  
  if (videoElement) {
    videoElement.srcObject = null;
  }
  
  isScannerActive.value = false;
}

// Scan for QR codes in video
function scanQRCode() {
  if (!isScannerActive.value || !videoElement || !canvasElement || !canvasContext) {
    return;
  }
  
  if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
    // Set canvas size to match video
    canvasElement.height = videoElement.videoHeight;
    canvasElement.width = videoElement.videoWidth;
    
    // Draw current video frame to canvas
    canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    // Get image data
    const imageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height);
    
    // Process image data with jsQR
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });
    
    // If QR code found, process it
    if (code) {
      // Extract ticket code from URL
      const url = code.data;
      const codeMatch = url.match(/code=([A-Z0-9]+)/);
      
      if (codeMatch && codeMatch[1]) {
        stopScanner();
        ticketCode.value = codeMatch[1];
        verifyTicket();
      }
    }
  }
  
  // Continue scanning
  if (isScannerActive.value) {
    requestAnimationFrame(scanQRCode);
  }
}

// Verify ticket
async function verifyTicket() {
  if (!ticketCode.value.trim()) {
    error.value = 'Please enter a ticket code';
    return;
  }
  
  loading.value = true;
  error.value = '';
  ticketData.value = null;
  isValid.value = false;
  ticketErrorMessage.value = '';
  
  try {
    const { data, error: apiError } = await useFetch('/api/tickets/verify', {
      method: 'POST',
      body: {
        ticket_code: ticketCode.value.trim()
      }
    });
    
    if (apiError.value) {
      throw new Error(apiError.value.message || 'Failed to verify ticket');
    }
    
    if (!data.value) {
      throw new Error('No response received');
    }
    
    // Check if ticket is valid
    if (data.value.valid) {
      ticketData.value = data.value.ticket;
      isValid.value = true;
    } else {
      ticketData.value = {};
      isValid.value = false;
      ticketErrorMessage.value = data.value.message || 'Ticket is invalid';
    }
  } catch (err) {
    console.error('Error verifying ticket:', err);
    error.value = err.message || 'Failed to verify ticket';
  } finally {
    loading.value = false;
  }
}

// Mark ticket as used
async function markTicketUsed() {
  if (!ticketData.value || !ticketData.value.id) {
    return;
  }
  
  markingUsed.value = true;
  
  try {
    const { data, error: apiError } = await useFetch('/api/tickets/mark-used', {
      method: 'POST',
      body: {
        ticket_code: ticketData.value.ticket_code
      }
    });
    
    if (apiError.value) {
      throw new Error(apiError.value.message || 'Failed to mark ticket as used');
    }
    
    // Show success message
    ticketData.value = null;
    resetForm();
    
    // Show success message using PrimeVue toast
    const toast = useToast();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Ticket has been marked as used',
      life: 3000
    });
  } catch (err) {
    console.error('Error marking ticket as used:', err);
    error.value = err.message || 'Failed to mark ticket as used';
  } finally {
    markingUsed.value = false;
  }
}

// Reset form
function resetForm() {
  ticketCode.value = '';
  ticketData.value = null;
  isValid.value = false;
  ticketErrorMessage.value = '';
  error.value = '';
}

// Clean up on component unmount
onBeforeUnmount(() => {
  stopScanner();
});

// Helper functions
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours));
  date.setMinutes(parseInt(minutes));
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
</script>

<style scoped>
#scanner-container {
  position: relative;
  overflow: hidden;
}

#scanner-container video {
  display: block;
  object-fit: cover;
  width: 100%;
  height: 100%;
}
</style>