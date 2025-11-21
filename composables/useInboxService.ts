/**
 * Unified Inbox Service Composable
 *
 * Provides methods for interacting with the inbox API:
 * - Message CRUD operations
 * - Thread management
 * - Email sending
 * - Attachment handling
 * - Status and assignment
 * - Bulk operations
 * - Labels and templates
 * - Statistics
 */

import type {
  InboxQueryParams,
  PaginatedMessagesResponse,
  MessageDetail,
  CreateMessageRequest,
  UpdateMessageRequest,
  Message,
  MessageThread,
  ThreadWithMessages,
  UpdateThreadRequest,
  SendInboxEmailRequest,
  ReplyToMessageRequest,
  ForwardMessageRequest,
  AssignMessageRequest,
  MessageAssignment,
  BulkMessageActionRequest,
  MessageLabel,
  InboxEmailTemplate,
  EmailTemplateFormData,
  InboxStats,
  MessageType,
  MessageStatus,
  MessagePriority,
  AttachmentUploadMetadata,
  AttachmentUploadResponse,
  MessageAttachment,
} from '~/types/inbox'

export function useInboxService() {
  // ============================================================================
  // Message CRUD Operations
  // ============================================================================

  /**
   * Fetch messages with filters and pagination
   */
  const fetchMessages = async (params: InboxQueryParams = {}): Promise<PaginatedMessagesResponse> => {
    return await $fetch('/api/inbox/messages', {
      method: 'GET',
      params,
    })
  }

  /**
   * Fetch a single message with full details
   */
  const fetchMessage = async (id: string): Promise<MessageDetail> => {
    return await $fetch(`/api/inbox/messages/${id}`, {
      method: 'GET',
    })
  }

  /**
   * Create a new message (internal, parent communication, etc.)
   */
  const createMessage = async (data: CreateMessageRequest): Promise<Message> => {
    return await $fetch('/api/inbox/messages', {
      method: 'POST',
      body: data,
    })
  }

  /**
   * Update a message
   */
  const updateMessage = async (id: string, data: UpdateMessageRequest): Promise<Message> => {
    return await $fetch(`/api/inbox/messages/${id}`, {
      method: 'PATCH',
      body: data,
    })
  }

  /**
   * Delete a message (soft delete)
   */
  const deleteMessage = async (id: string): Promise<void> => {
    await $fetch(`/api/inbox/messages/${id}`, {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // Thread Operations
  // ============================================================================

  /**
   * Fetch threads with filters and pagination
   */
  const fetchThreads = async (params: InboxQueryParams = {}) => {
    return await $fetch('/api/inbox/threads', {
      method: 'GET',
      params,
    })
  }

  /**
   * Fetch a single thread with all messages
   */
  const fetchThread = async (id: string): Promise<ThreadWithMessages> => {
    return await $fetch(`/api/inbox/threads/${id}`, {
      method: 'GET',
    })
  }

  /**
   * Create a new thread
   */
  const createThread = async (
    subject: string,
    type: string,
    participants: string[]
  ): Promise<MessageThread> => {
    return await $fetch('/api/inbox/threads', {
      method: 'POST',
      body: { subject, type, participants },
    })
  }

  /**
   * Update a thread
   */
  const updateThread = async (id: string, data: UpdateThreadRequest): Promise<MessageThread> => {
    return await $fetch(`/api/inbox/threads/${id}`, {
      method: 'PATCH',
      body: data,
    })
  }

  // ============================================================================
  // Email Operations
  // ============================================================================

  /**
   * Send an email via the inbox
   */
  const sendEmail = async (data: SendInboxEmailRequest): Promise<Message> => {
    return await $fetch('/api/inbox/send', {
      method: 'POST',
      body: data,
    })
  }

  /**
   * Reply to a message
   */
  const replyToMessage = async (data: ReplyToMessageRequest): Promise<Message> => {
    return await $fetch('/api/inbox/reply', {
      method: 'POST',
      body: data,
    })
  }

  /**
   * Forward a message
   */
  const forwardMessage = async (data: ForwardMessageRequest): Promise<Message> => {
    return await $fetch('/api/inbox/forward', {
      method: 'POST',
      body: data,
    })
  }

  // ============================================================================
  // Attachment Operations
  // ============================================================================

  /**
   * Upload an attachment
   */
  const uploadAttachment = async (data: AttachmentUploadMetadata): Promise<AttachmentUploadResponse> => {
    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('message_id', data.message_id)
    if (data.is_inline) formData.append('is_inline', 'true')
    if (data.content_id) formData.append('content_id', data.content_id)

    return await $fetch('/api/inbox/attachments', {
      method: 'POST',
      body: formData,
    })
  }

  /**
   * Delete an attachment
   */
  const deleteAttachment = async (id: string): Promise<void> => {
    await $fetch(`/api/inbox/attachments/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Download an attachment
   */
  const downloadAttachment = async (id: string): Promise<Blob> => {
    return await $fetch(`/api/inbox/attachments/${id}/download`, {
      method: 'GET',
    })
  }

  // ============================================================================
  // Status and Assignment Operations
  // ============================================================================

  /**
   * Mark a message as read
   */
  const markAsRead = async (id: string): Promise<void> => {
    await updateMessage(id, { is_read: true })
  }

  /**
   * Mark a message as unread
   */
  const markAsUnread = async (id: string): Promise<void> => {
    await updateMessage(id, { is_read: false })
  }

  /**
   * Assign a message to a user
   */
  const assignMessage = async (data: AssignMessageRequest): Promise<MessageAssignment> => {
    return await $fetch('/api/inbox/assign', {
      method: 'POST',
      body: data,
    })
  }

  /**
   * Update message status
   */
  const updateMessageStatus = async (id: string, status: MessageStatus): Promise<Message> => {
    return await updateMessage(id, { status })
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Perform bulk action on multiple messages
   */
  const bulkAction = async (data: BulkMessageActionRequest): Promise<void> => {
    await $fetch('/api/inbox/bulk-action', {
      method: 'POST',
      body: data,
    })
  }

  // ============================================================================
  // Labels
  // ============================================================================

  /**
   * Fetch all labels
   */
  const fetchLabels = async (): Promise<MessageLabel[]> => {
    return await $fetch('/api/inbox/labels', {
      method: 'GET',
    })
  }

  /**
   * Create a new label
   */
  const createLabel = async (name: string, color?: string): Promise<MessageLabel> => {
    return await $fetch('/api/inbox/labels', {
      method: 'POST',
      body: { name, color },
    })
  }

  /**
   * Update a label
   */
  const updateLabel = async (id: string, data: Partial<MessageLabel>): Promise<MessageLabel> => {
    return await $fetch(`/api/inbox/labels/${id}`, {
      method: 'PATCH',
      body: data,
    })
  }

  /**
   * Delete a label
   */
  const deleteLabel = async (id: string): Promise<void> => {
    await $fetch(`/api/inbox/labels/${id}`, {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // Email Templates
  // ============================================================================

  /**
   * Fetch email templates
   */
  const fetchTemplates = async (category?: string): Promise<InboxEmailTemplate[]> => {
    return await $fetch('/api/inbox/templates', {
      method: 'GET',
      params: category ? { category } : {},
    })
  }

  /**
   * Create a new template
   */
  const createTemplate = async (data: EmailTemplateFormData): Promise<InboxEmailTemplate> => {
    return await $fetch('/api/inbox/templates', {
      method: 'POST',
      body: data,
    })
  }

  /**
   * Update a template
   */
  const updateTemplate = async (
    id: string,
    data: Partial<EmailTemplateFormData>
  ): Promise<InboxEmailTemplate> => {
    return await $fetch(`/api/inbox/templates/${id}`, {
      method: 'PATCH',
      body: data,
    })
  }

  /**
   * Delete a template
   */
  const deleteTemplate = async (id: string): Promise<void> => {
    await $fetch(`/api/inbox/templates/${id}`, {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Fetch inbox statistics
   */
  const fetchStats = async (): Promise<InboxStats> => {
    return await $fetch('/api/inbox/stats', {
      method: 'GET',
    })
  }

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Format message preview text
   */
  const formatMessagePreview = (message: Message): string => {
    return message.preview || message.body.substring(0, 200)
  }

  /**
   * Get human-readable label for message type
   */
  const getMessageTypeLabel = (type: MessageType): string => {
    const labels: Record<MessageType, string> = {
      email: 'Email',
      internal: 'Internal Message',
      parent_communication: 'Parent Communication',
      system_notification: 'System Notification',
      contact_form: 'Contact Form',
      sms: 'SMS',
    }
    return labels[type] || type
  }

  /**
   * Get human-readable label for status
   */
  const getStatusLabel = (status: MessageStatus): string => {
    const labels: Record<MessageStatus, string> = {
      new: 'New',
      read: 'Read',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      archived: 'Archived',
      deleted: 'Deleted',
    }
    return labels[status] || status
  }

  /**
   * Get human-readable label for priority
   */
  const getPriorityLabel = (priority: MessagePriority): string => {
    const labels: Record<MessagePriority, string> = {
      low: 'Low',
      normal: 'Normal',
      high: 'High',
      urgent: 'Urgent',
    }
    return labels[priority] || priority
  }

  /**
   * Get color for status
   */
  const getStatusColor = (status: MessageStatus): string => {
    const colors: Record<MessageStatus, string> = {
      new: 'blue',
      read: 'gray',
      in_progress: 'yellow',
      resolved: 'green',
      archived: 'gray',
      deleted: 'red',
    }
    return colors[status] || 'gray'
  }

  /**
   * Get color for priority
   */
  const getPriorityColor = (priority: MessagePriority): string => {
    const colors: Record<MessagePriority, string> = {
      low: 'gray',
      normal: 'blue',
      high: 'orange',
      urgent: 'red',
    }
    return colors[priority] || 'blue'
  }

  /**
   * Format timestamp to relative time
   */
  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  /**
   * Parse email address from string (extract email from "Name <email>" format)
   */
  const parseEmailAddress = (address: string): { name?: string; email: string } => {
    const match = address.match(/^(.*?)\s*<(.+?)>$/)
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() }
    }
    return { email: address.trim() }
  }

  /**
   * Format email address for display
   */
  const formatEmailAddress = (address: string, name?: string): string => {
    if (name) {
      return `${name} <${address}>`
    }
    return address
  }

  /**
   * Check if message requires user action
   */
  const requiresUserAction = (message: Message, userId: string): boolean => {
    return (
      message.requires_action &&
      !message.is_read &&
      (message.assigned_to === userId || message.to_addresses.includes(userId))
    )
  }

  /**
   * Get icon for message type
   */
  const getMessageTypeIcon = (type: MessageType): string => {
    const icons: Record<MessageType, string> = {
      email: 'pi-envelope',
      internal: 'pi-comment',
      parent_communication: 'pi-users',
      system_notification: 'pi-bell',
      contact_form: 'pi-file',
      sms: 'pi-mobile',
    }
    return icons[type] || 'pi-envelope'
  }

  /**
   * Get icon for priority
   */
  const getPriorityIcon = (priority: MessagePriority): string => {
    const icons: Record<MessagePriority, string> = {
      low: 'pi-arrow-down',
      normal: 'pi-minus',
      high: 'pi-arrow-up',
      urgent: 'pi-exclamation-triangle',
    }
    return icons[priority] || 'pi-minus'
  }

  // ============================================================================
  // Return all methods
  // ============================================================================

  return {
    // Message CRUD
    fetchMessages,
    fetchMessage,
    createMessage,
    updateMessage,
    deleteMessage,

    // Thread operations
    fetchThreads,
    fetchThread,
    createThread,
    updateThread,

    // Email operations
    sendEmail,
    replyToMessage,
    forwardMessage,

    // Attachment operations
    uploadAttachment,
    deleteAttachment,
    downloadAttachment,

    // Status and assignment
    markAsRead,
    markAsUnread,
    assignMessage,
    updateMessageStatus,

    // Bulk operations
    bulkAction,

    // Labels
    fetchLabels,
    createLabel,
    updateLabel,
    deleteLabel,

    // Templates
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,

    // Statistics
    fetchStats,

    // Helper functions
    formatMessagePreview,
    getMessageTypeLabel,
    getStatusLabel,
    getPriorityLabel,
    getStatusColor,
    getPriorityColor,
    formatRelativeTime,
    parseEmailAddress,
    formatEmailAddress,
    requiresUserAction,
    getMessageTypeIcon,
    getPriorityIcon,
  }
}
