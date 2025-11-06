<template>
  <div class="choreography-notes-list">
    <div class="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Choreography Notes</h2>
        <p class="text-gray-600 mt-1">Document routines, formations, and music for your classes</p>
      </div>
      <Button
        label="New Choreography Note"
        icon="pi pi-plus"
        @click="showCreateDialog = true"
        class="bg-blue-600 hover:bg-blue-700 text-white"
      />
    </div>

    <!-- Filters -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex flex-col">
          <label class="text-sm font-medium text-gray-700 mb-2">Search</label>
          <InputText
            v-model="searchQuery"
            placeholder="Search by title, notes, or music..."
            class="w-full"
            @input="debouncedSearch"
          />
        </div>
        <div class="flex flex-col">
          <label class="text-sm font-medium text-gray-700 mb-2">Class</label>
          <Dropdown
            v-model="selectedClassInstance"
            :options="classInstances"
            optionLabel="name"
            optionValue="id"
            placeholder="All Classes"
            class="w-full"
            showClear
            @change="handleFilterChange"
          />
        </div>
        <div class="flex items-end">
          <Button
            label="Clear Filters"
            icon="pi pi-filter-slash"
            @click="clearFilters"
            class="w-full"
            outlined
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Notes Grid -->
    <div v-else-if="choreographyNotes.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="note in choreographyNotes"
        :key="note.id"
        class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
        @click="viewNote(note)"
      >
        <!-- Video Thumbnail -->
        <div v-if="note.video_url" class="relative h-48 bg-gray-900 rounded-t-lg overflow-hidden">
          <video
            :src="note.video_url"
            class="w-full h-full object-cover"
            preload="metadata"
          />
          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <i class="pi pi-play-circle text-white text-5xl"></i>
          </div>
          <div class="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            <i class="pi pi-video mr-1"></i> Video
          </div>
        </div>
        <div v-else class="h-48 bg-gradient-to-br from-purple-500 to-pink-500 rounded-t-lg flex items-center justify-center">
          <i class="pi pi-music text-white text-6xl opacity-50"></i>
        </div>

        <!-- Note Content -->
        <div class="p-4">
          <div class="flex items-start justify-between mb-2">
            <h3 class="text-lg font-semibold text-gray-900 line-clamp-1">{{ note.title }}</h3>
            <span class="text-xs text-gray-500 ml-2">v{{ note.version }}</span>
          </div>

          <!-- Class Info -->
          <div v-if="note.class_instance" class="mb-3">
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              :style="{
                backgroundColor: note.class_instance.class_definition?.dance_style?.color + '20',
                color: note.class_instance.class_definition?.dance_style?.color || '#6b7280'
              }"
            >
              {{ note.class_instance.class_definition?.name || note.class_instance.name }}
            </span>
          </div>

          <!-- Description -->
          <p v-if="note.description" class="text-sm text-gray-600 mb-3 line-clamp-2">
            {{ note.description }}
          </p>

          <!-- Music Info -->
          <div v-if="note.music_title" class="flex items-center text-sm text-gray-700 mb-2">
            <i class="pi pi-music text-purple-600 mr-2"></i>
            <span class="font-medium">{{ note.music_title }}</span>
            <span v-if="note.music_artist" class="text-gray-500 ml-1">- {{ note.music_artist }}</span>
          </div>

          <!-- Counts -->
          <div v-if="note.counts_notation" class="flex items-center text-sm text-gray-600 mb-3">
            <i class="pi pi-clock text-blue-600 mr-2"></i>
            <span>{{ note.counts_notation }}</span>
          </div>

          <!-- Footer Info -->
          <div class="flex items-center justify-between pt-3 border-t border-gray-200">
            <div class="flex items-center space-x-3 text-xs text-gray-500">
              <span v-if="note.formations && note.formations.length > 0">
                <i class="pi pi-users mr-1"></i>{{ note.formations.length }} formation(s)
              </span>
              <span>
                <i class="pi pi-calendar mr-1"></i>{{ formatDate(note.updated_at) }}
              </span>
            </div>
            <Button
              icon="pi pi-ellipsis-v"
              text
              rounded
              @click.stop="showNoteMenu($event, note)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <i class="pi pi-music text-gray-300 text-6xl mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">No Choreography Notes</h3>
      <p class="text-gray-500 mb-6">Get started by creating your first choreography note</p>
      <Button
        label="Create Choreography Note"
        icon="pi pi-plus"
        @click="showCreateDialog = true"
        class="bg-blue-600 hover:bg-blue-700 text-white"
      />
    </div>

    <!-- Context Menu -->
    <Menu ref="menu" :model="menuItems" :popup="true" />

    <!-- Create/Edit Dialog -->
    <ChoreographyNoteEditor
      v-model:visible="showCreateDialog"
      :note="selectedNote"
      :classInstances="classInstances"
      @saved="handleNoteSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ChoreographyNote } from '~/types'

const { fetchChoreographyNotes, deleteChoreographyNote } = useChoreographyService()
const toast = useToast()
const router = useRouter()

// State
const loading = ref(false)
const choreographyNotes = ref<ChoreographyNote[]>([])
const classInstances = ref<any[]>([])
const searchQuery = ref('')
const selectedClassInstance = ref<string | null>(null)
const showCreateDialog = ref(false)
const selectedNote = ref<ChoreographyNote | null>(null)
const menu = ref()

// Menu items
const menuItems = ref([
  {
    label: 'View Details',
    icon: 'pi pi-eye',
    command: () => viewNote(selectedNote.value!)
  },
  {
    label: 'Edit',
    icon: 'pi pi-pencil',
    command: () => editNote(selectedNote.value!)
  },
  {
    separator: true
  },
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => confirmDelete(selectedNote.value!)
  }
])

// Load data
const loadChoreographyNotes = async () => {
  loading.value = true
  try {
    const filters: any = {}
    if (selectedClassInstance.value) {
      filters.class_instance_id = selectedClassInstance.value
    }
    if (searchQuery.value) {
      filters.search = searchQuery.value
    }

    const response = await fetchChoreographyNotes(filters)
    choreographyNotes.value = response?.choreography_notes || []
  } catch (error) {
    console.error('Failed to load choreography notes:', error)
  } finally {
    loading.value = false
  }
}

// Load class instances for filter
const loadClassInstances = async () => {
  try {
    const { data } = await useFetch('/api/class-instances')
    classInstances.value = data.value || []
  } catch (error) {
    console.error('Failed to load class instances:', error)
  }
}

// Debounced search
let searchTimeout: NodeJS.Timeout
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadChoreographyNotes()
  }, 500)
}

// Handlers
const handleFilterChange = () => {
  loadChoreographyNotes()
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedClassInstance.value = null
  loadChoreographyNotes()
}

const viewNote = (note: ChoreographyNote) => {
  router.push(`/choreography/${note.id}`)
}

const editNote = (note: ChoreographyNote) => {
  selectedNote.value = note
  showCreateDialog.value = true
}

const showNoteMenu = (event: Event, note: ChoreographyNote) => {
  selectedNote.value = note
  menu.value.toggle(event)
}

const confirmDelete = async (note: ChoreographyNote) => {
  if (confirm(`Are you sure you want to delete "${note.title}"?`)) {
    try {
      await deleteChoreographyNote(note.id)
      loadChoreographyNotes()
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }
}

const handleNoteSaved = () => {
  showCreateDialog.value = false
  selectedNote.value = null
  loadChoreographyNotes()
}

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Lifecycle
onMounted(() => {
  loadClassInstances()
  loadChoreographyNotes()
})
</script>
