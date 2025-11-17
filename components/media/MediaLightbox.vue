<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen && item"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
        @click.self="handleClose"
      >
        <div class="relative w-full h-full max-w-7xl mx-auto p-4 flex">
          <!-- Close Button -->
          <button
            @click="handleClose"
            class="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
          >
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Media Viewer (Left Side) -->
          <div class="flex-1 flex items-center justify-center pr-4">
            <div class="max-w-full max-h-full">
              <img
                v-if="item.media_type === 'photo'"
                :src="item.file_url"
                :alt="item.title || 'Photo'"
                class="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              <video
                v-else
                :src="item.file_url"
                controls
                class="max-w-full max-h-[90vh] rounded-lg"
              />
            </div>
          </div>

          <!-- Info Panel (Right Side) -->
          <div class="w-96 bg-white rounded-lg overflow-hidden flex flex-col">
            <!-- Header -->
            <div class="p-4 border-b">
              <h3 v-if="item.title" class="text-lg font-semibold text-gray-900 mb-1">{{ item.title }}</h3>
              <p v-if="item.caption" class="text-gray-600 text-sm">{{ item.caption }}</p>
              <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{{ item.media_type === 'photo' ? 'Photo' : 'Video' }}</span>
                <span>•</span>
                <span>{{ formatDate(item.uploaded_at) }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="p-4 border-b flex items-center gap-4">
              <button
                @click="toggleLike"
                :class="[
                  'flex items-center gap-2 transition-colors',
                  isLiked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
                ]"
              >
                <svg class="w-5 h-5" :fill="isLiked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span class="font-medium">{{ likeCount }}</span>
              </button>

              <button @click="focusCommentInput" class="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span class="font-medium">{{ comments.length }}</span>
              </button>

              <button
                v-if="can('canManageRecitals')"
                @click="confirmDelete"
                class="ml-auto text-red-600 hover:text-red-800 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <!-- Comments Section -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <div v-if="comments.length === 0" class="text-center py-8 text-gray-500 text-sm">
                No comments yet. Be the first to comment!
              </div>

              <div v-for="comment in comments" :key="comment.id" class="flex gap-3">
                <div class="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-600 text-sm font-medium">
                  {{ comment.user?.first_name?.[0] || '?' }}
                </div>
                <div class="flex-1">
                  <div class="bg-gray-100 rounded-lg px-3 py-2">
                    <p class="font-medium text-sm text-gray-900">{{ comment.user?.first_name }} {{ comment.user?.last_name }}</p>
                    <p class="text-sm text-gray-700 mt-1">{{ comment.comment }}</p>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">{{ formatDate(comment.created_at) }}</p>
                </div>
              </div>
            </div>

            <!-- Comment Input -->
            <div class="p-4 border-t">
              <form @submit.prevent="handleAddComment" class="flex gap-2">
                <input
                  ref="commentInput"
                  v-model="newComment"
                  type="text"
                  placeholder="Add a comment..."
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <AppButton variant="primary" native-type="submit" size="sm" :disabled="!newComment.trim()">
                  Post
                </AppButton>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MediaItem, MediaComment } from '~/types/tier1-features'
import { usePermissions } from '~/composables/usePermissions'

const props = defineProps<{ modelValue: boolean; item: MediaItem | null }>()
const emit = defineEmits(['update:modelValue', 'delete', 'close'])

const { can } = usePermissions()
const commentInput = ref<HTMLInputElement | null>(null)
const newComment = ref('')
const comments = ref<MediaComment[]>([])
const likeCount = ref(0)
const isLiked = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

watch(() => props.item, (item) => {
  if (item) {
    comments.value = (item as any).comments || []
    likeCount.value = (item as any).likes?.length || 0
    // Check if current user liked this
    const user = useSupabaseUser()
    isLiked.value = (item as any).likes?.some((like: any) => like.user_id === user.value?.id) || false
  }
}, { immediate: true })

function handleClose() {
  emit('close')
  emit('update:modelValue', false)
}

async function toggleLike() {
  if (!props.item) return

  try {
    const { data } = await $fetch(`/api/media-items/${props.item.id}/like`, { method: 'POST' })
    if ((data as any).liked) {
      likeCount.value++
      isLiked.value = true
    } else {
      likeCount.value--
      isLiked.value = false
    }
  } catch (error) {
    console.error('Failed to toggle like:', error)
  }
}

async function handleAddComment() {
  if (!props.item || !newComment.value.trim()) return

  try {
    const { data } = await $fetch(`/api/media-items/${props.item.id}/comments`, {
      method: 'POST',
      body: { comment: newComment.value.trim() },
    })
    comments.value.push((data as any).comment)
    newComment.value = ''
  } catch (error) {
    console.error('Failed to add comment:', error)
  }
}

function focusCommentInput() {
  commentInput.value?.focus()
}

function confirmDelete() {
  if (!props.item) return
  if (confirm('Are you sure you want to delete this media item? This action cannot be undone.')) {
    deleteMedia()
  }
}

async function deleteMedia() {
  if (!props.item) return

  try {
    await $fetch(`/api/media-items/${props.item.id}`, { method: 'DELETE' })
    emit('delete', props.item.id)
  } catch (error) {
    console.error('Failed to delete media:', error)
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
