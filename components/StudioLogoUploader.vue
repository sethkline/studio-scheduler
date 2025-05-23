<template>
  <div class="studio-logo-upload mt-6">
    <h3 class="text-lg font-semibold mb-2">Studio Logo</h3>
    <p class="text-sm text-gray-600 mb-4">
      Upload your studio logo to appear on the program cover. Recommended size: 200x100px.
    </p>
    
    <div class="flex items-center gap-4">
      <div 
        v-if="logoPreview || studioLogo" 
        class="logo-preview h-20 w-40 flex items-center justify-center border rounded overflow-hidden bg-white"
      >
        <img 
          :src="logoPreview || studioLogo" 
          alt="Studio Logo Preview" 
          class="max-h-full max-w-full object-contain"
        />
      </div>
      <div v-else class="placeholder h-20 w-40 flex items-center justify-center border rounded bg-gray-50">
        <span class="text-sm text-gray-400">No logo uploaded</span>
      </div>
      
      <div class="controls">
        <FileUpload 
          mode="basic" 
          :customUpload="true" 
          @uploader="uploadLogo" 
          accept="image/*" 
          :auto="true"
          :maxFileSize="1000000"
          chooseLabel="Upload Logo"
        />
        <Button 
          v-if="logoPreview || studioLogo"
          icon="pi pi-trash" 
          class="p-button-text p-button-danger mt-2" 
          @click="removeLogo" 
          :loading="loading"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  recitalId: {
    type: String,
    required: true
  },
  programId: {
    type: String,
    required: false
  },
  studioLogo: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['update:studioLogo', 'logo-uploaded', 'logo-removed']);

const supabase = useSupabaseClient();
const toast = useToast();

const logoPreview = ref(null);
const loading = ref(false);

const uploadLogo = async (event) => {
  const file = event.files[0];
  if (!file) return;
  
  if (file.size > 1000000) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Logo image must be less than 1MB',
      life: 3000
    });
    return;
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please upload a JPG, PNG, WEBP, or GIF file',
      life: 3000
    });
    return;
  }
  
  loading.value = true;
  
  try {
    // Create preview (for immediate UI update)
    logoPreview.value = URL.createObjectURL(file);
    
    // Upload to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `studio-logo-${props.recitalId}-${Date.now()}.${fileExt}`;
    const filePath = `recital-logos/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('recital-assets')
      .upload(filePath, file);
      
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data } = supabase.storage
      .from('recital-assets')
      .getPublicUrl(filePath);
    
    const logoUrl = data.publicUrl;
    
    // Update program record
    let updateQuery = supabase.from('recital_programs');
    
    if (props.programId) {
      updateQuery = updateQuery.update({ studio_logo_url: logoUrl }).eq('id', props.programId);
    } else {
      updateQuery = updateQuery.update({ studio_logo_url: logoUrl }).eq('recital_id', props.recitalId);
    }
    
    const { error: updateError } = await updateQuery;
      
    if (updateError) throw updateError;
    
    // Emit events
    emit('update:studioLogo', logoUrl);
    emit('logo-uploaded', logoUrl);
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Studio logo uploaded successfully',
      life: 3000
    });
    
  } catch (error) {
    console.error('Error uploading logo:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to upload studio logo: ${error.message}`,
      life: 3000
    });
    logoPreview.value = null;
  } finally {
    loading.value = false;
  }
};

const removeLogo = async () => {
  loading.value = true;
  
  try {
    // Extract filename from URL
    if (props.studioLogo) {
      const logoUrl = props.studioLogo;
      const urlParts = logoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('recital-assets')
        .remove([`recital-logos/${fileName}`]);
      
      if (deleteError && !deleteError.message.includes('Object not found')) {
        throw deleteError;
      }
    }
    
    // Update database
    let updateQuery = supabase.from('recital_programs');
    
    if (props.programId) {
      updateQuery = updateQuery.update({ studio_logo_url: null }).eq('id', props.programId);
    } else {
      updateQuery = updateQuery.update({ studio_logo_url: null }).eq('recital_id', props.recitalId);
    }
    
    const { error: updateError } = await updateQuery;
      
    if (updateError) throw updateError;
    
    // Reset preview and emit events
    logoPreview.value = null;
    emit('update:studioLogo', null);
    emit('logo-removed');
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Studio logo removed successfully',
      life: 3000
    });
    
  } catch (error) {
    console.error('Error removing logo:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to remove studio logo: ${error.message}`,
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

// If we have a studioLogo prop, set it immediately
onMounted(() => {
  if (props.studioLogo) {
    logoPreview.value = null; // Clear preview if using actual logo
  }
});
</script>