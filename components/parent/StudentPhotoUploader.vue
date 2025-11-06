<template>
  <div class="student-photo-upload">
    <label class="font-medium mb-2 block">Student Photo</label>
    <p class="text-sm text-gray-600 mb-3">Upload a photo of your dancer. Maximum size: 5MB.</p>

    <div class="flex items-center gap-4">
      <!-- Photo Preview -->
      <div
        class="photo-preview h-32 w-32 flex items-center justify-center rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200"
      >
        <img
          v-if="photoPreview || photoUrl"
          :src="photoPreview || photoUrl"
          alt="Student Photo"
          class="h-full w-full object-cover"
        />
        <div v-else class="text-center">
          <i class="pi pi-user text-4xl text-gray-400"></i>
        </div>
      </div>

      <!-- Upload Controls -->
      <div class="flex flex-col gap-2">
        <FileUpload
          mode="basic"
          :customUpload="true"
          @uploader="uploadPhoto"
          accept="image/*"
          :auto="true"
          :maxFileSize="5000000"
          chooseLabel="Upload Photo"
          :disabled="loading"
        />
        <Button
          v-if="photoPreview || photoUrl"
          label="Remove Photo"
          icon="pi pi-trash"
          size="small"
          severity="danger"
          outlined
          @click="removePhoto"
          :loading="loading"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useParentStudentService } from '~/composables/useParentStudentService'

interface Props {
  studentId?: string
  photoUrl?: string
  modelValue?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue', 'photo-uploaded', 'photo-removed'])

const toast = useToast()
const { uploadStudentPhoto, removeStudentPhoto } = useParentStudentService()

const photoPreview = ref<string | null>(null)
const loading = ref(false)

// Watch for photoUrl prop changes
watch(
  () => props.photoUrl,
  (newPhotoUrl) => {
    if (newPhotoUrl && !photoPreview.value) {
      photoPreview.value = null // Use actual photo URL instead of preview
    }
  },
  { immediate: true }
)

const uploadPhoto = async (event: any) => {
  const file = event.files[0]
  if (!file) return

  // Validate file size
  if (file.size > 5000000) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Photo must be less than 5MB',
      life: 3000,
    })
    return
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please upload a JPG, PNG, WEBP, or GIF file',
      life: 3000,
    })
    return
  }

  loading.value = true

  try {
    // Create preview for immediate UI feedback
    photoPreview.value = URL.createObjectURL(file)

    // If we have a studentId, upload to server
    if (props.studentId) {
      const { data, error } = await uploadStudentPhoto(props.studentId, file)

      if (error.value) {
        throw new Error(error.value.message || 'Failed to upload photo')
      }

      const uploadedUrl = data.value?.photo_url
      if (uploadedUrl) {
        emit('update:modelValue', uploadedUrl)
        emit('photo-uploaded', uploadedUrl)

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Photo uploaded successfully',
          life: 3000,
        })
      }
    } else {
      // If no studentId, just emit the file for parent to handle
      emit('update:modelValue', photoPreview.value)
      emit('photo-uploaded', file)
    }
  } catch (error: any) {
    console.error('Error uploading photo:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to upload photo',
      life: 3000,
    })
    photoPreview.value = null
  } finally {
    loading.value = false
  }
}

const removePhoto = async () => {
  loading.value = true

  try {
    // If we have a studentId, delete from server
    if (props.studentId) {
      const { error } = await removeStudentPhoto(props.studentId)

      if (error.value) {
        throw new Error(error.value.message || 'Failed to remove photo')
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Photo removed successfully',
        life: 3000,
      })
    }

    // Reset preview and emit events
    photoPreview.value = null
    emit('update:modelValue', null)
    emit('photo-removed')
  } catch (error: any) {
    console.error('Error removing photo:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to remove photo',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.photo-preview {
  transition: all 0.3s ease;
}

.photo-preview:hover {
  border-color: #94a3b8;
}
</style>
