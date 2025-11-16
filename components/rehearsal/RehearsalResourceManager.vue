<template>
  <div>
    <!-- Upload button -->
    <div v-if="canEdit" class="mb-6">
      <AppButton
        variant="primary"
        @click="showUploadModal = true"
      >
        <template #icon>
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </template>
        Add Resource
      </AppButton>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <AppCard>
          <div class="h-6 bg-gray-200 rounded w-1/3 mb-2" />
          <div class="h-4 bg-gray-200 rounded w-full" />
        </AppCard>
      </div>
    </div>

    <!-- Empty state -->
    <AppEmptyState
      v-else-if="!loading && resources.length === 0"
      heading="No resources yet"
      description="Upload videos, documents, or add links to help students prepare for this rehearsal"
    >
      <template #icon>
        <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </template>
      <template v-if="canEdit" #action>
        <AppButton
          variant="primary"
          @click="showUploadModal = true"
        >
          Add Resource
        </AppButton>
      </template>
    </AppEmptyState>

    <!-- Resources list -->
    <div v-else class="space-y-4">
      <AppCard
        v-for="resource in resources"
        :key="resource.id"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-4 flex-1">
            <!-- Resource icon -->
            <div class="flex-shrink-0">
              <div
                :class="[
                  'h-12 w-12 rounded-lg flex items-center justify-center',
                  getResourceTypeColor(resource.resource_type)
                ]"
              >
                <component :is="getResourceIcon(resource.resource_type)" class="h-6 w-6" />
              </div>
            </div>

            <!-- Resource info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 :class="typography.heading.h4" class="truncate">
                  {{ resource.title }}
                </h3>

                <!-- Public badge -->
                <span
                  v-if="resource.is_public"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                >
                  Public
                </span>
              </div>

              <p v-if="resource.description" :class="typography.body.small" class="text-gray-600 mb-2">
                {{ resource.description }}
              </p>

              <div class="flex items-center gap-4 text-xs text-gray-500">
                <span class="capitalize">{{ resource.resource_type }}</span>
                <span v-if="resource.file_size">{{ formatFileSize(resource.file_size) }}</span>
                <span>{{ formatDate(resource.uploaded_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 ml-4">
            <!-- View/Download button -->
            <AppButton
              size="sm"
              variant="ghost"
              @click="viewResource(resource)"
            >
              <template #icon>
                <svg v-if="resource.resource_type === 'link'" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </template>
              {{ resource.resource_type === 'link' ? 'Open' : 'Download' }}
            </AppButton>

            <!-- Delete button -->
            <AppButton
              v-if="canEdit"
              size="sm"
              variant="ghost"
              @click="deleteResource(resource.id)"
            >
              <template #icon>
                <svg class="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </template>
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Upload modal -->
    <AppModal
      v-model="showUploadModal"
      title="Add Resource"
      size="md"
    >
      <form @submit.prevent="handleUpload">
        <!-- Resource type -->
        <div class="mb-4">
          <label :class="inputs.label">Resource Type</label>
          <select
            v-model="uploadForm.type"
            :class="getInputClasses()"
            required
          >
            <option value="">Select type...</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
            <option value="image">Image</option>
            <option value="link">External Link</option>
          </select>
        </div>

        <!-- Title -->
        <div class="mb-4">
          <AppInput
            v-model="uploadForm.title"
            label="Title"
            placeholder="Rehearsal video - Act 1"
            required
          />
        </div>

        <!-- Description -->
        <div class="mb-4">
          <label :class="inputs.label">Description (Optional)</label>
          <textarea
            v-model="uploadForm.description"
            rows="2"
            :class="getInputClasses()"
            placeholder="Brief description of this resource..."
          />
        </div>

        <!-- File upload OR external link -->
        <div class="mb-4">
          <div v-if="uploadForm.type === 'link'">
            <AppInput
              v-model="uploadForm.external_url"
              label="External URL"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              required
            />
          </div>
          <div v-else-if="uploadForm.type">
            <label :class="inputs.label">File</label>
            <input
              ref="fileInput"
              type="file"
              :class="getInputClasses()"
              :accept="getAcceptedFileTypes()"
              required
              @change="handleFileSelect"
            />
            <p :class="typography.body.small" class="text-gray-500 mt-1">
              {{ getFileTypeHint() }}
            </p>
          </div>
        </div>

        <!-- Public visibility -->
        <div class="mb-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="uploadForm.is_public"
              type="checkbox"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span class="text-sm text-gray-700">
              Make this resource visible to parents
            </span>
          </label>
        </div>

        <!-- Error message -->
        <AppAlert
          v-if="uploadError"
          variant="error"
          :description="uploadError"
          dismissible
          class="mb-4"
          @close="uploadError = ''"
        />
      </form>

      <template #footer>
        <AppButton
          variant="secondary"
          @click="closeUploadModal"
        >
          Cancel
        </AppButton>
        <AppButton
          variant="primary"
          :loading="uploading"
          @click="handleUpload"
        >
          {{ uploadForm.type === 'link' ? 'Add Link' : 'Upload' }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { typography, inputs, getInputClasses } from '~/lib/design-system'
import type { RehearsalResource, ResourceType } from '~/types/tier1-features'

interface Props {
  rehearsalId: string
  canEdit: boolean
}

const props = defineProps<Props>()

// State
const loading = ref(false)
const uploading = ref(false)
const resources = ref<RehearsalResource[]>([])
const showUploadModal = ref(false)
const uploadError = ref('')
const fileInput = ref<HTMLInputElement>()

// Upload form
const uploadForm = ref({
  type: '' as ResourceType | '',
  title: '',
  description: '',
  external_url: '',
  is_public: false,
  file: null as File | null,
})

/**
 * Fetch resources
 */
async function fetchResources() {
  loading.value = true
  try {
    const { data, error } = await useFetch(`/api/rehearsals/${props.rehearsalId}/resources`)

    if (error.value) {
      throw new Error(error.value.message)
    }

    resources.value = data.value?.resources || []
  } catch (error) {
    console.error('Failed to fetch resources:', error)
  } finally {
    loading.value = false
  }
}

/**
 * Handle file select
 */
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    uploadForm.value.file = target.files[0]
  }
}

/**
 * Get accepted file types based on resource type
 */
function getAcceptedFileTypes(): string {
  const types: Record<string, string> = {
    video: 'video/*',
    document: '.pdf,.doc,.docx,.txt',
    image: 'image/*',
  }
  return types[uploadForm.value.type] || '*'
}

/**
 * Get file type hint
 */
function getFileTypeHint(): string {
  const hints: Record<string, string> = {
    video: 'MP4, MOV, AVI (max 500MB)',
    document: 'PDF, Word, Text (max 50MB)',
    image: 'JPG, PNG, GIF (max 10MB)',
  }
  return hints[uploadForm.value.type] || ''
}

/**
 * Handle upload
 */
async function handleUpload() {
  uploadError.value = ''

  // Validate
  if (!uploadForm.value.title.trim()) {
    uploadError.value = 'Title is required'
    return
  }

  if (uploadForm.value.type === 'link') {
    if (!uploadForm.value.external_url.trim()) {
      uploadError.value = 'URL is required'
      return
    }
  } else {
    if (!uploadForm.value.file) {
      uploadError.value = 'File is required'
      return
    }
  }

  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('type', uploadForm.value.type)
    formData.append('title', uploadForm.value.title)
    formData.append('description', uploadForm.value.description)
    formData.append('is_public', String(uploadForm.value.is_public))

    if (uploadForm.value.type === 'link') {
      formData.append('external_url', uploadForm.value.external_url)
    } else if (uploadForm.value.file) {
      formData.append('file', uploadForm.value.file)
    }

    const { error } = await useFetch(`/api/rehearsals/${props.rehearsalId}/resources`, {
      method: 'POST',
      body: formData,
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    closeUploadModal()
    fetchResources()
  } catch (error: any) {
    uploadError.value = error.message || 'Failed to upload resource'
  } finally {
    uploading.value = false
  }
}

/**
 * Close upload modal
 */
function closeUploadModal() {
  showUploadModal.value = false
  uploadForm.value = {
    type: '' as any,
    title: '',
    description: '',
    external_url: '',
    is_public: false,
    file: null,
  }
  uploadError.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

/**
 * View/download resource
 */
function viewResource(resource: RehearsalResource) {
  if (resource.external_url) {
    window.open(resource.external_url, '_blank')
  } else if (resource.file_url) {
    window.open(resource.file_url, '_blank')
  }
}

/**
 * Delete resource
 */
async function deleteResource(resourceId: string) {
  if (!confirm('Are you sure you want to delete this resource?')) {
    return
  }

  try {
    const { error } = await useFetch(`/api/rehearsals/resources/${resourceId}`, {
      method: 'DELETE',
    })

    if (error.value) {
      throw new Error(error.value.message)
    }

    fetchResources()
  } catch (error) {
    console.error('Failed to delete resource:', error)
  }
}

/**
 * Get resource type color
 */
function getResourceTypeColor(type: ResourceType): string {
  const colors: Record<ResourceType, string> = {
    video: 'bg-purple-100 text-purple-600',
    document: 'bg-blue-100 text-blue-600',
    image: 'bg-green-100 text-green-600',
    link: 'bg-orange-100 text-orange-600',
    other: 'bg-gray-100 text-gray-600',
  }
  return colors[type] || colors.other
}

/**
 * Get resource icon component
 */
function getResourceIcon(type: ResourceType) {
  // Return inline SVG for different types
  const icons: Record<ResourceType, any> = {
    video: () => h('svg', { class: 'h-6 w-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' })
    ]),
    document: () => h('svg', { class: 'h-6 w-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' })
    ]),
    image: () => h('svg', { class: 'h-6 w-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' })
    ]),
    link: () => h('svg', { class: 'h-6 w-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' })
    ]),
    other: () => h('svg', { class: 'h-6 w-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
    ]),
  }
  return icons[type] || icons.other
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Load data on mount
onMounted(() => {
  fetchResources()
})
</script>
