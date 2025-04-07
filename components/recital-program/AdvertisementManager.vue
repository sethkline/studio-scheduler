<template>
  <div class="advertisement-manager">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Program Advertisements</h3>
      <Button 
        label="Add Advertisement" 
        icon="pi pi-plus" 
        @click="openNewAdDialog" 
        :disabled="loading"
      />
    </div>
    
    <div v-if="advertisements.length === 0" class="p-4 text-center bg-gray-50 rounded-lg">
      <i class="pi pi-info-circle text-2xl text-gray-400 mb-2"></i>
      <p class="text-gray-500">No advertisements have been added yet.</p>
      <p class="text-sm text-gray-400 mt-2">
        Click "Add Advertisement" to include sponsor ads, business cards, or congratulatory messages.
      </p>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="ad in sortedAdvertisements" :key="ad.id" class="card p-0 shadow-sm">
        <div class="relative">
          <!-- Ad Image -->
          <div class="h-48 overflow-hidden bg-gray-100 flex items-center justify-center">
            <img 
              v-if="ad.image_url" 
              :src="ad.image_url" 
              :alt="ad.title" 
              class="w-full h-full object-contain"
            />
            <div v-else class="text-center p-4">
              <i class="pi pi-image text-3xl text-gray-300"></i>
              <p class="text-sm text-gray-400">No image</p>
            </div>
            
            <!-- Position indicator -->
            <div class="absolute top-2 left-2 bg-gray-900 bg-opacity-70 text-white px-2 py-1 rounded-full text-xs">
              Position: {{ ad.order_position }}
            </div>
          </div>
          
          <!-- Ad Content -->
          <div class="p-3">
            <h4 class="font-semibold text-lg mb-1 text-gray-800">{{ ad.title }}</h4>
            <p v-if="ad.description" class="text-sm text-gray-600 mb-3 line-clamp-2">
              {{ ad.description }}
            </p>
            
            <!-- Actions -->
            <div class="flex gap-2 mt-2">
              <Button 
                icon="pi pi-pencil" 
                class="p-button-sm p-button-outlined flex-1" 
                @click="editAdvertisement(ad)"
              />
              <Button 
                icon="pi pi-arrow-up" 
                class="p-button-sm p-button-outlined p-button-secondary" 
                @click="moveAdUp(ad)"
                :disabled="isFirstAd(ad)"
              />
              <Button 
                icon="pi pi-arrow-down" 
                class="p-button-sm p-button-outlined p-button-secondary" 
                @click="moveAdDown(ad)"
                :disabled="isLastAd(ad)"
              />
              <Button 
                icon="pi pi-trash" 
                class="p-button-sm p-button-outlined p-button-danger" 
                @click="confirmDeleteAd(ad)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Advertisement Dialog -->
    <Dialog 
      v-model:visible="adDialog.visible" 
      :header="adDialog.title" 
      modal 
      style="width: 90vw; max-width: 600px;"
    >
      <Form 
        v-slot="$form" 
        :initialValues="adDialog.data"
        :resolver="formResolver"
        @submit="saveAdvertisement"
        class="space-y-4"
      >
        <div class="flex flex-col gap-1">
          <label for="adTitle" class="font-medium">Advertisement Title</label>
          <InputText 
            id="adTitle" 
            name="title"
            class="w-full" 
          />
          <Message 
            v-if="$form.title?.invalid" 
            severity="error" 
            size="small" 
            variant="simple"
          >
            {{ $form.title.error?.message }}
          </Message>
        </div>
        
        <div class="flex flex-col gap-1">
          <label for="adDescription" class="font-medium">Description</label>
          <Textarea 
            id="adDescription" 
            name="description"
            rows="3" 
            class="w-full" 
          />
        </div>
        
        <div class="flex flex-col gap-1">
          <label class="font-medium mb-2 block">Advertisement Image</label>
          
          <!-- Current image preview -->
          <div 
            v-if="adDialog.data.image_url || adDialog.imagePreview" 
            class="mb-3 p-2 border border-gray-200 rounded-md"
          >
            <img 
              :src="adDialog.imagePreview || adDialog.data.image_url" 
              class="max-h-32 mx-auto object-contain" 
              alt="Advertisement Preview"
            />
          </div>
          
          <FileUpload
            mode="basic"
            :chooseLabel="adDialog.data.image_url ? 'Change Image' : 'Choose Image'"
            accept="image/*"
            :maxFileSize="5000000"
            @select="onSelectAdImage"
            @uploader="onUpload"
            :auto="false"
            customUpload
          />
          
          <small v-if="adDialog.imageError" class="p-error block mt-1">
            {{ adDialog.imageError }}
          </small>
        </div>
        
        <div class="flex flex-col gap-1">
          <label for="adPosition" class="font-medium">Position in Program</label>
          <InputNumber 
            id="adPosition" 
            name="order_position"
            class="w-full" 
            :min="1"
            :max="advertisements.length + (adDialog.isNew ? 1 : 0)"
          />
          <small class="text-gray-500">
            Determines the order ads appear in the program
          </small>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <Button 
            type="button"
            label="Cancel" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="closeAdDialog"
          />
          <Button 
            type="submit"
            label="Save" 
            icon="pi pi-check" 
            :loading="adDialog.saving"
          />
        </div>
      </Form>
    </Dialog>
    
    <!-- Delete Confirmation -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { Form } from '@primevue/forms';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';


// Props
const props = defineProps({
  advertisements: {
    type: Array,
    required: true,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['add', 'update', 'delete']);

// Services
const confirm = useConfirm();

// Create a zod schema for form validation
const adSchema = z.object({
  title: z.string().min(1, "Advertisement title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().optional(),
  order_position: z.number().min(1, "Position must be at least 1")
});

// Create a resolver using the zod schema
const formResolver = zodResolver(adSchema);

// Computed
const sortedAdvertisements = computed(() => {
  return [...props.advertisements].sort((a, b) => a.order_position - b.order_position);
});

// Local state
const adDialog = reactive({
  visible: false,
  title: 'Add Advertisement',
  data: {
    id: null,
    title: '',
    description: '',
    image_url: null,
    image: null, // For file upload
    order_position: 1
  },
  originalData: null,
  imagePreview: null,
  imageError: null,
  isNew: true,
  saving: false
});

// Methods
function openNewAdDialog() {
  // Reset dialog data
  adDialog.data = {
    id: null,
    title: '',
    description: '',
    image_url: null,
    image: null,
    order_position: props.advertisements.length + 1
  };
  adDialog.originalData = null;
  adDialog.imagePreview = null;
  adDialog.imageError = null;
  adDialog.isNew = true;
  adDialog.title = 'Add Advertisement';
  adDialog.visible = true;
}

function editAdvertisement(ad) {
  // Set dialog data
  adDialog.data = {
    id: ad.id,
    title: ad.title,
    description: ad.description || '',
    image_url: ad.image_url,
    image: null,
    order_position: ad.order_position
  };
  adDialog.originalData = { ...ad };
  adDialog.imagePreview = null;
  adDialog.imageError = null;
  adDialog.isNew = false;
  adDialog.title = 'Edit Advertisement';
  adDialog.visible = true;
}

function closeAdDialog() {
  adDialog.visible = false;
}

function onSelectAdImage(event) {
  const file = event.files[0];
  
  // Reset error state
  adDialog.imageError = null;
  
  // Validate file type
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!acceptedTypes.includes(file.type)) {
    adDialog.imageError = 'Please select a valid image file (JPG, PNG, or WEBP)';
    return;
  }
  
  // Validate file size (5MB max)
  if (file.size > 5000000) {
    adDialog.imageError = 'File size exceeds the 5MB limit';
    return;
  }
  
  // Create preview
  adDialog.data.image = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    adDialog.imagePreview = e.target.result;
  };
  reader.readAsDataURL(file);
}

function onUpload() {
  // This is required but not used as we're using customUpload
}

function saveAdvertisement(event) {
  try {
    adDialog.saving = true;
    
    // Extract form values from the submit event
    const { values, valid } = event;
    
    if (!valid) return;
    
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('description', values.description || '');
    formData.append('order_position', values.order_position);
    
    if (adDialog.data.image) {
      formData.append('image', adDialog.data.image);
    }
    
    if (adDialog.isNew) {
      // Add new advertisement
      emit('add', formData);
    } else {
      // Update existing advertisement
      emit('update', adDialog.data.id, formData);
    }
    
    // Close the dialog
    closeAdDialog();
  } finally {
    adDialog.saving = false;
  }
}

function isFirstAd(ad) {
  const firstAd = sortedAdvertisements.value[0];
  return firstAd && ad.id === firstAd.id;
}

function isLastAd(ad) {
  const lastAd = sortedAdvertisements.value[sortedAdvertisements.value.length - 1];
  return lastAd && ad.id === lastAd.id;
}

function moveAdUp(ad) {
  // Find the ad before this one
  const index = sortedAdvertisements.value.findIndex(a => a.id === ad.id);
  if (index <= 0) return; // Already at the top
  
  const prevAd = sortedAdvertisements.value[index - 1];
  
  // Swap positions
  const updatedAd = {
    ...ad,
    order_position: prevAd.order_position
  };
  
  const updatedPrevAd = {
    ...prevAd,
    order_position: ad.order_position
  };
  
  // Update both ads
  emit('update', ad.id, { order_position: updatedAd.order_position });
  emit('update', prevAd.id, { order_position: updatedPrevAd.order_position });
}

function moveAdDown(ad) {
  // Find the ad after this one
  const index = sortedAdvertisements.value.findIndex(a => a.id === ad.id);
  if (index < 0 || index >= sortedAdvertisements.value.length - 1) return; // Already at the bottom
  
  const nextAd = sortedAdvertisements.value[index + 1];
  
  // Swap positions
  const updatedAd = {
    ...ad,
    order_position: nextAd.order_position
  };
  
  const updatedNextAd = {
    ...nextAd,
    order_position: ad.order_position
  };
  
  // Update both ads
  emit('update', ad.id, { order_position: updatedAd.order_position });
  emit('update', nextAd.id, { order_position: updatedNextAd.order_position });
}

function confirmDeleteAd(ad) {
  confirm.require({
    message: `Are you sure you want to delete the "${ad.title}" advertisement?`,
    header: 'Delete Advertisement',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => {
      emit('delete', ad.id);
    }
  });
}
</script>