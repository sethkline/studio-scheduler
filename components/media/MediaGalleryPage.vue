<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Media Gallery</h1>
        <p class="text-sm text-gray-600 mt-1">
          Photos and videos from {{ recitalShow?.name || 'this recital' }}
        </p>
      </div>
      <div class="flex gap-3">
        <AppButton
          variant="primary"
          @click="showCreateAlbum = true"
          v-if="can('canManageMedia')"
        >
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Album
        </AppButton>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="animate-pulse">
        <div class="bg-gray-200 rounded-lg h-48"></div>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Total Albums</p>
            <p class="text-2xl font-bold mt-1">{{ summary.total_albums }}</p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Photos</p>
            <p class="text-2xl font-bold mt-1 text-blue-600">{{ summary.total_photos }}</p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Videos</p>
            <p class="text-2xl font-bold mt-1 text-purple-600">{{ summary.total_videos }}</p>
          </div>
        </AppCard>
        <AppCard>
          <div class="text-center">
            <p class="text-sm text-gray-500">Total Items</p>
            <p class="text-2xl font-bold mt-1">{{ summary.total_items }}</p>
          </div>
        </AppCard>
      </div>

      <!-- Albums Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AppCard
          v-for="album in albums"
          :key="album.id"
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="openAlbum(album)"
        >
          <div class="aspect-video bg-gray-200 rounded-lg mb-3 overflow-hidden">
            <img
              v-if="album.cover_photo_url"
              :src="album.cover_photo_url"
              :alt="album.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
              <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h3 class="font-medium">{{ album.name }}</h3>
          <p v-if="album.description" class="text-sm text-gray-600 mt-1">{{ album.description }}</p>
          <div class="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span>{{ album.photo_count }} photos</span>
            <span v-if="album.video_count > 0">{{ album.video_count }} videos</span>
          </div>
        </AppCard>
      </div>

      <!-- Empty State -->
      <AppEmptyState
        v-if="albums.length === 0"
        heading="No albums yet"
        description="Create your first album to start sharing photos and videos."
      >
        <template #icon>
          <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </template>
        <template #actions>
          <AppButton variant="primary" @click="showCreateAlbum = true" v-if="can('canManageMedia')">
            Create Album
          </AppButton>
        </template>
      </AppEmptyState>
    </div>

    <!-- Modals -->
    <CreateAlbumModal
      v-model="showCreateAlbum"
      :recital-show-id="props.recitalShowId"
      @created="fetchAlbums"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePermissions } from '~/composables/usePermissions'

const props = defineProps<{ recitalShowId: string }>()
const emit = defineEmits(['album-selected'])

const { can } = usePermissions()

const loading = ref(false)
const recitalShow = ref<any>(null)
const albums = ref<any[]>([])
const summary = ref({
  total_albums: 0,
  total_photos: 0,
  total_videos: 0,
  total_items: 0,
  recent_uploads_count: 0,
  featured_albums_count: 0
})
const showCreateAlbum = ref(false)

async function fetchAlbums() {
  loading.value = true
  try {
    const { data } = await useFetch(`/api/recitals/${props.recitalShowId}/media-albums`)
    albums.value = data.value?.albums || []
    summary.value = data.value?.summary || summary.value
    recitalShow.value = data.value?.recital
  } catch (error) {
    console.error('Failed to fetch albums:', error)
  } finally {
    loading.value = false
  }
}

function openAlbum(album: any) {
  emit('album-selected', album.id)
}

onMounted(() => fetchAlbums())
</script>
