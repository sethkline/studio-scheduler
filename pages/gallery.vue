<template>
  <div>
    <section class="bg-gradient-to-r from-primary to-secondary text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">Photo & Video Gallery</h1>
        <p class="text-xl max-w-2xl mx-auto">
          Explore our studio, performances, and special moments captured through the years.
        </p>
      </div>
    </section>

    <div class="container mx-auto px-4 py-12">
      <!-- Filters -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div class="flex flex-wrap gap-4">
          <button v-for="filter in filters" :key="filter.value" @click="selectedFilter = filter.value"
            :class="[
              'px-6 py-2 rounded-full font-medium transition-all',
              selectedFilter === filter.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]">
            {{ filter.label }}
          </button>
        </div>
      </div>

      <!-- Gallery Grid -->
      <div class="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="item in filteredGallery" :key="item.id"
          @click="openLightbox(item)"
          class="relative aspect-square overflow-hidden rounded-lg cursor-pointer group">
          <img v-if="item.type === 'image'" :src="item.url" :alt="item.title"
            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
          <div v-else class="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <i class="pi pi-play-circle text-white text-6xl" />
          </div>
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-end p-4">
            <div class="text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <div class="font-bold">{{ item.title }}</div>
              <div class="text-sm">{{ item.event }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredGallery.length === 0" class="text-center py-16">
        <i class="pi pi-images text-6xl text-gray-300 mb-4" />
        <h3 class="text-2xl font-bold text-gray-900 mb-2">No Media Found</h3>
        <p class="text-gray-600">Check back soon for new photos and videos!</p>
      </div>
    </div>

    <!-- Lightbox Dialog -->
    <Dialog v-model:visible="showLightbox" modal :style="{ width: '90vw', maxWidth: '1200px' }" :dismissableMask="true">
      <template #header>
        <h3 class="text-xl font-bold">{{ selectedItem?.title }}</h3>
      </template>
      <div v-if="selectedItem" class="flex items-center justify-center">
        <img v-if="selectedItem.type === 'image'" :src="selectedItem.url" :alt="selectedItem.title" class="max-w-full max-h-[70vh]" />
        <div v-else class="aspect-video w-full bg-gray-900 flex items-center justify-center">
          <p class="text-white">Video player placeholder</p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between items-center">
          <span class="text-gray-600">{{ selectedItem?.event }}</span>
          <Button label="Close" @click="showLightbox = false" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

definePageMeta({
  layout: 'public',
})

const { applyTheme } = useTheme()
onMounted(() => {
  applyTheme()
})

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Recitals', value: 'recital' },
  { label: 'Classes', value: 'class' },
  { label: 'Competitions', value: 'competition' },
  { label: 'Events', value: 'event' },
  { label: 'Videos', value: 'video' },
]

const selectedFilter = ref('all')

// Mock gallery data (replace with API call)
const galleryItems = ref([
  { id: 1, type: 'image', url: '/placeholder.jpg', title: 'Spring Recital 2024', event: 'Recital', category: 'recital' },
  // Add more items...
])

const filteredGallery = computed(() => {
  if (selectedFilter.value === 'all') return galleryItems.value
  if (selectedFilter.value === 'video') return galleryItems.value.filter(i => i.type === 'video')
  return galleryItems.value.filter(i => i.category === selectedFilter.value)
})

const showLightbox = ref(false)
const selectedItem = ref<any>(null)

const openLightbox = (item: any) => {
  selectedItem.value = item
  showLightbox.value = true
}
</script>
