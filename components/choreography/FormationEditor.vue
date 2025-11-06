<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :header="formation ? 'Edit Formation' : 'Add Formation'"
    :modal="true"
    :style="{ width: '50rem' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
  >
    <div class="space-y-4 py-4">
      <!-- Formation Name -->
      <div class="flex flex-col">
        <label for="formationName" class="text-sm font-medium text-gray-700 mb-2">
          Formation Name <span class="text-red-500">*</span>
        </label>
        <InputText
          id="formationName"
          v-model="formData.formation_name"
          placeholder="e.g., Opening Formation, Verse 1"
          class="w-full"
          :class="{ 'border-red-500': errors.formation_name }"
        />
        <small v-if="errors.formation_name" class="text-red-500 mt-1">{{ errors.formation_name }}</small>
      </div>

      <!-- Formation Order -->
      <div class="flex flex-col">
        <label for="formationOrder" class="text-sm font-medium text-gray-700 mb-2">
          Order in Routine
        </label>
        <InputNumber
          id="formationOrder"
          v-model="formData.formation_order"
          :min="0"
          class="w-full"
        />
        <small class="text-gray-500 mt-1">
          Position of this formation in the routine sequence
        </small>
      </div>

      <!-- Notes -->
      <div class="flex flex-col">
        <label for="formationNotes" class="text-sm font-medium text-gray-700 mb-2">
          Formation Notes
        </label>
        <Textarea
          id="formationNotes"
          v-model="formData.notes"
          placeholder="Describe the formation, transitions, timing, etc."
          rows="4"
          class="w-full"
        />
      </div>

      <!-- Dancers Section -->
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-sm font-semibold text-orange-900 flex items-center">
            <i class="pi pi-users mr-2"></i>Dancer Positions
          </h4>
          <Button
            label="Add Dancer"
            icon="pi pi-plus"
            size="small"
            @click="addDancer"
            outlined
          />
        </div>

        <div v-if="dancers.length > 0" class="space-y-3">
          <div
            v-for="(dancer, index) in dancers"
            :key="index"
            class="bg-white border border-gray-200 rounded-lg p-3"
          >
            <div class="flex justify-between items-start mb-2">
              <span class="text-sm font-medium text-gray-700">Dancer {{ index + 1 }}</span>
              <Button
                icon="pi pi-times"
                text
                rounded
                size="small"
                severity="danger"
                @click="removeDancer(index)"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-600 mb-1">Name</label>
                <InputText
                  v-model="dancer.name"
                  placeholder="Dancer name"
                  size="small"
                  class="w-full"
                />
              </div>
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-600 mb-1">Position Notes</label>
                <InputText
                  v-model="dancer.notes"
                  placeholder="e.g., Center stage, Front left"
                  size="small"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Stage Position (simplified) -->
            <div class="mt-2">
              <label class="text-xs font-medium text-gray-600 mb-1 block">
                Stage Position (X: {{ dancer.position.x }}, Y: {{ dancer.position.y }})
              </label>
              <div class="grid grid-cols-2 gap-2">
                <div class="flex flex-col">
                  <label class="text-xs text-gray-500">Horizontal (X)</label>
                  <Slider
                    v-model="dancer.position.x"
                    :min="0"
                    :max="100"
                    class="w-full"
                  />
                  <small class="text-xs text-gray-500">0 = Stage Left, 100 = Stage Right</small>
                </div>
                <div class="flex flex-col">
                  <label class="text-xs text-gray-500">Vertical (Y)</label>
                  <Slider
                    v-model="dancer.position.y"
                    :min="0"
                    :max="100"
                    class="w-full"
                  />
                  <small class="text-xs text-gray-500">0 = Upstage, 100 = Downstage</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-6">
          <p class="text-sm text-gray-500 mb-3">No dancers added yet</p>
          <Button
            label="Add First Dancer"
            icon="pi pi-plus"
            size="small"
            @click="addDancer"
            outlined
          />
        </div>
      </div>

      <!-- Visual Stage Preview (simple) -->
      <div v-if="dancers.length > 0" class="bg-gray-100 border border-gray-300 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-gray-700 mb-3 text-center">Stage Preview</h4>
        <div class="relative bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg" style="height: 300px; width: 100%;">
          <!-- Stage labels -->
          <div class="absolute top-2 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-50">Upstage</div>
          <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-50">Downstage</div>
          <div class="absolute top-1/2 left-2 transform -translate-y-1/2 text-white text-xs opacity-50">SL</div>
          <div class="absolute top-1/2 right-2 transform -translate-y-1/2 text-white text-xs opacity-50">SR</div>

          <!-- Dancers as dots -->
          <div
            v-for="(dancer, index) in dancers"
            :key="index"
            class="absolute w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
            :style="{
              left: `${dancer.position.x}%`,
              top: `${dancer.position.y}%`
            }"
            :title="dancer.name || `Dancer ${index + 1}`"
          >
            {{ index + 1 }}
          </div>
        </div>
        <p class="text-xs text-gray-500 text-center mt-2">
          Drag sliders above to position dancers on stage
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          icon="pi pi-times"
          @click="handleCancel"
          outlined
        />
        <Button
          label="Save Formation"
          icon="pi pi-check"
          @click="handleSave"
          :loading="saving"
          class="bg-blue-600 hover:bg-blue-700 text-white"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ChoreographyFormation, DancerPosition } from '~/types'

const props = defineProps<{
  visible: boolean
  choreographyNoteId: string
  formation?: ChoreographyFormation | null
}>()

const emit = defineEmits(['update:visible', 'saved'])

const { createFormation, updateFormation } = useChoreographyService()
const toast = useToast()

// State
const formData = ref({
  choreography_note_id: props.choreographyNoteId,
  formation_name: '',
  formation_order: 0,
  notes: ''
})

const dancers = ref<DancerPosition[]>([])
const errors = ref<Record<string, string>>({})
const saving = ref(false)

// Watch for formation changes
watch(() => props.formation, (newFormation) => {
  if (newFormation) {
    formData.value = {
      choreography_note_id: props.choreographyNoteId,
      formation_name: newFormation.formation_name,
      formation_order: newFormation.formation_order,
      notes: newFormation.notes || ''
    }
    dancers.value = newFormation.formation_data?.dancers || []
  } else {
    resetForm()
  }
}, { immediate: true })

// Dancer management
const addDancer = () => {
  dancers.value.push({
    name: '',
    position: { x: 50, y: 50 }, // Center stage by default
    notes: ''
  })
}

const removeDancer = (index: number) => {
  dancers.value.splice(index, 1)
}

// Validation
const validate = () => {
  errors.value = {}

  if (!formData.value.formation_name) {
    errors.value.formation_name = 'Formation name is required'
  }

  return Object.keys(errors.value).length === 0
}

// Handlers
const handleSave = async () => {
  if (!validate()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all required fields',
      life: 3000
    })
    return
  }

  saving.value = true
  try {
    const formationData = {
      ...formData.value,
      formation_data: {
        dancers: dancers.value
      }
    }

    if (props.formation) {
      await updateFormation(props.formation.id, formationData)
    } else {
      await createFormation(formationData)
    }

    emit('saved')
    resetForm()
  } catch (error) {
    console.error('Failed to save formation:', error)
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
  resetForm()
}

const resetForm = () => {
  formData.value = {
    choreography_note_id: props.choreographyNoteId,
    formation_name: '',
    formation_order: 0,
    notes: ''
  }
  dancers.value = []
  errors.value = {}
}
</script>
