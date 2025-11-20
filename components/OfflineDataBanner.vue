<template>
  <div v-if="shouldShowBanner" class="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-200 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <!-- Offline indicator -->
          <div v-if="isOffline" class="flex items-center gap-2">
            <i class="pi pi-wifi-slash text-amber-600"></i>
            <div>
              <p class="text-sm font-medium text-amber-900">
                You're currently offline
              </p>
              <p v-if="lastSyncTime" class="text-xs text-amber-700">
                Last synced {{ formatTimeAgo(lastSyncTime) }}
              </p>
            </div>
          </div>

          <!-- Stale data warning -->
          <div v-else-if="isDataStale" class="flex items-center gap-2">
            <i class="pi pi-exclamation-triangle text-amber-600"></i>
            <div>
              <p class="text-sm font-medium text-amber-900">
                Data may be outdated
              </p>
              <p class="text-xs text-amber-700">
                Cached {{ formatTimeAgo(cacheTimestamp) }}
              </p>
            </div>
          </div>

          <!-- Pending actions -->
          <div v-if="queuedActionCount > 0" class="flex items-center gap-2 ml-4 pl-4 border-l border-amber-300">
            <i class="pi pi-clock text-amber-600"></i>
            <p class="text-xs text-amber-700">
              {{ queuedActionCount }} pending {{ queuedActionCount === 1 ? 'action' : 'actions' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Retry sync button -->
          <Button
            v-if="isOffline || isDataStale"
            @click="handleRetrySync"
            :disabled="syncInProgress"
            size="small"
            severity="warning"
            outlined
            class="text-xs"
          >
            <i :class="['pi', syncInProgress ? 'pi-spin pi-spinner' : 'pi-refresh']" class="mr-1"></i>
            {{ syncInProgress ? 'Syncing...' : 'Retry' }}
          </Button>

          <!-- Dismiss button -->
          <Button
            @click="dismiss"
            icon="pi pi-times"
            size="small"
            text
            severity="secondary"
            class="text-amber-700"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useOffline } from '~/composables/useOffline'
import { useOfflineStorage } from '~/utils/offlineStorage'
import Button from 'primevue/button'

// Props
const props = defineProps<{
  storeName?: string
  cacheKey?: string
  stalenessThreshold?: number // minutes
}>()

// Composables
const { isOffline, queuedActionCount, syncInProgress, processQueue } = useOffline()
const { getCacheMetadata } = useOfflineStorage()

// State
const dismissed = ref(false)
const cacheTimestamp = ref<number | null>(null)
const lastSyncTime = ref<number | null>(null)

// Staleness threshold (default 30 minutes)
const STALENESS_THRESHOLD_MS = (props.stalenessThreshold || 30) * 60 * 1000

// Computed
const isDataStale = computed(() => {
  if (!cacheTimestamp.value) return false
  const age = Date.now() - cacheTimestamp.value
  return age > STALENESS_THRESHOLD_MS
})

const shouldShowBanner = computed(() => {
  if (dismissed.value) return false
  return isOffline.value || isDataStale.value || queuedActionCount.value > 0
})

// Methods
const checkCacheMetadata = async () => {
  if (!props.storeName || !props.cacheKey) return

  try {
    const metadata = await getCacheMetadata(props.storeName, props.cacheKey)
    if (metadata) {
      cacheTimestamp.value = metadata.timestamp
    }
  } catch (error) {
    console.error('Error checking cache metadata:', error)
  }
}

const handleRetrySync = async () => {
  try {
    await processQueue()
    // Update last sync time
    lastSyncTime.value = Date.now()

    // Re-check cache metadata after sync
    await checkCacheMetadata()
  } catch (error) {
    console.error('Error syncing:', error)
  }
}

const dismiss = () => {
  dismissed.value = true
  // Auto-show again after 5 minutes
  setTimeout(() => {
    dismissed.value = false
  }, 5 * 60 * 1000)
}

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) {
    return 'just now'
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }

  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

// Watch for changes
watch(isOffline, (offline) => {
  if (!offline) {
    // When coming back online, update last sync time
    lastSyncTime.value = Date.now()
    // Automatically retry sync
    handleRetrySync()
  }
})

// Lifecycle
onMounted(async () => {
  // Check cache metadata on mount
  await checkCacheMetadata()

  // Poll cache metadata every minute
  const interval = setInterval(async () => {
    await checkCacheMetadata()
  }, 60 * 1000)

  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>

<style scoped>
/* Ensure banner appears above everything */
.z-50 {
  z-index: 9999;
}
</style>
