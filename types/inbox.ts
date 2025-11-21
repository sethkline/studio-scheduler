/**
 * Unified Inbox Type Definitions
 *
 * This file contains TypeScript interfaces and types for the Unified Inbox feature,
 * including messages, threads, attachments, and related entities.
 */

// ============================================================================
// Enums and Union Types
// ============================================================================

/**
 * Type of message
 */
export type MessageType =
  | 'email'
  | 'internal'
  | 'parent_communication'
  | 'system_notification'
  | 'contact_form'
  | 'sms'

/**
 * Source of the message
 */
export type MessageSource =
  | 'email_inbound'
  | 'email_outbound'
  | 'system'
  | 'user'
  | 'external'

/**
 * Message status
 */
export type MessageStatus =
  | 'new'
  | 'read'
  | 'in_progress'
  | 'resolved'
  | 'archived'
  | 'deleted'

/**
 * Message priority level
 */
export type MessagePriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'

/**
 * Thread type
 */
export type ThreadType =
  | 'email'
  | 'internal'
  | 'parent_communication'
  | 'contact_inquiry'
  | 'support'

/**
 * Thread status
 */
export type ThreadStatus =
  | 'active'
  | 'resolved'
  | 'archived'
  | 'deleted'

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Message thread - groups related messages into conversations
 */
export interface MessageThread {
  id: string
  studio_id: string
  created_at: string
  updated_at: string

  // Thread Metadata
  subject: string
  thread_type: ThreadType

  // Participants (array of email addresses or user UUIDs)
  participants: string[]

  // Status Management
  status: ThreadStatus

  // Thread Statistics
  last_message_at: string | null
  message_count: number
  unread_count: number

  // Assignment
  assigned_to: string | null
  assigned_at: string | null
  assigned_by: string | null

  // Organization
  is_starred: boolean
  tags: string[]

  // Priority
  priority: MessagePriority

  // Metadata
  metadata: Record<string, any>
}

/**
 * Message - core message entity
 */
export interface Message {
  id: string
  studio_id: string
  created_at: string
  updated_at: string

  // Message Type & Source
  message_type: MessageType
  source: MessageSource

  // Content
  subject: string
  body: string
  body_html: string | null
  preview: string

  // Participants
  from_address: string
  from_name: string | null
  to_addresses: string[]
  cc_addresses: string[] | null
  bcc_addresses: string[] | null

  // Thread Management
  thread_id: string | null
  parent_message_id: string | null
  in_reply_to: string | null

  // Status & Assignment
  status: MessageStatus
  priority: MessagePriority
  assigned_to: string | null
  assigned_at: string | null
  assigned_by: string | null

  // Email-Specific Fields
  email_message_id: string | null
  email_headers: Record<string, any> | null

  // Metadata
  metadata: Record<string, any>
  tags: string[]

  // Flags
  is_read: boolean
  is_starred: boolean
  requires_action: boolean

  // Soft Delete
  deleted_at: string | null
  deleted_by: string | null

  // Read Receipt Tracking
  read_at: string | null
  read_by: string | null
}

/**
 * Message with thread information (for list views)
 */
export interface MessageWithThread extends Message {
  thread: MessageThread | null
  attachment_count?: number
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  id: string
  studio_id: string
  message_id: string
  created_at: string

  // File Information
  filename: string
  original_filename: string
  storage_path: string
  storage_bucket: string
  mime_type: string
  file_size: number

  // Metadata
  is_inline: boolean
  content_id: string | null

  // Download tracking
  download_count: number
  last_downloaded_at: string | null
}

/**
 * Message read status (for internal messages)
 */
export interface MessageReadStatus {
  id: string
  studio_id: string
  message_id: string
  user_id: string
  read_at: string
}

/**
 * Message label/tag
 */
export interface MessageLabel {
  id: string
  studio_id: string
  created_at: string
  updated_at: string

  // Label Info
  name: string
  color: string | null
  description: string | null

  // Usage Statistics
  message_count: number

  // Ownership
  created_by: string | null
  is_system_label: boolean
}

/**
 * Message assignment (audit trail)
 */
export interface MessageAssignment {
  id: string
  studio_id: string
  message_id: string
  created_at: string

  // Assignment Details
  assigned_to: string
  assigned_by: string

  // Assignment Notes
  notes: string | null

  // Completion
  completed_at: string | null
  completed_by: string | null
}

/**
 * Email template for inbox
 */
export interface InboxEmailTemplate {
  id: string
  studio_id: string
  created_at: string
  updated_at: string

  // Template Info
  name: string
  slug: string
  description: string | null
  category: string | null

  // Content
  subject_template: string
  body_template: string
  body_html_template: string | null

  // Variables
  available_variables: Record<string, string> | null

  // Metadata
  is_active: boolean
  is_system_template: boolean
  usage_count: number
  last_used_at: string | null

  // Ownership
  created_by: string | null
  updated_by: string | null
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request to create a new message
 */
export interface CreateMessageRequest {
  message_type: MessageType
  subject: string
  body: string
  body_html?: string
  to_addresses: string[]
  cc_addresses?: string[]
  bcc_addresses?: string[]
  from_name?: string
  thread_id?: string
  parent_message_id?: string
  priority?: MessagePriority
  tags?: string[]
  metadata?: Record<string, any>
  requires_action?: boolean
}

/**
 * Request to send an email via inbox
 */
export interface SendInboxEmailRequest extends CreateMessageRequest {
  message_type: 'email'
  template_id?: string
  template_data?: Record<string, any>
  attachments?: File[]
  in_reply_to?: string
  scheduled_for?: string
}

/**
 * Request to update a message
 */
export interface UpdateMessageRequest {
  subject?: string
  body?: string
  body_html?: string
  status?: MessageStatus
  priority?: MessagePriority
  assigned_to?: string | null
  is_read?: boolean
  is_starred?: boolean
  requires_action?: boolean
  tags?: string[]
  metadata?: Record<string, any>
}

/**
 * Request to update a thread
 */
export interface UpdateThreadRequest {
  subject?: string
  status?: ThreadStatus
  assigned_to?: string | null
  is_starred?: boolean
  tags?: string[]
  priority?: MessagePriority
}

/**
 * Inbox filter options
 */
export interface InboxFilters {
  message_type?: MessageType | 'all'
  status?: MessageStatus | 'all'
  assigned_to?: string | 'me' | 'unassigned' | null
  is_read?: boolean
  is_starred?: boolean
  requires_action?: boolean
  priority?: MessagePriority
  tags?: string[]
  date_from?: string
  date_to?: string
  search?: string
}

/**
 * Inbox query parameters
 */
export interface InboxQueryParams extends InboxFilters {
  page?: number
  limit?: number
  sort_by?: 'created_at' | 'updated_at' | 'priority'
  sort_order?: 'asc' | 'desc'
}

/**
 * Paginated messages response
 */
export interface PaginatedMessagesResponse {
  messages: MessageWithThread[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  filters?: InboxFilters
}

/**
 * Paginated threads response
 */
export interface PaginatedThreadsResponse {
  threads: MessageThread[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  filters?: InboxFilters
}

/**
 * Message with attachments and thread
 */
export interface MessageDetail extends Message {
  thread: MessageThread | null
  attachments: MessageAttachment[]
  assignments: MessageAssignment[]
  read_status: MessageReadStatus[]
}

/**
 * Thread with messages
 */
export interface ThreadWithMessages extends MessageThread {
  messages: Message[]
  attachments: MessageAttachment[]
}

/**
 * Reply to message request
 */
export interface ReplyToMessageRequest {
  message_id: string
  body: string
  body_html?: string
  reply_all?: boolean
  attachments?: File[]
}

/**
 * Forward message request
 */
export interface ForwardMessageRequest {
  message_id: string
  to_addresses: string[]
  cc_addresses?: string[]
  body_prefix?: string
  body_html_prefix?: string
}

/**
 * Assign message request
 */
export interface AssignMessageRequest {
  message_id: string
  assigned_to: string
  notes?: string
}

/**
 * Bulk action request
 */
export interface BulkMessageActionRequest {
  message_ids: string[]
  action: 'mark_read' | 'mark_unread' | 'archive' | 'delete' | 'star' | 'unstar'
  assigned_to?: string
  tags?: string[]
}

/**
 * Inbox statistics
 */
export interface InboxStats {
  total_messages: number
  unread_count: number
  new_count: number
  in_progress_count: number
  resolved_count: number
  assigned_to_me_count: number
  requires_action_count: number
  by_type: Record<MessageType, number>
  by_priority: Record<MessagePriority, number>
  avg_response_time_hours: number | null
}

/**
 * Email template form data
 */
export interface EmailTemplateFormData {
  name: string
  slug: string
  description?: string
  category?: string
  subject_template: string
  body_template: string
  body_html_template?: string
  available_variables?: Record<string, string>
  is_active?: boolean
}

/**
 * Attachment upload metadata
 */
export interface AttachmentUploadMetadata {
  message_id: string
  file: File
  is_inline?: boolean
  content_id?: string
}

/**
 * Attachment upload response
 */
export interface AttachmentUploadResponse {
  attachment: MessageAttachment
  upload_url?: string
}

// ============================================================================
// Composable Return Types
// ============================================================================

/**
 * Return type for useInboxService composable
 */
export interface InboxService {
  // Message CRUD
  fetchMessages: (params?: InboxQueryParams) => Promise<PaginatedMessagesResponse>
  fetchMessage: (id: string) => Promise<MessageDetail>
  createMessage: (data: CreateMessageRequest) => Promise<Message>
  updateMessage: (id: string, data: UpdateMessageRequest) => Promise<Message>
  deleteMessage: (id: string) => Promise<void>

  // Thread operations
  fetchThreads: (params?: InboxQueryParams) => Promise<PaginatedThreadsResponse>
  fetchThread: (id: string) => Promise<ThreadWithMessages>
  createThread: (subject: string, type: ThreadType, participants: string[]) => Promise<MessageThread>
  updateThread: (id: string, data: UpdateThreadRequest) => Promise<MessageThread>

  // Email operations
  sendEmail: (data: SendInboxEmailRequest) => Promise<Message>
  replyToMessage: (data: ReplyToMessageRequest) => Promise<Message>
  forwardMessage: (data: ForwardMessageRequest) => Promise<Message>

  // Attachment operations
  uploadAttachment: (data: AttachmentUploadMetadata) => Promise<AttachmentUploadResponse>
  deleteAttachment: (id: string) => Promise<void>
  downloadAttachment: (id: string) => Promise<Blob>

  // Status and assignment
  markAsRead: (id: string) => Promise<void>
  markAsUnread: (id: string) => Promise<void>
  assignMessage: (data: AssignMessageRequest) => Promise<MessageAssignment>
  updateMessageStatus: (id: string, status: MessageStatus) => Promise<Message>

  // Bulk operations
  bulkAction: (data: BulkMessageActionRequest) => Promise<void>

  // Labels
  fetchLabels: () => Promise<MessageLabel[]>
  createLabel: (name: string, color?: string) => Promise<MessageLabel>
  updateLabel: (id: string, data: Partial<MessageLabel>) => Promise<MessageLabel>
  deleteLabel: (id: string) => Promise<void>

  // Templates
  fetchTemplates: (category?: string) => Promise<InboxEmailTemplate[]>
  createTemplate: (data: EmailTemplateFormData) => Promise<InboxEmailTemplate>
  updateTemplate: (id: string, data: Partial<EmailTemplateFormData>) => Promise<InboxEmailTemplate>
  deleteTemplate: (id: string) => Promise<void>

  // Statistics
  fetchStats: () => Promise<InboxStats>

  // Helper functions
  formatMessagePreview: (message: Message) => string
  getMessageTypeLabel: (type: MessageType) => string
  getStatusLabel: (status: MessageStatus) => string
  getPriorityLabel: (priority: MessagePriority) => string
  getStatusColor: (status: MessageStatus) => string
  getPriorityColor: (priority: MessagePriority) => string
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for MessageList component
 */
export interface MessageListProps {
  messages: MessageWithThread[]
  loading?: boolean
  selectedMessageId?: string | null
}

/**
 * Props for MessageDetail component
 */
export interface MessageDetailProps {
  message: MessageDetail
  loading?: boolean
}

/**
 * Props for ComposeDialog component
 */
export interface ComposeDialogProps {
  visible: boolean
  replyTo?: Message | null
  forwardMessage?: Message | null
}

/**
 * Props for InboxFilters component
 */
export interface InboxFiltersProps {
  modelValue: InboxFilters
  showSearch?: boolean
  showDateRange?: boolean
}

// ============================================================================
// Store State Types
// ============================================================================

/**
 * Inbox store state
 */
export interface InboxState {
  messages: MessageWithThread[]
  threads: MessageThread[]
  selectedMessage: MessageDetail | null
  selectedThread: ThreadWithMessages | null
  labels: MessageLabel[]
  templates: InboxEmailTemplate[]
  stats: InboxStats | null
  filters: InboxFilters
  loading: {
    messages: boolean
    message: boolean
    threads: boolean
    thread: boolean
    sending: boolean
    labels: boolean
    templates: boolean
    stats: boolean
  }
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Mailgun inbound email webhook payload
 */
export interface MailgunInboundWebhook {
  signature: {
    timestamp: string
    token: string
    signature: string
  }
  'event-data': {
    event: string
    message: {
      headers: {
        'message-id': string
        from: string
        to: string
        subject: string
        'in-reply-to'?: string
        references?: string
      }
    }
  }
  From: string
  To: string
  Subject: string
  'body-plain': string
  'body-html': string
  'Message-Id': string
  'In-Reply-To'?: string
  References?: string
  attachments?: Array<{
    filename: string
    'content-type': string
    size: number
    url: string
  }>
}

/**
 * Processed inbound email data
 */
export interface ProcessedInboundEmail {
  from: string
  from_name?: string
  to: string[]
  cc?: string[]
  subject: string
  body_plain: string
  body_html?: string
  message_id: string
  in_reply_to?: string
  references?: string
  attachments: Array<{
    filename: string
    mime_type: string
    size: number
    url: string
  }>
  headers: Record<string, any>
}
