<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <button @click="$emit('back')" class="text-gray-600 hover:text-gray-900">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 class="text-2xl font-bold text-gray-900">{{ album?.name }}</h2>
          <span v-if="album?.is_featured" class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">Featured</span>
        </div>
        <p v-if="album?.description" class="text-gray-600">{{ album.description }}</p>
        <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span>{{ items.length }} items</span>
          <span>•</span>
          <span>{{ privacyLabel }}</span>
        </div>
      </div>
      <div class="flex gap-2">
        <AppButton variant="primary" @click="showUploadModal = true">Upload Media</AppButton>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex gap-6">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          :class="[
            'pb-3 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === tab.value
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Media Grid -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="filteredItems.length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p class="text-gray-500">No {{ activeTab === 'all' ? 'media' : activeTab === 'photos' ? 'photos' : 'videos' }} in this album yet</p>
      <AppButton variant="primary" class="mt-4" @click="showUploadModal = true">Upload First Item</AppButton>
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        @click="openLightbox(item)"
        class="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
      >
        <!-- Thumbnail -->
        <img
          v-if="item.media_type === 'photo'"
          :src="item.thumbnail_url || item.file_url"
          :alt="item.title || 'Photo'"
          class="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div v-else class="relative w-full h-full">
          <video
            :src="item.file_url"
            class="w-full h-full object-cover"
            preload="metadata"
          />
          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        <!-- Overlay Info -->
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <p v-if="item.title" class="text-white text-sm font-medium truncate">{{ item.title }}</p>
          <div class="flex items-center gap-3 text-white text-xs mt-1">
            <span class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {{ item.likes?.length || 0 }}
            </span>
            <span class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
              {{ item.comments?.length || 0 }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Modal -->
    <UploadMediaModal
      v-model="showUploadModal"
      :album-id="albumId"
      :recital-show-id="album?.recital_show_id"
      @uploaded="handleMediaUploaded"
    />

    <!-- Lightbox -->
    <MediaLightbox
      v-model="showLightbox"
      :item="selectedItem"
      @close="showLightbox = false"
      @delete="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { MediaItem, MediaAlbum } from '~/types/tier1-features'

const props = defineProps<{ albumId: string }>()
const emit = defineEmits(['back'])

const loading = ref(false)
const album = ref<MediaAlbum | null>(null)
const items = ref<MediaItem[]>([])
const activeTab = ref<'all' | 'photos' | 'videos'>('all')
const showUploadModal = ref(false)
const showLightbox = ref(false)
const selectedItem = ref<MediaItem | null>(null)

const tabs = [
  { label: 'All', value: 'all' },
  { label: 'Photos', value: 'photos' },
  { label: 'Videos', value: 'videos' },
]

const privacyLabel = computed(() => {
  if (!album.value) return ''
  const labels = {
    public: 'Public',
    parents_only: 'Parents Only',
    private: 'Private',
  }
  return labels[album.value.privacy] || album.value.privacy
})

const filteredItems = computed(() => {
  if (activeTab.value === 'all') return items.value
  if (activeTab.value === 'photos') return items.value.filter(item => item.media_type === 'photo')
  if (activeTab.value === 'videos') return items.value.filter(item => item.media_type === 'video')
  return items.value
})

async function fetchItems() {
  loading.value = true
  try {
    const { data } = await useFetch(`/api/media-albums/${props.albumId}/items`)
    album.value = data.value?.album || null
    items.value = data.value?.items || []
  } catch (error) {
    console.error('Failed to fetch media items:', error)
  } finally {
    loading.value = false
  }
}

function openLightbox(item: MediaItem) {
  selectedItem.value = item
  showLightbox.value = true
}

function handleMediaUploaded() {
  fetchItems()
}

function handleDelete(itemId: string) {
  items.value = items.value.filter(item => item.id !== itemId)
  showLightbox.value = false
}

onMounted(() => {
  fetchItems()
})
</script>
