<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Media Gallery</h1>
      <Button label="Upload Media" icon="pi pi-upload" @click="showUploadDialog = true" />
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <Select
        v-model="filterMediaType"
        :options="mediaTypeOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Media Types"
        class="w-full"
        showClear
      />
      <Select
        v-model="filterRecitalId"
        :options="recitalOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Recitals"
        class="w-full"
        showClear
      />
      <Select
        v-model="filterVisibility"
        :options="visibilityOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Visibility"
        class="w-full"
        showClear
      />
    </div>

    <!-- Media Grid -->
    <div v-if="loading" class="text-center py-8">
      <ProgressSpinner />
    </div>

    <div v-else-if="filteredMedia.length === 0" class="text-center py-8">
      <i class="pi pi-images text-6xl text-gray-300 mb-4"></i>
      <p class="text-lg text-gray-600">No media items found</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <Card v-for="item in filteredMedia" :key="item.id" class="overflow-hidden">
        <template #header>
          <div class="relative" style="height: 200px; background: #f3f4f6;">
            <img
              v-if="item.media_type === 'photo'"
              :src="item.thumbnail_url || item.download_url"
              :alt="item.title"
              class="w-full h-full object-cover cursor-pointer"
              @click="viewMedia(item)"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center cursor-pointer"
              @click="viewMedia(item)"
            >
              <i class="pi pi-play-circle text-6xl text-gray-400"></i>
            </div>
            <div class="absolute top-2 right-2">
              <Tag :value="item.media_type" />
            </div>
          </div>
        </template>
        <template #content>
          <h3 class="font-semibold text-sm mb-2 truncate">{{ item.title }}</h3>
          <div class="text-xs text-gray-500 space-y-1">
            <div v-if="item.recital">{{ item.recital.name }}</div>
            <div v-if="item.event_date">{{ formatDate(item.event_date) }}</div>
            <div class="flex items-center gap-1">
              <i class="pi pi-users text-xs"></i>
              <span>{{ item.student_tags?.length || 0 }} tagged</span>
            </div>
            <div class="flex items-center gap-1">
              <i class="pi pi-download text-xs"></i>
              <span>{{ item.download_count }} downloads</span>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" text rounded size="small" @click="editMedia(item)" />
            <Button icon="pi pi-users" text rounded size="small" @click="tagStudents(item)" v-tooltip.top="'Tag Students'" />
            <Button
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              @click="confirmDelete(item)"
            />
          </div>
        </template>
      </Card>
    </div>

    <!-- Upload Dialog -->
    <Dialog v-model:visible="showUploadDialog" header="Upload Media" :modal="true" :style="{ width: '600px' }">
      <div class="space-y-4">
        <div>
          <label class="block mb-2">Select File *</label>
          <input
            ref="fileInput"
            type="file"
            accept="image/*,video/*"
            @change="handleFileSelect"
            class="w-full"
          />
          <small class="text-gray-500">Max file size: 5GB. Supported: images and videos</small>
        </div>

        <div v-if="uploadForm.file" class="bg-gray-50 p-4 rounded">
          <div class="flex items-center gap-2">
            <i :class="uploadForm.media_type === 'photo' ? 'pi pi-image' : 'pi pi-video'" class="text-2xl"></i>
            <div class="flex-1">
              <div class="font-semibold">{{ uploadForm.file.name }}</div>
              <div class="text-sm text-gray-500">{{ formatFileSize(uploadForm.file.size) }}</div>
            </div>
          </div>
        </div>

        <div>
          <label class="block mb-2">Title *</label>
          <InputText v-model="uploadForm.title" class="w-full" placeholder="Media title" />
        </div>

        <div>
          <label class="block mb-2">Description</label>
          <Textarea v-model="uploadForm.description" rows="3" class="w-full" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-2">Recital</label>
            <Select
              v-model="uploadForm.recital_id"
              :options="recitalOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select recital"
              class="w-full"
              showClear
            />
          </div>
          <div>
            <label class="block mb-2">Event Date</label>
            <DatePicker v-model="uploadForm.event_date" dateFormat="yy-mm-dd" class="w-full" showIcon />
          </div>
        </div>

        <div>
          <label class="block mb-2">Visibility</label>
          <Select
            v-model="uploadForm.visibility"
            :options="visibilityOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select visibility"
            class="w-full"
          />
        </div>

        <div>
          <label class="block mb-2">Tag Students</label>
          <MultiSelect
            v-model="uploadForm.student_ids"
            :options="studentOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select students"
            class="w-full"
            filter
          />
        </div>

        <div v-if="uploading" class="bg-blue-50 p-4 rounded">
          <div class="flex items-center gap-2 mb-2">
            <ProgressSpinner style="width: 20px; height: 20px" />
            <span>Uploading...</span>
          </div>
          <ProgressBar :value="uploadProgress" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="cancelUpload" :disabled="uploading" />
        <Button label="Upload" icon="pi pi-upload" @click="uploadMedia" :loading="uploading" />
      </template>
    </Dialog>

    <!-- Edit Dialog -->
    <Dialog v-model:visible="showEditDialog" header="Edit Media" :modal="true" :style="{ width: '600px' }">
      <div v-if="selectedMedia" class="space-y-4">
        <div>
          <label class="block mb-2">Title</label>
          <InputText v-model="editForm.title" class="w-full" />
        </div>

        <div>
          <label class="block mb-2">Description</label>
          <Textarea v-model="editForm.description" rows="3" class="w-full" />
        </div>

        <div>
          <label class="block mb-2">Visibility</label>
          <Select
            v-model="editForm.visibility"
            :options="visibilityOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="showEditDialog = false" />
        <Button label="Save" icon="pi pi-check" @click="saveEdit" :loading="saving" />
      </template>
    </Dialog>

    <!-- Tag Students Dialog -->
    <Dialog v-model:visible="showTagDialog" header="Tag Students" :modal="true" :style="{ width: '600px' }">
      <div v-if="selectedMedia" class="space-y-4">
        <p class="text-gray-700">Select students who appear in this media:</p>
        <MultiSelect
          v-model="tagForm.student_ids"
          :options="studentOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select students"
          class="w-full"
          filter
        />
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="showTagDialog = false" />
        <Button label="Save Tags" icon="pi pi-check" @click="saveTags" :loading="saving" />
      </template>
    </Dialog>

    <!-- View Media Dialog -->
    <Dialog v-model:visible="showViewDialog" :header="selectedMedia?.title" :modal="true" :style="{ width: '80vw' }">
      <div v-if="selectedMedia">
        <img
          v-if="selectedMedia.media_type === 'photo'"
          :src="selectedMedia.download_url"
          :alt="selectedMedia.title"
          class="w-full"
        />
        <video
          v-else
          :src="selectedMedia.download_url"
          controls
          class="w-full"
        ></video>
        <div class="mt-4">
          <p v-if="selectedMedia.description" class="text-gray-700 mb-2">{{ selectedMedia.description }}</p>
          <div class="text-sm text-gray-500">
            <div v-if="selectedMedia.student_tags?.length">
              Tagged: {{ selectedMedia.student_tags.map(t => `${t.student?.first_name} ${t.student?.last_name}`).join(', ') }}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { MediaItemWithDetails } from '~/types/media'

definePageMeta({
  middleware: 'staff',
})

const toast = useToast()
const confirm = useConfirm()
const fileInput = ref()

const mediaItems = ref<MediaItemWithDetails[]>([])
const recitals = ref<any[]>([])
const students = ref<any[]>([])
const loading = ref(false)
const uploading = ref(false)
const saving = ref(false)
const uploadProgress = ref(0)

const showUploadDialog = ref(false)
const showEditDialog = ref(false)
const showTagDialog = ref(false)
const showViewDialog = ref(false)
const selectedMedia = ref<MediaItemWithDetails | null>(null)

const filterMediaType = ref<string | null>(null)
const filterRecitalId = ref<string | null>(null)
const filterVisibility = ref<string | null>(null)

const uploadForm = ref<any>({
  file: null,
  title: '',
  description: '',
  media_type: 'photo',
  recital_id: undefined,
  event_date: undefined,
  visibility: 'students_only',
  student_ids: [],
})

const editForm = ref({
  title: '',
  description: '',
  visibility: 'students_only',
})

const tagForm = ref({
  student_ids: [],
})

const mediaTypeOptions = [
  { label: 'Photos', value: 'photo' },
  { label: 'Videos', value: 'video' },
]

const visibilityOptions = [
  { label: 'Public', value: 'public' },
  { label: 'Students Only', value: 'students_only' },
  { label: 'Private', value: 'private' },
]

const recitalOptions = computed(() => {
  return recitals.value.map((r) => ({
    label: r.name,
    value: r.id,
  }))
})

const studentOptions = computed(() => {
  return students.value.map((s) => ({
    label: `${s.first_name} ${s.last_name}`,
    value: s.id,
  }))
})

const filteredMedia = computed(() => {
  return mediaItems.value.filter((item) => {
    const typeMatch = !filterMediaType.value || item.media_type === filterMediaType.value
    const recitalMatch = !filterRecitalId.value || item.recital_id === filterRecitalId.value
    const visibilityMatch = !filterVisibility.value || item.visibility === filterVisibility.value
    return typeMatch && recitalMatch && visibilityMatch
  })
})

onMounted(() => {
  fetchMedia()
  fetchRecitals()
  fetchStudents()
})

async function fetchMedia() {
  loading.value = true
  try {
    const { data } = await useFetch<MediaItemWithDetails[]>('/api/media')
    if (data.value) {
      mediaItems.value = data.value
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load media', life: 3000 })
  } finally {
    loading.value = false
  }
}

async function fetchRecitals() {
  try {
    const { data } = await useFetch('/api/recitals')
    if (data.value) {
      recitals.value = data.value as any[]
    }
  } catch (error) {
    console.error('Failed to load recitals:', error)
  }
}

async function fetchStudents() {
  try {
    const { data } = await useFetch('/api/students')
    if (data.value) {
      students.value = data.value as any[]
    }
  } catch (error) {
    console.error('Failed to load students:', error)
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    uploadForm.value.file = file
    uploadForm.value.media_type = file.type.startsWith('image/') ? 'photo' : 'video'
    if (!uploadForm.value.title) {
      uploadForm.value.title = file.name.replace(/\.[^/.]+$/, '')
    }
  }
}

async function uploadMedia() {
  if (!uploadForm.value.file || !uploadForm.value.title) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'File and title are required', life: 3000 })
    return
  }

  uploading.value = true
  uploadProgress.value = 0

  try {
    const formData = new FormData()
    formData.append('file', uploadForm.value.file)
    formData.append('title', uploadForm.value.title)
    formData.append('media_type', uploadForm.value.media_type)

    if (uploadForm.value.description) formData.append('description', uploadForm.value.description)
    if (uploadForm.value.recital_id) formData.append('recital_id', uploadForm.value.recital_id)
    if (uploadForm.value.event_date) {
      const date = typeof uploadForm.value.event_date === 'string'
        ? uploadForm.value.event_date
        : new Date(uploadForm.value.event_date).toISOString().split('T')[0]
      formData.append('event_date', date)
    }
    formData.append('visibility', uploadForm.value.visibility)
    if (uploadForm.value.student_ids.length > 0) {
      formData.append('student_ids', JSON.stringify(uploadForm.value.student_ids))
    }

    await $fetch('/api/media/upload', {
      method: 'POST',
      body: formData,
    })

    toast.add({ severity: 'success', summary: 'Success', detail: 'Media uploaded successfully', life: 3000 })
    await fetchMedia()
    cancelUpload()
  } catch (error: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.data?.message || 'Upload failed', life: 3000 })
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

function cancelUpload() {
  showUploadDialog.value = false
  uploadForm.value = {
    file: null,
    title: '',
    description: '',
    media_type: 'photo',
    recital_id: undefined,
    event_date: undefined,
    visibility: 'students_only',
    student_ids: [],
  }
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function editMedia(media: MediaItemWithDetails) {
  selectedMedia.value = media
  editForm.value = {
    title: media.title,
    description: media.description || '',
    visibility: media.visibility,
  }
  showEditDialog.value = true
}

async function saveEdit() {
  if (!selectedMedia.value) return

  saving.value = true
  try {
    await $fetch(`/api/media/${selectedMedia.value.id}`, {
      method: 'PUT',
      body: editForm.value,
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Media updated', life: 3000 })
    await fetchMedia()
    showEditDialog.value = false
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update media', life: 3000 })
  } finally {
    saving.value = false
  }
}

function tagStudents(media: MediaItemWithDetails) {
  selectedMedia.value = media
  tagForm.value.student_ids = media.student_tags?.map((t) => t.student_id) || []
  showTagDialog.value = true
}

async function saveTags() {
  if (!selectedMedia.value) return

  saving.value = true
  try {
    await $fetch(`/api/media/${selectedMedia.value.id}/tag-students`, {
      method: 'POST',
      body: { student_ids: tagForm.value.student_ids },
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Students tagged', life: 3000 })
    await fetchMedia()
    showTagDialog.value = false
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to tag students', life: 3000 })
  } finally {
    saving.value = false
  }
}

function viewMedia(media: MediaItemWithDetails) {
  selectedMedia.value = media
  showViewDialog.value = true
}

function confirmDelete(media: MediaItemWithDetails) {
  confirm.require({
    message: 'Are you sure you want to delete this media? This cannot be undone.',
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: () => deleteMedia(media),
  })
}

async function deleteMedia(media: MediaItemWithDetails) {
  try {
    await $fetch(`/api/media/${media.id}`, {
      method: 'DELETE',
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Media deleted', life: 3000 })
    await fetchMedia()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete media', life: 3000 })
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}
</script>
