<template>
  <div class="inbox-container min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold text-gray-900">Inbox</h1>
          <Badge v-if="stats" :value="stats.unread_count" severity="info" />
        </div>
        <div class="flex items-center gap-2">
          <Button
            label="Compose"
            icon="pi pi-envelope"
            @click="showComposeDialog = true"
          />
          <Button
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            @click="refreshMessages"
            :loading="loading"
          />
        </div>
      </div>
    </div>

    <div class="flex h-[calc(100vh-80px)]">
      <!-- Sidebar -->
      <div class="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <InboxSidebar
          v-model:filters="filters"
          :stats="stats"
        />
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col">
        <!-- Filters Bar -->
        <div class="bg-white border-b border-gray-200 px-6 py-3">
          <InboxFilters
            v-model="filters"
            @update:model-value="loadMessages"
          />
        </div>

        <!-- Message List -->
        <div class="flex-1 overflow-y-auto">
          <InboxMessageList
            :messages="messages"
            :loading="loading"
            :selected-id="selectedMessageId"
            @select="selectMessage"
            @refresh="loadMessages"
          />

          <!-- Pagination -->
          <div v-if="pagination.total_pages > 1" class="bg-white border-t border-gray-200 px-6 py-4">
            <Paginator
              :rows="pagination.limit"
              :total-records="pagination.total"
              :first="(pagination.page - 1) * pagination.limit"
              @page="onPageChange"
            />
          </div>
        </div>
      </div>

      <!-- Message Detail Sidebar -->
      <div v-if="selectedMessage" class="w-2/5 bg-white border-l border-gray-200 overflow-y-auto">
        <InboxMessageDetail
          :message="selectedMessage"
          :loading="detailLoading"
          @close="selectedMessageId = null"
          @reply="handleReply"
          @reply-all="handleReplyAll"
          @forward="handleForward"
          @refresh="loadSelectedMessage"
        />
      </div>
    </div>

    <!-- Compose Dialog -->
    <InboxComposeDialog
      v-model:visible="showComposeDialog"
      :reply-to="replyToMessage"
      :forward-message="forwardMessage"
      @sent="handleMessageSent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useInboxService } from '~/composables/useInboxService'
import type {
  InboxFilters,
  MessageWithThread,
  MessageDetail,
  PaginatedMessagesResponse,
  InboxStats,
} from '~/types/inbox'

definePageMeta({
  middleware: 'staff', // Require staff or admin role
  layout: 'default',
})

const inboxService = useInboxService()
const supabase = useSupabaseClient()

// State
const messages = ref<MessageWithThread[]>([])
const selectedMessageId = ref<string | null>(null)
const selectedMessage = ref<MessageDetail | null>(null)
const loading = ref(false)
const detailLoading = ref(false)
const stats = ref<InboxStats | null>(null)
const showComposeDialog = ref(false)
const replyToMessage = ref<MessageDetail | null>(null)
const forwardMessage = ref<MessageDetail | null>(null)

// Filters
const filters = ref<InboxFilters>({
  message_type: 'all',
  status: 'all',
  assigned_to: null,
  is_read: undefined,
  is_starred: undefined,
  search: '',
})

// Pagination
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  total_pages: 0,
})

// Load messages
const loadMessages = async () => {
  loading.value = true
  try {
    const response: PaginatedMessagesResponse = await inboxService.fetchMessages({
      ...filters.value,
      page: pagination.value.page,
      limit: pagination.value.limit,
    })

    messages.value = response.messages
    pagination.value = response.pagination
  } catch (error) {
    console.error('Error loading messages:', error)
  } finally {
    loading.value = false
  }
}

// Load stats
const loadStats = async () => {
  try {
    stats.value = await inboxService.fetchStats()
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

// Select message
const selectMessage = async (messageId: string) => {
  selectedMessageId.value = messageId
  await loadSelectedMessage()
}

// Load selected message details
const loadSelectedMessage = async () => {
  if (!selectedMessageId.value) return

  detailLoading.value = true
  try {
    selectedMessage.value = await inboxService.fetchMessage(selectedMessageId.value)

    // Mark as read if not already
    if (!selectedMessage.value.is_read) {
      await inboxService.markAsRead(selectedMessageId.value)
      await loadMessages() // Refresh list to update read status
      await loadStats() // Refresh stats
    }
  } catch (error) {
    console.error('Error loading message details:', error)
  } finally {
    detailLoading.value = false
  }
}

// Refresh messages
const refreshMessages = async () => {
  await Promise.all([loadMessages(), loadStats()])
}

// Page change
const onPageChange = (event: any) => {
  pagination.value.page = event.page + 1
  loadMessages()
}

// Reply handlers
const handleReply = () => {
  replyToMessage.value = selectedMessage.value
  showComposeDialog.value = true
}

const handleReplyAll = () => {
  replyToMessage.value = selectedMessage.value
  // Note: ReplyAll flag will be handled in compose dialog
  showComposeDialog.value = true
}

const handleForward = () => {
  forwardMessage.value = selectedMessage.value
  showComposeDialog.value = true
}

const handleMessageSent = () => {
  showComposeDialog.value = false
  replyToMessage.value = null
  forwardMessage.value = null
  refreshMessages()
}

// Real-time subscriptions
const subscribeToMessages = () => {
  const channel = supabase
    .channel('inbox-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        console.log('New message received:', payload)
        loadMessages()
        loadStats()
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        console.log('Message updated:', payload)
        // Update in list if exists
        const index = messages.value.findIndex(m => m.id === payload.new.id)
        if (index !== -1) {
          loadMessages() // Reload for simplicity
        }
        // Update selected message if it's the one that changed
        if (selectedMessageId.value === payload.new.id) {
          loadSelectedMessage()
        }
      }
    )
    .subscribe()

  // Cleanup on unmount
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
}

// Lifecycle
onMounted(async () => {
  await Promise.all([loadMessages(), loadStats()])
  subscribeToMessages()
})
</script>

<style scoped>
.inbox-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
