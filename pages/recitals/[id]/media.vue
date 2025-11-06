<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold">Recital Media Gallery</h1>
        <p v-if="recital" class="text-gray-600 mt-1">{{ recital.name }}</p>
      </div>
      <div class="flex gap-3">
        <Button label="Upload Media" icon="pi pi-upload" @click="showUploadDialog = true" />
      </div>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Select
        v-model="filterType"
        :options="typeOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Media Types"
        class="w-full"
        showClear
      />
      <Select
        v-model="filterShow"
        :options="showOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Shows"
        class="w-full"
        showClear
      />
      <InputText
        v-model="searchQuery"
        placeholder="Search media..."
        class="w-full"
      />
    </div>

    <!-- Media Grid -->
    <div v-if="loading" class="text-center py-12">
      <ProgressSpinner />
    </div>

    <div v-else-if="filteredMedia.length === 0" class="text-center py-12 text-gray-500">
      <i class="pi pi-images text-6xl mb-4"></i>
      <p>No media files yet</p>
      <Button label="Upload First Photo" class="mt-4" @click="showUploadDialog = true" />
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div
        v-for="item in filteredMedia"
        :key="item.id"
        class="media-item"
        @click="selectMedia(item)"
      >
        <div class="media-thumbnail">
          <img
            v-if="item.file_type === 'photo'"
            :src="item.publicUrl"
            :alt="item.title || 'Photo'"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-gray-800 flex items-center justify-center">
            <i class="pi pi-video text-4xl text-white"></i>
          </div>
        </div>
        <div class="p-2">
          <p class="text-sm font-semibold text-gray-900 truncate">
            {{ item.title || 'Untitled' }}
          </p>
          <p class="text-xs text-gray-500">
            {{ formatDate(item.uploaded_at) }}
          </p>
          <div v-if="item.tag_count > 0" class="flex items-center gap-1 mt-1 text-xs text-blue-600">
            <i class="pi pi-tag"></i>
            <span>{{ item.tag_count }} tagged</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Dialog -->
    <Dialog
      v-model:visible="showUploadDialog"
      header="Upload Media"
      :modal="true"
      :style="{ width: '600px' }"
    >
      <div class="space-y-4">
        <FileUpload
          name="file"
          :multiple="true"
          accept="image/*,video/*"
          :maxFileSize="50000000"
          @select="handleFileSelect"
        >
          <template #empty>
            <p>Drag and drop files here or click to browse.</p>
          </template>
        </FileUpload>
      </div>

      <template #footer>
        <Button label="Cancel" text @click="showUploadDialog = false" />
        <Button
          label="Upload"
          @click="uploadFiles"
          :loading="uploading"
          :disabled="selectedFiles.length === 0"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'staff']
})

const route = useRoute()
const toast = useToast()

const recitalId = route.params.id as string

const recital = ref<any>(null)
const media = ref<any[]>([])
const shows = ref<any[]>([])
const loading = ref(false)
const uploading = ref(false)
const showUploadDialog = ref(false)
const selectedFiles = ref<any[]>([])
const filterType = ref<string | null>(null)
const filterShow = ref<string | null>(null)
const searchQuery = ref('')

const typeOptions = [
  { label: 'Photos', value: 'photo' },
  { label: 'Videos', value: 'video' }
]

const showOptions = computed(() => {
  return shows.value.map((show) => ({
    label: formatDate(show.show_date),
    value: show.id
  }))
})

const filteredMedia = computed(() => {
  let filtered = media.value

  if (filterType.value) {
    filtered = filtered.filter((m) => m.file_type === filterType.value)
  }
  if (filterShow.value) {
    filtered = filtered.filter((m) => m.show_id === filterShow.value)
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((m) =>
      m.title?.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query)
    )
  }

  return filtered
})

const loadRecital = async () => {
  const { data } = await useFetch(`/api/recitals/${recitalId}`)
  if (data.value) recital.value = data.value
}

const loadShows = async () => {
  const { data } = await useFetch(`/api/recitals/${recitalId}/shows`)
  if (data.value) shows.value = data.value as any[]
}

const loadMedia = async () => {
  loading.value = true
  try {
    const { data } = await useFetch(`/api/recitals/${recitalId}/media/gallery`)
    if (data.value) media.value = data.value as any[]
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load media', life: 3000 })
  } finally {
    loading.value = false
  }
}

const handleFileSelect = (event: any) => {
  selectedFiles.value = event.files
}

const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) return

  uploading.value = true

  try {
    const formData = new FormData()
    selectedFiles.value.forEach((file) => {
      formData.append('file', file)
    })

    await $fetch(`/api/recitals/${recitalId}/media/upload`, {
      method: 'POST',
      body: formData
    })

    toast.add({ severity: 'success', summary: 'Success', detail: 'Media uploaded', life: 3000 })
    showUploadDialog.value = false
    selectedFiles.value = []
    await loadMedia()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Upload failed', life: 3000 })
  } finally {
    uploading.value = false
  }
}

const selectMedia = (item: any) => {
  // TODO: Open media detail/tagging dialog
  console.log('Selected media:', item)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
  loadRecital()
  loadShows()
  loadMedia()
})
</script>

<style scoped>
.media-item {
  @apply border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow;
}

.media-thumbnail {
  @apply w-full h-48 bg-gray-100;
}
</style>
