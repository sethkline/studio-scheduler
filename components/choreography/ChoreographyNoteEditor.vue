<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :header="note ? 'Edit Choreography Note' : 'Create Choreography Note'"
    :modal="true"
    :style="{ width: '50rem' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
  >
    <div class="space-y-4 py-4">
      <!-- Title -->
      <div class="flex flex-col">
        <label for="title" class="text-sm font-medium text-gray-700 mb-2">
          Title <span class="text-red-500">*</span>
        </label>
        <InputText
          id="title"
          v-model="formData.title"
          placeholder="e.g., Spring Recital - Opening Number"
          class="w-full"
          :class="{ 'border-red-500': errors.title }"
        />
        <small v-if="errors.title" class="text-red-500 mt-1">{{ errors.title }}</small>
      </div>

      <!-- Class Instance -->
      <div class="flex flex-col">
        <label for="class" class="text-sm font-medium text-gray-700 mb-2">
          Class <span class="text-red-500">*</span>
        </label>
        <Dropdown
          id="class"
          v-model="formData.class_instance_id"
          :options="classInstances"
          optionLabel="name"
          optionValue="id"
          placeholder="Select a class"
          class="w-full"
          :class="{ 'border-red-500': errors.class_instance_id }"
        />
        <small v-if="errors.class_instance_id" class="text-red-500 mt-1">{{ errors.class_instance_id }}</small>
      </div>

      <!-- Description -->
      <div class="flex flex-col">
        <label for="description" class="text-sm font-medium text-gray-700 mb-2">Description</label>
        <Textarea
          id="description"
          v-model="formData.description"
          placeholder="Brief description of the choreography"
          rows="3"
          class="w-full"
        />
      </div>

      <!-- Choreography Notes -->
      <div class="flex flex-col">
        <label for="notes" class="text-sm font-medium text-gray-700 mb-2">
          Choreography Notes
        </label>
        <Textarea
          id="notes"
          v-model="formData.notes"
          placeholder="Detailed notes with counts and movements..."
          rows="8"
          class="w-full font-mono text-sm"
        />
        <small class="text-gray-500 mt-1">
          Document your choreography step-by-step with counts and formations
        </small>
      </div>

      <!-- Counts Notation -->
      <div class="flex flex-col">
        <label for="counts" class="text-sm font-medium text-gray-700 mb-2">Counts Notation</label>
        <InputText
          id="counts"
          v-model="formData.counts_notation"
          placeholder="e.g., 8-count intro, 16-count verse, 32-count chorus"
          class="w-full"
        />
      </div>

      <!-- Music Section -->
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-purple-900 mb-3 flex items-center">
          <i class="pi pi-music mr-2"></i>Music Information
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="flex flex-col">
            <label for="music_title" class="text-sm font-medium text-gray-700 mb-2">Song Title</label>
            <InputText
              id="music_title"
              v-model="formData.music_title"
              placeholder="Song title"
              class="w-full"
            />
          </div>
          <div class="flex flex-col">
            <label for="music_artist" class="text-sm font-medium text-gray-700 mb-2">Artist</label>
            <InputText
              id="music_artist"
              v-model="formData.music_artist"
              placeholder="Artist name"
              class="w-full"
            />
          </div>
        </div>

        <div class="flex flex-col">
          <label for="music_link" class="text-sm font-medium text-gray-700 mb-2">Music Link</label>
          <div class="flex gap-2">
            <InputText
              id="music_link"
              v-model="formData.music_link"
              placeholder="https://spotify.com/... or https://youtube.com/..."
              class="flex-1"
            />
            <Button
              v-if="formData.music_link"
              icon="pi pi-external-link"
              outlined
              @click="openMusicLink"
              title="Open music link"
            />
          </div>
        </div>
      </div>

      <!-- Video Upload Section -->
      <div v-if="note" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-blue-900 mb-3 flex items-center">
          <i class="pi pi-video mr-2"></i>Routine Video
        </h4>

        <!-- Current Video -->
        <div v-if="formData.video_url && !uploadingVideo" class="mb-4">
          <video
            :src="formData.video_url"
            controls
            class="w-full rounded-lg max-h-64"
          />
          <Button
            label="Remove Video"
            icon="pi pi-trash"
            severity="danger"
            text
            size="small"
            @click="removeVideo"
            class="mt-2"
          />
        </div>

        <!-- Upload Progress -->
        <div v-if="uploadingVideo" class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-700">Uploading video...</span>
            <span class="text-sm font-medium text-blue-600">{{ uploadProgress }}%</span>
          </div>
          <ProgressBar :value="uploadProgress" />
        </div>

        <!-- Upload Button -->
        <div v-if="!uploadingVideo">
          <input
            ref="videoInput"
            type="file"
            accept="video/*"
            class="hidden"
            @change="handleVideoUpload"
          />
          <Button
            :label="formData.video_url ? 'Replace Video' : 'Upload Video'"
            icon="pi pi-upload"
            outlined
            @click="$refs.videoInput.click()"
          />
          <small class="block text-gray-500 mt-2">
            Supported formats: MP4, MOV, AVI, WebM (max 100MB)
          </small>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          icon="pi pi-times"
          @click="handleCancel"
          outlined
        />
        <Button
          label="Save"
          icon="pi pi-check"
          @click="handleSave"
          :loading="saving"
          class="bg-blue-600 hover:bg-blue-700 text-white"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { ChoreographyNote } from '~/types'

const props = defineProps<{
  visible: boolean
  note?: ChoreographyNote | null
  classInstances: any[]
}>()

const emit = defineEmits(['update:visible', 'saved'])

const { createChoreographyNote, updateChoreographyNote, uploadVideo } = useChoreographyService()
const { user } = useAuth()
const toast = useToast()

// State
const formData = ref({
  title: '',
  class_instance_id: '',
  teacher_id: '',
  description: '',
  notes: '',
  music_title: '',
  music_artist: '',
  music_link: '',
  video_url: '',
  counts_notation: ''
})

const errors = ref<Record<string, string>>({})
const saving = ref(false)
const uploadingVideo = ref(false)
const uploadProgress = ref(0)
const videoInput = ref<HTMLInputElement>()

// Watch for note changes
watch(() => props.note, (newNote) => {
  if (newNote) {
    formData.value = {
      title: newNote.title,
      class_instance_id: newNote.class_instance_id,
      teacher_id: newNote.teacher_id,
      description: newNote.description || '',
      notes: newNote.notes || '',
      music_title: newNote.music_title || '',
      music_artist: newNote.music_artist || '',
      music_link: newNote.music_link || '',
      video_url: newNote.video_url || '',
      counts_notation: newNote.counts_notation || ''
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// Get teacher ID from current user
const getTeacherId = async () => {
  if (!formData.value.teacher_id && user.value) {
    try {
      const { data } = await useFetch(`/api/teachers?user_id=${user.value.id}`)
      if (data.value && data.value[0]) {
        formData.value.teacher_id = data.value[0].id
      }
    } catch (error) {
      console.error('Failed to get teacher ID:', error)
    }
  }
}

// Validation
const validate = () => {
  errors.value = {}

  if (!formData.value.title) {
    errors.value.title = 'Title is required'
  }

  if (!formData.value.class_instance_id) {
    errors.value.class_instance_id = 'Class is required'
  }

  return Object.keys(errors.value).length === 0
}

// Handlers
const handleSave = async () => {
  if (!validate()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all required fields',
      life: 3000
    })
    return
  }

  saving.value = true
  try {
    await getTeacherId()

    if (props.note) {
      await updateChoreographyNote(props.note.id, formData.value)
    } else {
      await createChoreographyNote(formData.value)
    }

    emit('saved')
    resetForm()
  } catch (error) {
    console.error('Failed to save choreography note:', error)
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
  resetForm()
}

const handleVideoUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // Validate file size (100MB max)
  if (file.size > 100 * 1024 * 1024) {
    toast.add({
      severity: 'error',
      summary: 'File Too Large',
      detail: 'Video file must be less than 100MB',
      life: 3000
    })
    return
  }

  if (!props.note?.id) {
    toast.add({
      severity: 'warn',
      summary: 'Save First',
      detail: 'Please save the choreography note before uploading a video',
      life: 3000
    })
    return
  }

  uploadingVideo.value = true
  uploadProgress.value = 0

  try {
    const videoUrl = await uploadVideo(props.note.id, file, (progress) => {
      uploadProgress.value = progress
    })
    formData.value.video_url = videoUrl
  } catch (error) {
    console.error('Video upload failed:', error)
  } finally {
    uploadingVideo.value = false
    uploadProgress.value = 0
  }
}

const removeVideo = () => {
  formData.value.video_url = ''
}

const openMusicLink = () => {
  if (formData.value.music_link) {
    window.open(formData.value.music_link, '_blank')
  }
}

const resetForm = () => {
  formData.value = {
    title: '',
    class_instance_id: '',
    teacher_id: '',
    description: '',
    notes: '',
    music_title: '',
    music_artist: '',
    music_link: '',
    video_url: '',
    counts_notation: ''
  }
  errors.value = {}
}
</script>
