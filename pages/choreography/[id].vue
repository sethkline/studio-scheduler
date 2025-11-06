<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Choreography Note Detail -->
    <div v-else-if="choreographyNote" class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <Button
            label="Back to Choreography Notes"
            icon="pi pi-arrow-left"
            text
            @click="router.back()"
            class="mb-2"
          />
          <h1 class="text-3xl font-bold text-gray-900">{{ choreographyNote.title }}</h1>
          <p v-if="choreographyNote.description" class="text-gray-600 mt-2">{{ choreographyNote.description }}</p>
        </div>
        <div class="flex gap-2">
          <Button
            label="Edit"
            icon="pi pi-pencil"
            @click="showEditDialog = true"
            outlined
          />
          <Button
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
            outlined
            @click="confirmDelete"
          />
        </div>
      </div>

      <!-- Class and Version Info -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-2">Class</h3>
            <div v-if="choreographyNote.class_instance">
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                :style="{
                  backgroundColor: choreographyNote.class_instance.class_definition?.dance_style?.color + '20',
                  color: choreographyNote.class_instance.class_definition?.dance_style?.color || '#6b7280'
                }"
              >
                {{ choreographyNote.class_instance.class_definition?.name || choreographyNote.class_instance.name }}
              </span>
            </div>
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-2">Teacher</h3>
            <p class="text-gray-900">
              {{ choreographyNote.teacher?.first_name }} {{ choreographyNote.teacher?.last_name }}
            </p>
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-2">Version</h3>
            <p class="text-gray-900 flex items-center">
              v{{ choreographyNote.version }}
              <Button
                icon="pi pi-history"
                text
                rounded
                size="small"
                @click="showVersionHistory = !showVersionHistory"
                title="View version history"
                class="ml-2"
              />
            </p>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left Column -->
        <div class="space-y-6">
          <!-- Video -->
          <div v-if="choreographyNote.video_url" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <i class="pi pi-video mr-2 text-blue-600"></i>Routine Video
            </h2>
            <video
              :src="choreographyNote.video_url"
              controls
              class="w-full rounded-lg"
            />
          </div>

          <!-- Music Information -->
          <div v-if="choreographyNote.music_title || choreographyNote.music_link" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <i class="pi pi-music mr-2 text-purple-600"></i>Music
            </h2>
            <div class="space-y-3">
              <div v-if="choreographyNote.music_title">
                <span class="text-sm font-medium text-gray-500">Title:</span>
                <p class="text-gray-900 font-medium">{{ choreographyNote.music_title }}</p>
              </div>
              <div v-if="choreographyNote.music_artist">
                <span class="text-sm font-medium text-gray-500">Artist:</span>
                <p class="text-gray-900">{{ choreographyNote.music_artist }}</p>
              </div>
              <div v-if="choreographyNote.music_link">
                <Button
                  label="Listen to Music"
                  icon="pi pi-external-link"
                  @click="openLink(choreographyNote.music_link)"
                  class="bg-purple-600 hover:bg-purple-700 text-white"
                />
              </div>
            </div>
          </div>

          <!-- Counts Notation -->
          <div v-if="choreographyNote.counts_notation" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <i class="pi pi-clock mr-2 text-blue-600"></i>Counts
            </h2>
            <p class="text-gray-900 font-mono">{{ choreographyNote.counts_notation }}</p>
          </div>
        </div>

        <!-- Right Column -->
        <div class="space-y-6">
          <!-- Choreography Notes -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <i class="pi pi-file-edit mr-2 text-green-600"></i>Choreography Notes
            </h2>
            <div v-if="choreographyNote.notes" class="prose max-w-none">
              <pre class="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg">{{ choreographyNote.notes }}</pre>
            </div>
            <p v-else class="text-gray-500 italic">No notes added yet</p>
          </div>

          <!-- Formations -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-gray-900 flex items-center">
                <i class="pi pi-users mr-2 text-orange-600"></i>Formations
              </h2>
              <Button
                label="Add Formation"
                icon="pi pi-plus"
                size="small"
                @click="showFormationDialog = true"
                outlined
              />
            </div>

            <div v-if="formations.length > 0" class="space-y-4">
              <div
                v-for="formation in formations"
                :key="formation.id"
                class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-semibold text-gray-900">{{ formation.formation_name }}</h3>
                  <div class="flex gap-1">
                    <Button
                      icon="pi pi-pencil"
                      text
                      rounded
                      size="small"
                      @click="editFormation(formation)"
                    />
                    <Button
                      icon="pi pi-trash"
                      text
                      rounded
                      size="small"
                      severity="danger"
                      @click="confirmDeleteFormation(formation)"
                    />
                  </div>
                </div>
                <p v-if="formation.notes" class="text-sm text-gray-600 mb-2">{{ formation.notes }}</p>
                <div v-if="formation.formation_data" class="text-xs text-gray-500">
                  {{ formation.formation_data.dancers?.length || 0 }} dancers
                </div>
              </div>
            </div>
            <p v-else class="text-gray-500 italic">No formations added yet</p>
          </div>
        </div>
      </div>

      <!-- Version History Panel -->
      <div v-if="showVersionHistory && versions.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <i class="pi pi-history mr-2 text-indigo-600"></i>Version History
        </h2>
        <div class="space-y-3">
          <div
            v-for="version in versions"
            :key="version.id"
            class="border-l-4 border-indigo-500 pl-4 py-2"
          >
            <div class="flex justify-between items-start mb-1">
              <span class="font-semibold text-gray-900">Version {{ version.version }}</span>
              <span class="text-sm text-gray-500">{{ formatDate(version.created_at) }}</span>
            </div>
            <p v-if="version.change_summary" class="text-sm text-gray-600">{{ version.change_summary }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ version.title }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="text-center py-12">
      <i class="pi pi-exclamation-triangle text-gray-300 text-6xl mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">Choreography Note Not Found</h3>
      <Button
        label="Go Back"
        icon="pi pi-arrow-left"
        @click="router.back()"
        outlined
      />
    </div>

    <!-- Edit Dialog -->
    <ChoreographyNoteEditor
      v-if="choreographyNote"
      v-model:visible="showEditDialog"
      :note="choreographyNote"
      :classInstances="[]"
      @saved="handleNoteSaved"
    />

    <!-- Formation Dialog -->
    <FormationEditor
      v-if="choreographyNote"
      v-model:visible="showFormationDialog"
      :choreographyNoteId="choreographyNote.id"
      :formation="selectedFormation"
      @saved="handleFormationSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ChoreographyNote, ChoreographyFormation, ChoreographyVersion } from '~/types'

definePageMeta({
  middleware: 'teacher',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { fetchChoreographyNote, deleteChoreographyNote, deleteFormation } = useChoreographyService()
const toast = useToast()

// State
const loading = ref(true)
const choreographyNote = ref<ChoreographyNote | null>(null)
const formations = ref<ChoreographyFormation[]>([])
const versions = ref<ChoreographyVersion[]>([])
const showEditDialog = ref(false)
const showFormationDialog = ref(false)
const showVersionHistory = ref(false)
const selectedFormation = ref<ChoreographyFormation | null>(null)

// Load choreography note
const loadChoreographyNote = async () => {
  loading.value = true
  try {
    const id = route.params.id as string
    const response = await fetchChoreographyNote(id)
    if (response) {
      choreographyNote.value = response.choreography_note
      formations.value = response.formations || []
      versions.value = response.versions || []
    }
  } catch (error) {
    console.error('Failed to load choreography note:', error)
  } finally {
    loading.value = false
  }
}

// Handlers
const confirmDelete = async () => {
  if (!choreographyNote.value) return

  if (confirm(`Are you sure you want to delete "${choreographyNote.value.title}"?`)) {
    try {
      await deleteChoreographyNote(choreographyNote.value.id)
      router.push('/choreography')
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }
}

const editFormation = (formation: ChoreographyFormation) => {
  selectedFormation.value = formation
  showFormationDialog.value = true
}

const confirmDeleteFormation = async (formation: ChoreographyFormation) => {
  if (confirm(`Are you sure you want to delete the formation "${formation.formation_name}"?`)) {
    try {
      await deleteFormation(formation.id)
      loadChoreographyNote()
    } catch (error) {
      console.error('Failed to delete formation:', error)
    }
  }
}

const handleNoteSaved = () => {
  showEditDialog.value = false
  loadChoreographyNote()
}

const handleFormationSaved = () => {
  showFormationDialog.value = false
  selectedFormation.value = null
  loadChoreographyNote()
}

const openLink = (url: string) => {
  window.open(url, '_blank')
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  loadChoreographyNote()
})
</script>
