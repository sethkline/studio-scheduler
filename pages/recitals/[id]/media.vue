<template>
  <div class="p-6">
    <MediaGalleryPage
      v-if="!selectedAlbumId"
      :recital-show-id="recitalShowId"
      @album-selected="handleAlbumSelected"
    />

    <AlbumDetailPage
      v-else
      :album-id="selectedAlbumId"
      @back="selectedAlbumId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  middleware: ['auth', 'staff']
})

const route = useRoute()
const recitalShowId = route.params.id as string
const selectedAlbumId = ref<string | null>(null)

function handleAlbumSelected(albumId: string) {
  selectedAlbumId.value = albumId
}
</script>
