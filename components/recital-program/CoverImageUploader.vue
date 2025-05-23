<template>
  <div class="cover-image-uploader">
    <div class="card p-4">
      <h3 class="text-lg font-semibold mb-3">Program Cover Image</h3>
      <p class="text-sm text-gray-600 mb-4">
        Upload a high-quality image for your recital program cover. Recommended size: 2100 x 2775 pixels (US Letter, 300
        DPI).
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Image Preview -->
        <div class="flex flex-col items-center justify-center">
          <div
            class="border-2 border-dashed border-gray-300 rounded-md bg-gray-50 w-full h-80 flex items-center justify-center overflow-hidden relative"
            :class="{ 'border-primary-300 bg-primary-50': hasImage }"
          >
            <img
              v-if="hasImage"
              :src="imagePreview || coverImageProxy || coverImage"
              alt="Cover Preview"
              class="max-w-full max-h-full object-contain"
            />
            <div v-else class="text-center p-4 text-gray-500">
              <i class="pi pi-image text-4xl mb-2"></i>
              <p>No cover image uploaded yet</p>
            </div>

            <!-- Remove button -->
            <Button
              v-if="hasImage"
              icon="pi pi-times"
              class="p-button-rounded p-button-danger p-button-sm absolute top-2 right-2"
              @click="removeImage"
              :disabled="loading"
            />
          </div>

          <small class="text-gray-500 mt-2 text-center">
            <span v-if="hasImage">Current cover image</span>
            <span v-else>Preview area</span>
          </small>
        </div>

        <!-- Upload Controls -->
        <div class="flex flex-col">
          <FileUpload
            mode="basic"
            :chooseLabel="hasImage ? 'Change Image' : 'Choose Image'"
            accept="image/*"
            :maxFileSize="5000000"
            @select="onSelect"
            @uploader="onUpload"
            :auto="false"
            customUpload
            class="mb-4"
          />

          <div v-if="selectedFile" class="mb-4">
            <h4 class="text-sm font-semibold mb-1">Selected file:</h4>
            <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <i class="pi pi-file-image text-primary-500"></i>
              <div class="overflow-hidden">
                <p class="truncate">{{ selectedFile.name }}</p>
                <small class="text-gray-500"> {{ formatFileSize(selectedFile.size) }} • {{ selectedFile.type }} </small>
              </div>
            </div>
          </div>

          <div class="mt-auto">
            <Button
              v-if="selectedFile"
              label="Upload Cover Image"
              icon="pi pi-upload"
              @click="uploadImage"
              :loading="loading"
              class="w-full"
            />

            <div v-if="imageError" class="mt-3 p-3 bg-red-50 text-red-700 rounded border border-red-200">
              <i class="pi pi-exclamation-circle mr-2"></i>
              {{ imageError }}
            </div>

            <div class="mt-4 text-sm text-gray-600">
              <h4 class="font-semibold mb-1">Image Guidelines:</h4>
              <ul class="pl-4 list-disc space-y-1">
                <li>Use high-resolution images (300 DPI)</li>
                <li>US Letter aspect ratio (portrait orientation)</li>
                <li>Maximum file size: 5MB</li>
                <li>Supported formats: JPG, PNG, WEBP</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Props
const props = defineProps({
  coverImage: {
    type: String,
    default: null
  },
  coverImageProxy: {
    type: String,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['upload', 'remove']);

// Local state
const selectedFile = ref(null);
const imagePreview = ref(null);
const imageError = ref(null);

// Computed
const hasImage = computed(() => {
  return !!imagePreview.value || !!props.coverImage;
});

// Methods
function onSelect(event) {
  const file = event.files[0];

  // Reset error state
  imageError.value = null;

  // Validate file type
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!acceptedTypes.includes(file.type)) {
    imageError.value = 'Please select a valid image file (JPG, PNG, or WEBP)';
    selectedFile.value = null;
    return;
  }

  // Validate file size (5MB max)
  if (file.size > 5000000) {
    imageError.value = 'File size exceeds the 5MB limit';
    selectedFile.value = null;
    return;
  }

  // Create preview
  selectedFile.value = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
}

function onUpload() {
  // This is required but not used as we're using customUpload
}

function uploadImage() {
  if (!selectedFile.value) return;

  // Emit the upload event with the file
  emit('upload', selectedFile.value);

  // Reset selected file after upload
  // We'll keep the preview until props.coverImage updates
  selectedFile.value = null;
}

function removeImage() {
  // Emit the remove event
  emit('remove');

  // Reset local state
  selectedFile.value = null;
  imagePreview.value = null;
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1048576) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}
</script>
