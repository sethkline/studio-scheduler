<script setup lang="ts">
definePageMeta({
  layout: 'auth' // Use minimal layout for public page
})

const route = useRoute()
const accessCode = route.params.accessCode as string

// Fetch access code details
const { data, error, pending } = await useFetch<{
  success: boolean
  access_code: string
  expires_at: string | null
  is_expired: boolean
  download_count: number
  max_downloads: number
  media_item: {
    id: string
    name: string
    description: string | null
    file_size_mb: number | null
    duration_seconds: number | null
  } | null
}>(`/api/media/access/${accessCode}`)

const formatFileSize = (mb: number | null) => {
  if (!mb) return 'Unknown'
  if (mb < 1024) return `${mb.toFixed(2)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

const formatDuration = (seconds: number | null) => {
  if (!seconds) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

const remainingDownloads = computed(() => {
  if (!data.value) return 0
  return data.value.max_downloads - data.value.download_count
})

const isExpired = computed(() => {
  return data.value?.is_expired || false
})

const downloadFile = () => {
  // Navigate to download endpoint which will handle the file download
  window.location.href = `/api/media/download/${accessCode}`
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 py-12">
    <div class="max-w-2xl mx-auto px-4">
      <!-- Loading State -->
      <div v-if="pending" class="flex justify-center items-center py-20">
        <ProgressSpinner />
      </div>

      <!-- Error State -->
      <Card v-else-if="error || !data?.success" class="text-center">
        <template #content>
          <div class="py-8">
            <i class="pi pi-exclamation-triangle text-6xl text-red-500 mb-4"></i>
            <h1 class="text-2xl font-bold mb-2 text-gray-900">Invalid Access Code</h1>
            <p class="text-gray-600">
              This download link is invalid or has expired.
            </p>
            <p class="text-gray-600 mt-4 text-sm">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </template>
      </Card>

      <!-- Expired State -->
      <Card v-else-if="isExpired" class="text-center">
        <template #content>
          <div class="py-8">
            <i class="pi pi-clock text-6xl text-orange-500 mb-4"></i>
            <h1 class="text-2xl font-bold mb-2 text-gray-900">Download Expired</h1>
            <p class="text-gray-600">
              This download link expired on
              <strong>{{ data.expires_at ? formatDate(data.expires_at) : 'N/A' }}</strong>.
            </p>
            <p class="text-gray-600 mt-4">
              Please contact support if you need a new download link.
            </p>
          </div>
        </template>
      </Card>

      <!-- Download Ready -->
      <Card v-else>
        <template #title>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <i class="pi pi-download text-2xl text-primary-600"></i>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Your Download is Ready</h1>
              <p class="text-sm text-gray-600 font-normal">
                {{ data.media_item?.name || 'Digital Download' }}
              </p>
            </div>
          </div>
        </template>

        <template #content>
          <div class="space-y-6">
            <!-- Media Description -->
            <div v-if="data.media_item?.description" class="text-gray-700">
              {{ data.media_item.description }}
            </div>

            <!-- Download Information -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 class="font-semibold mb-3 text-blue-900">Download Information</h3>
              <ul class="space-y-2 text-sm text-blue-800">
                <li class="flex items-start gap-2">
                  <i class="pi pi-check-circle mt-0.5"></i>
                  <span>
                    File size:
                    <strong>{{ formatFileSize(data.media_item?.file_size_mb || null) }}</strong>
                  </span>
                </li>
                <li v-if="data.media_item?.duration_seconds" class="flex items-start gap-2">
                  <i class="pi pi-check-circle mt-0.5"></i>
                  <span>
                    Duration:
                    <strong>{{ formatDuration(data.media_item.duration_seconds) }}</strong>
                  </span>
                </li>
                <li class="flex items-start gap-2">
                  <i class="pi pi-check-circle mt-0.5"></i>
                  <span>
                    Format: <strong>HD Video (MP4)</strong>
                  </span>
                </li>
                <li class="flex items-start gap-2">
                  <i class="pi pi-check-circle mt-0.5"></i>
                  <span>
                    Remaining downloads:
                    <strong class="text-primary-600">{{ remainingDownloads }}</strong>
                  </span>
                </li>
                <li v-if="data.expires_at" class="flex items-start gap-2">
                  <i class="pi pi-check-circle mt-0.5"></i>
                  <span>
                    Expires: <strong>{{ formatDate(data.expires_at) }}</strong>
                  </span>
                </li>
              </ul>
            </div>

            <!-- Download Button -->
            <div class="text-center">
              <Button
                label="Download Now"
                icon="pi pi-download"
                size="large"
                class="w-full"
                :disabled="remainingDownloads <= 0"
                @click="downloadFile"
              />
              <p v-if="remainingDownloads <= 0" class="text-red-600 text-sm mt-2">
                Download limit reached
              </p>
            </div>

            <!-- Important Notes -->
            <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
              <h4 class="font-semibold text-gray-900 mb-2">
                <i class="pi pi-info-circle mr-1"></i>
                Important Notes
              </h4>
              <ul class="space-y-1.5 list-disc list-inside">
                <li>Make sure you have enough storage space before downloading</li>
                <li>Download may take 10-30 minutes depending on your internet speed</li>
                <li>Save the file to a location you can easily find later</li>
                <li>You can watch the video with any media player (VLC, Windows Media Player, etc.)</li>
                <li>The video file is DRM-free - you can keep it forever!</li>
              </ul>
            </div>

            <!-- Access Code -->
            <div class="text-center pt-4 border-t">
              <p class="text-xs text-gray-500 mb-1">Your Access Code</p>
              <code class="font-mono font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded">
                {{ accessCode }}
              </code>
              <p class="text-xs text-gray-500 mt-2">
                Save this code in case you need to access your download later
              </p>
            </div>
          </div>
        </template>
      </Card>

      <!-- Support Info -->
      <div class="mt-6 text-center text-sm text-gray-600">
        <p>
          Need help? Contact us at
          <a href="mailto:support@example.com" class="text-primary-600 hover:underline">
            support@example.com
          </a>
        </p>
      </div>
    </div>
  </div>
</template>
