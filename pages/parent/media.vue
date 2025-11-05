<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">Media Gallery</h1>
      <p class="text-gray-600">View and download photos and videos of your dancers</p>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <Select
        v-model="filterStudentId"
        :options="studentOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All My Dancers"
        class="w-full"
        showClear
      />
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
        placeholder="All Events"
        class="w-full"
        showClear
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <ProgressSpinner />
    </div>

    <!-- Empty State -->
    <div v-else-if="mediaItems.length === 0" class="text-center py-12">
      <Card>
        <template #content>
          <i class="pi pi-images text-6xl text-gray-300 mb-4"></i>
          <p class="text-lg text-gray-600 mb-2">No photos or videos yet</p>
          <p class="text-sm text-gray-500">Media will appear here when your dancers are tagged in photos or videos</p>
        </template>
      </Card>
    </div>

    <!-- Media Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <Card v-for="item in mediaItems" :key="item.id" class="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
        <template #header>
          <div class="relative" style="height: 200px; background: #f3f4f6;" @click="viewMedia(item)">
            <img
              v-if="item.media_type === 'photo'"
              :src="item.thumbnail_url || item.download_url"
              :alt="item.title"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center bg-gray-800"
            >
              <i class="pi pi-play-circle text-6xl text-white opacity-75"></i>
            </div>
            <div class="absolute top-2 left-2">
              <Tag :value="item.media_type === 'photo' ? 'Photo' : 'Video'" severity="info" />
            </div>
            <div v-if="item.event_date" class="absolute bottom-2 left-2">
              <Tag :value="formatDate(item.event_date)" severity="secondary" />
            </div>
          </div>
        </template>
        <template #content>
          <h3 class="font-semibold text-sm mb-2 truncate">{{ item.title }}</h3>
          <div class="text-xs text-gray-500 space-y-1">
            <div v-if="item.recital" class="flex items-center gap-1">
              <i class="pi pi-star"></i>
              <span>{{ item.recital.name }}</span>
            </div>
            <div class="flex items-center gap-1">
              <i class="pi pi-users"></i>
              <span>{{ getStudentNames(item) }}</span>
            </div>
          </div>
        </template>
        <template #footer>
          <Button
            label="Download"
            icon="pi pi-download"
            size="small"
            class="w-full"
            @click.stop="downloadMedia(item)"
          />
        </template>
      </Card>
    </div>

    <!-- View Media Dialog -->
    <Dialog
      v-model:visible="showViewDialog"
      :header="selectedMedia?.title"
      :modal="true"
      :style="{ width: '90vw', maxWidth: '1200px' }"
    >
      <div v-if="selectedMedia">
        <div class="mb-4">
          <img
            v-if="selectedMedia.media_type === 'photo'"
            :src="selectedMedia.download_url"
            :alt="selectedMedia.title"
            class="w-full rounded"
          />
          <video
            v-else
            :src="selectedMedia.download_url"
            controls
            class="w-full rounded"
          ></video>
        </div>

        <div class="space-y-3">
          <div v-if="selectedMedia.description">
            <h4 class="font-semibold text-sm text-gray-600 mb-1">Description</h4>
            <p class="text-gray-700">{{ selectedMedia.description }}</p>
          </div>

          <div v-if="selectedMedia.recital">
            <h4 class="font-semibold text-sm text-gray-600 mb-1">Event</h4>
            <p class="text-gray-700">{{ selectedMedia.recital.name }}</p>
          </div>

          <div v-if="selectedMedia.event_date">
            <h4 class="font-semibold text-sm text-gray-600 mb-1">Date</h4>
            <p class="text-gray-700">{{ formatDate(selectedMedia.event_date) }}</p>
          </div>

          <div v-if="selectedMedia.student_tags?.length">
            <h4 class="font-semibold text-sm text-gray-600 mb-1">Tagged Dancers</h4>
            <div class="flex flex-wrap gap-2">
              <Tag
                v-for="tag in selectedMedia.student_tags"
                :key="tag.id"
                :value="`${tag.student?.first_name} ${tag.student?.last_name}`"
              />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Close" icon="pi pi-times" text @click="showViewDialog = false" />
        <Button
          label="Download"
          icon="pi pi-download"
          @click="downloadMedia(selectedMedia!)"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { MediaItemWithDetails } from '~/types/media'

definePageMeta({
  middleware: 'parent',
})

const toast = useToast()

const mediaItems = ref<MediaItemWithDetails[]>([])
const students = ref<any[]>([])
const recitals = ref<any[]>([])
const loading = ref(false)
const showViewDialog = ref(false)
const selectedMedia = ref<MediaItemWithDetails | null>(null)

const filterStudentId = ref<string | null>(null)
const filterMediaType = ref<string | null>(null)
const filterRecitalId = ref<string | null>(null)

const mediaTypeOptions = [
  { label: 'Photos', value: 'photo' },
  { label: 'Videos', value: 'video' },
]

const studentOptions = computed(() => {
  return students.value.map((s) => ({
    label: `${s.first_name} ${s.last_name}`,
    value: s.id,
  }))
})

const recitalOptions = computed(() => {
  const uniqueRecitals = new Map()
  mediaItems.value.forEach((item) => {
    if (item.recital && !uniqueRecitals.has(item.recital.id)) {
      uniqueRecitals.set(item.recital.id, item.recital)
    }
  })
  return Array.from(uniqueRecitals.values()).map((r: any) => ({
    label: r.name,
    value: r.id,
  }))
})

onMounted(() => {
  fetchStudents()
  fetchMedia()
})

async function fetchStudents() {
  try {
    const { data } = await useFetch('/api/parent/students')
    if (data.value) {
      students.value = data.value as any[]
    }
  } catch (error) {
    console.error('Failed to load students:', error)
  }
}

async function fetchMedia() {
  loading.value = true
  try {
    const params: any = {}
    if (filterStudentId.value) params.student_id = filterStudentId.value
    if (filterMediaType.value) params.media_type = filterMediaType.value
    if (filterRecitalId.value) params.recital_id = filterRecitalId.value

    const { data } = await useFetch<MediaItemWithDetails[]>('/api/media', { params })
    if (data.value) {
      mediaItems.value = data.value
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load media', life: 3000 })
  } finally {
    loading.value = false
  }
}

// Watch filters and refetch
watch([filterStudentId, filterMediaType, filterRecitalId], () => {
  fetchMedia()
})

function viewMedia(media: MediaItemWithDetails) {
  selectedMedia.value = media
  showViewDialog.value = true
}

async function downloadMedia(media: MediaItemWithDetails) {
  try {
    const { data } = await useFetch(`/api/media/${media.id}/download`, {
      method: 'POST',
    })

    if (data.value) {
      const response = data.value as any
      // Trigger download
      const link = document.createElement('a')
      link.href = response.download_url
      link.download = response.filename
      link.click()

      toast.add({ severity: 'success', summary: 'Success', detail: 'Download started', life: 3000 })
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to download media', life: 3000 })
  }
}

function getStudentNames(media: MediaItemWithDetails): string {
  if (!media.student_tags || media.student_tags.length === 0) return 'No dancers tagged'
  const names = media.student_tags.map((tag) => tag.student?.first_name || '').filter(Boolean)
  if (names.length === 0) return 'No dancers tagged'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names[0]} & ${names.length - 1} others`
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}
</script>
