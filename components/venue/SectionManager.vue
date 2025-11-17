<script setup lang="ts">
/**
 * Section Manager Component
 * Allows creating, editing, reordering, and deleting venue sections
 */

import type { VenueSection } from '~/types'

interface Props {
  venueId: string
  sections: VenueSection[]
}

interface Emits {
  (e: 'refresh'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { createSection, updateSection, deleteSection } = useVenues()

// Dialog states
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)

// Form states
const createForm = ref({
  name: ''
})

const editForm = ref<VenueSection | null>(null)
const sectionToDelete = ref<VenueSection | null>(null)

// Loading states
const creating = ref(false)
const updating = ref(false)
const deleting = ref(false)

// Computed sorted sections
const sortedSections = computed(() => {
  return [...props.sections].sort((a, b) => a.display_order - b.display_order)
})

// Open create dialog
const openCreateDialog = () => {
  createForm.value = { name: '' }
  showCreateDialog.value = true
}

// Handle create section
const handleCreate = async () => {
  if (!createForm.value.name.trim()) {
    return
  }

  creating.value = true
  try {
    await createSection(props.venueId, {
      name: createForm.value.name.trim()
    })

    showCreateDialog.value = false
    createForm.value = { name: '' }
    emit('refresh')
  } catch (error) {
    console.error('Failed to create section:', error)
  } finally {
    creating.value = false
  }
}

// Open edit dialog
const openEditDialog = (section: VenueSection) => {
  editForm.value = { ...section }
  showEditDialog.value = true
}

// Handle update section
const handleUpdate = async () => {
  if (!editForm.value || !editForm.value.name.trim()) {
    return
  }

  updating.value = true
  try {
    await updateSection(props.venueId, editForm.value.id, {
      name: editForm.value.name.trim(),
      display_order: editForm.value.display_order
    })

    showEditDialog.value = false
    editForm.value = null
    emit('refresh')
  } catch (error) {
    console.error('Failed to update section:', error)
  } finally {
    updating.value = false
  }
}

// Open delete confirmation dialog
const openDeleteDialog = (section: VenueSection) => {
  sectionToDelete.value = section
  showDeleteDialog.value = true
}

// Handle delete section
const handleDelete = async () => {
  if (!sectionToDelete.value) return

  deleting.value = true
  try {
    await deleteSection(props.venueId, sectionToDelete.value.id)

    showDeleteDialog.value = false
    sectionToDelete.value = null
    emit('refresh')
  } catch (error) {
    console.error('Failed to delete section:', error)
  } finally {
    deleting.value = false
  }
}

// Move section up in display order
const moveSectionUp = async (section: VenueSection) => {
  const currentIndex = sortedSections.value.findIndex(s => s.id === section.id)
  if (currentIndex <= 0) return

  const previousSection = sortedSections.value[currentIndex - 1]

  // Swap display orders
  try {
    await updateSection(props.venueId, section.id, {
      display_order: previousSection.display_order
    })
    await updateSection(props.venueId, previousSection.id, {
      display_order: section.display_order
    })
    emit('refresh')
  } catch (error) {
    console.error('Failed to reorder sections:', error)
  }
}

// Move section down in display order
const moveSectionDown = async (section: VenueSection) => {
  const currentIndex = sortedSections.value.findIndex(s => s.id === section.id)
  if (currentIndex >= sortedSections.value.length - 1) return

  const nextSection = sortedSections.value[currentIndex + 1]

  // Swap display orders
  try {
    await updateSection(props.venueId, section.id, {
      display_order: nextSection.display_order
    })
    await updateSection(props.venueId, nextSection.id, {
      display_order: section.display_order
    })
    emit('refresh')
  } catch (error) {
    console.error('Failed to reorder sections:', error)
  }
}
</script>

<template>
  <div class="section-manager">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-900">Sections</h3>
      <Button
        label="Add Section"
        icon="pi pi-plus"
        size="small"
        @click="openCreateDialog"
      />
    </div>

    <!-- Sections List -->
    <div v-if="sortedSections.length > 0" class="space-y-2">
      <Card
        v-for="(section, index) in sortedSections"
        :key="section.id"
        class="p-3"
      >
        <template #content>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 flex-1">
              <div class="flex flex-col gap-1">
                <Button
                  icon="pi pi-chevron-up"
                  text
                  size="small"
                  :disabled="index === 0"
                  @click="moveSectionUp(section)"
                />
                <Button
                  icon="pi pi-chevron-down"
                  text
                  size="small"
                  :disabled="index === sortedSections.length - 1"
                  @click="moveSectionDown(section)"
                />
              </div>

              <div>
                <div class="font-medium text-gray-900">{{ section.name }}</div>
                <div class="text-sm text-gray-500">
                  Order: {{ section.display_order }}
                  <span v-if="section.seats">
                    · {{ section.seats.length }} seats
                  </span>
                </div>
              </div>
            </div>

            <div class="flex gap-2">
              <Button
                icon="pi pi-pencil"
                text
                severity="secondary"
                @click="openEditDialog(section)"
              />
              <Button
                icon="pi pi-trash"
                text
                severity="danger"
                @click="openDeleteDialog(section)"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8 text-gray-500">
      <i class="pi pi-inbox text-4xl mb-3 block" />
      <p>No sections yet. Add your first section to get started.</p>
    </div>

    <!-- Create Section Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      header="Add Section"
      :modal="true"
      :style="{ width: '450px' }"
    >
      <div class="space-y-4">
        <div class="field">
          <label for="section-name" class="font-medium text-sm mb-2 block">
            Section Name <span class="text-red-500">*</span>
          </label>
          <InputText
            id="section-name"
            v-model="createForm.name"
            class="w-full"
            placeholder="e.g., Orchestra, Balcony"
            autofocus
          />
          <small class="text-gray-500">
            Common names: Orchestra, Balcony, Mezzanine, Box Seats
          </small>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="showCreateDialog = false"
          :disabled="creating"
        />
        <Button
          label="Create"
          @click="handleCreate"
          :loading="creating"
          :disabled="!createForm.name.trim()"
        />
      </template>
    </Dialog>

    <!-- Edit Section Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      header="Edit Section"
      :modal="true"
      :style="{ width: '450px' }"
    >
      <div v-if="editForm" class="space-y-4">
        <div class="field">
          <label for="edit-section-name" class="font-medium text-sm mb-2 block">
            Section Name <span class="text-red-500">*</span>
          </label>
          <InputText
            id="edit-section-name"
            v-model="editForm.name"
            class="w-full"
            placeholder="e.g., Orchestra, Balcony"
          />
        </div>

        <div class="field">
          <label for="edit-display-order" class="font-medium text-sm mb-2 block">
            Display Order
          </label>
          <InputNumber
            id="edit-display-order"
            v-model="editForm.display_order"
            class="w-full"
            :min="1"
          />
          <small class="text-gray-500">
            Lower numbers appear first in lists
          </small>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="showEditDialog = false"
          :disabled="updating"
        />
        <Button
          label="Update"
          @click="handleUpdate"
          :loading="updating"
          :disabled="!editForm?.name.trim()"
        />
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="Confirm Delete"
      :modal="true"
      :style="{ width: '450px' }"
    >
      <p>
        Are you sure you want to delete the section
        <strong>{{ sectionToDelete?.name }}</strong>?
      </p>
      <p class="text-sm text-gray-600 mt-2">
        This action cannot be undone. You cannot delete a section that has seats.
      </p>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="showDeleteDialog = false"
          :disabled="deleting"
        />
        <Button
          label="Delete"
          severity="danger"
          @click="handleDelete"
          :loading="deleting"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.section-manager {
  @apply space-y-4;
}
</style>
