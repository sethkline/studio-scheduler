<template>
  <AppModal v-model="isOpen" title="Upload Media" size="lg" @close="handleClose">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- File Upload -->
      <div>
        <label class="block text-sm font-medium mb-2">Select Photos or Videos</label>
        <div
          @drop.prevent="handleDrop"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          :class="[
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
          ]"
        >
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*,video/*"
            @change="handleFileSelect"
            class="hidden"
          />

          <div v-if="selectedFiles.length === 0">
            <svg class="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="text-gray-600 mb-2">Drag and drop files here, or click to browse</p>
            <AppButton variant="secondary" type="button" @click="$refs.fileInput.click()">Choose Files</AppButton>
          </div>

          <div v-else class="space-y-2">
            <p class="text-sm font-medium text-gray-700">{{ selectedFiles.length }} file(s) selected</p>
            <div class="max-h-32 overflow-y-auto space-y-1">
              <div
                v-for="(file, index) in selectedFiles"
                :key="index"
                class="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
              >
                <span class="truncate flex-1">{{ file.name }}</span>
                <button type="button" @click="removeFile(index)" class="text-red-600 hover:text-red-800 ml-2">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>
            </div>
            <AppButton variant="secondary" type="button" size="sm" @click="$refs.fileInput.click()">Add More</AppButton>
          </div>
        </div>
      </div>

      <!-- Title (optional for single file) -->
      <AppInput
        v-if="selectedFiles.length === 1"
        v-model="form.title"
        label="Title (Optional)"
        placeholder="e.g., Grand Finale Performance"
      />

      <!-- Caption (optional for single file) -->
      <div v-if="selectedFiles.length === 1">
        <label class="block text-sm font-medium mb-1">Caption (Optional)</label>
        <textarea
          v-model="form.caption"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows="2"
          placeholder="Add a caption for this media..."
        ></textarea>
      </div>

      <!-- Privacy -->
      <div>
        <label class="block text-sm font-medium mb-1">Privacy</label>
        <select v-model="form.privacy" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          <option value="public">Public - Everyone can view</option>
          <option value="parents_only">Parents Only - Only parents can view</option>
          <option value="private">Private - Only you can view</option>
        </select>
      </div>

      <!-- Upload Progress -->
      <div v-if="uploading" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-blue-900">Uploading {{ uploadProgress.current }} of {{ uploadProgress.total }}...</span>
          <span class="text-sm text-blue-700">{{ uploadProgress.percent }}%</span>
        </div>
        <div class="w-full bg-blue-200 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: uploadProgress.percent + '%' }"
          ></div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4">
        <AppButton variant="secondary" @click="handleClose" :disabled="uploading">Cancel</AppButton>
        <AppButton
          variant="primary"
          native-type="submit"
          :loading="uploading"
          :disabled="selectedFiles.length === 0"
        >
          Upload {{ selectedFiles.length > 0 ? `(${selectedFiles.length})` : '' }}
        </AppButton>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ modelValue: boolean; albumId: string; recitalShowId: string }>()
const emit = defineEmits(['update:modelValue', 'uploaded'])

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const uploading = ref(false)
const isDragging = ref(false)
const uploadProgress = ref({ current: 0, total: 0, percent: 0 })

const form = ref({
  title: '',
  caption: '',
  privacy: 'parents_only',
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value.push(...Array.from(target.files))
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files) {
    selectedFiles.value.push(...Array.from(event.dataTransfer.files))
  }
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
}

async function handleSubmit() {
  if (selectedFiles.value.length === 0) return

  uploading.value = true
  uploadProgress.value = { current: 0, total: selectedFiles.value.length, percent: 0 }

  try {
    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i]
      const formData = new FormData()
      formData.append('file', file)

      // Only add title/caption for single file uploads
      if (selectedFiles.value.length === 1) {
        if (form.value.title) formData.append('title', form.value.title)
        if (form.value.caption) formData.append('caption', form.value.caption)
      }
      formData.append('privacy', form.value.privacy)

      await $fetch(`/api/media-albums/${props.albumId}/items`, {
        method: 'POST',
        body: formData,
      })

      uploadProgress.value.current = i + 1
      uploadProgress.value.percent = Math.round(((i + 1) / selectedFiles.value.length) * 100)
    }

    emit('uploaded')
    handleClose()
  } catch (error) {
    console.error('Failed to upload media:', error)
  } finally {
    uploading.value = false
  }
}

function handleClose() {
  selectedFiles.value = []
  form.value = { title: '', caption: '', privacy: 'parents_only' }
  uploadProgress.value = { current: 0, total: 0, percent: 0 }
  emit('update:modelValue', false)
}
</script>
