<template>
  <div class="col-span-2">
    <label class="label">Studio Logo</label>
    <div 
      class="border-2 border-dashed border-gray-300 rounded-lg p-6 relative"
      :class="{ 'hover:border-primary-300 cursor-pointer': !uploading }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
      @click="!uploading && !logoDisplay && triggerFileInput()"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileChange"
      />
      
      <!-- Loading State -->
      <div v-if="uploading" class="text-center">
        <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
        <p class="text-gray-600">Uploading logo...</p>
      </div>
      
      <!-- Logo Preview -->
      <div v-else-if="logoDisplay" class="text-center">
        <div class="relative mb-4 inline-block">
          <img 
            :src="logoDisplay" 
            alt="Studio Logo" 
            class="max-h-40 mx-auto object-contain"
          />
          <button
            type="button"
            @click.stop="handleDeleteLogo"
            class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center hover:bg-red-600"
          >
            <i class="pi pi-times text-xs"></i>
          </button>
        </div>
        <p class="text-sm text-gray-500">Click the X to remove this logo</p>
      </div>
      
      <!-- Upload Prompt -->
      <div v-else class="text-center">
        <i class="pi pi-cloud-upload text-3xl text-gray-400 mb-2"></i>
        <p class="text-gray-500">Drag and drop your logo here or click to browse</p>
        <p class="text-xs text-gray-400 mt-1">PNG, JPG or SVG (max. 2MB)</p>
      </div>
      
      <div v-if="isDragging" class="absolute inset-0 bg-primary-50 bg-opacity-60 rounded-lg flex items-center justify-center z-10">
        <p class="text-primary-500 font-semibold">Drop image to upload</p>
      </div>
      
      <p v-if="errorMessage" class="mt-2 text-sm text-red-500">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits, watch, computed } from 'vue'
import { useToast } from 'primevue/usetoast'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'upload-success', 'upload-error', 'delete-success'])
const toast = useToast()

const fileInput = ref(null)
const uploading = ref(false)
const isDragging = ref(false)
const errorMessage = ref('')
const logo = ref(props.modelValue)
const proxiedLogoUrl = ref(null)

// Computed property to determine which URL to display
const logoDisplay = computed(() => {
  // Prefer the proxied URL if available
  if (proxiedLogoUrl.value) {
    return proxiedLogoUrl.value;
  }
  
  // Otherwise use the original logo URL
  if (logo.value) {
    // Check if it's already a proxied URL
    if (logo.value.startsWith('/api/images/')) {
      return logo.value;
    }
    
    // Try to create a proxied URL from the original URL
    try {
      // For Supabase Storage URLs
      if (logo.value.includes('/storage/v1/object/public/')) {
        const urlParts = logo.value.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          const fullPath = urlParts[1]; // This will be like "studio-assets/studio-logos/filename.png"
          return `/api/images/${fullPath}`;
        }
      }
    } catch (e) {
      console.error('Error creating proxied URL:', e);
    }
    
    // Fall back to the original URL
    return logo.value;
  }
  
  return null;
});

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  logo.value = newValue
  
  // Try to create a proxied URL if it's not already proxied
  if (newValue && !newValue.startsWith('/api/images/')) {
    try {
      // For Supabase Storage URLs
      if (newValue.includes('/storage/v1/object/public/')) {
        const urlParts = newValue.split('/storage/v1/object/public/')
        if (urlParts.length > 1) {
          proxiedLogoUrl.value = `/api/images/${urlParts[1]}`
        }
      }
    } catch (e) {
      console.error('Error creating proxied URL:', e)
      proxiedLogoUrl.value = null
    }
  } else {
    proxiedLogoUrl.value = null
  }
})

// Trigger file input click
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// Handle drag events
const handleDragOver = (e) => {
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

// Handle file drop
const handleDrop = (e) => {
  isDragging.value = false
  const files = e.dataTransfer.files
  if (files.length > 0) {
    handleUpload(files[0])
  }
}

// Handle file selection from input
const handleFileChange = (e) => {
  const files = e.target.files
  if (files.length > 0) {
    handleUpload(files[0])
  }
}

// Upload the file
const handleUpload = async (file) => {
  errorMessage.value = ''
  
  // Validate file type
  if (!file.type.match('image.*')) {
    errorMessage.value = 'Please select an image file'
    return
  }
  
  // Validate file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    errorMessage.value = 'File size should not exceed 2MB'
    return
  }
  
  uploading.value = true
  
  // Create form data
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    // Upload using fetch to handle multipart/form-data
    const response = await fetch('/api/studio/logo', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.statusMessage || 'Upload failed')
    }
    
    const data = await response.json()
    
    // Update the logo preview with the proxied URL if available
    logo.value = data.profile.logo_url
    proxiedLogoUrl.value = data.profile.proxied_logo_url || null
    
    // Emit the new value
    emit('update:modelValue', data.profile.logo_url)
    emit('upload-success', data.profile)
    
    toast.add({
      severity: 'success',
      summary: 'Logo Uploaded',
      detail: 'Studio logo has been uploaded successfully',
      life: 3000
    })
  } catch (error) {
    console.error('Error uploading logo:', error)
    errorMessage.value = error.message || 'Failed to upload logo'
    emit('upload-error', error)
    
    toast.add({
      severity: 'error',
      summary: 'Upload Failed',
      detail: errorMessage.value,
      life: 3000
    })
  } finally {
    uploading.value = false
    // Clear the file input
    if (fileInput.value) {
      fileInput.value.value = null
    }
  }
}

// Delete the logo
const handleDeleteLogo = async () => {
  if (!logo.value) return
  
  uploading.value = true
  errorMessage.value = ''
  
  try {
    const response = await fetch('/api/studio/logo', {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.statusMessage || 'Delete failed')
    }
    
    const data = await response.json()
    
    // Clear the logo
    logo.value = null
    proxiedLogoUrl.value = null
    
    // Emit the new value
    emit('update:modelValue', null)
    emit('delete-success', data.profile)
    
    toast.add({
      severity: 'success',
      summary: 'Logo Deleted',
      detail: 'Studio logo has been removed',
      life: 3000
    })
  } catch (error) {
    console.error('Error deleting logo:', error)
    errorMessage.value = error.message || 'Failed to delete logo'
    
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: errorMessage.value,
      life: 3000
    })
  } finally {
    uploading.value = false
  }
}
</script>