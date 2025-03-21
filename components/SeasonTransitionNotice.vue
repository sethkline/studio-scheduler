<template>
  <div v-if="transition.isTransitionPeriod" class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded shadow">
    <div class="flex items-start">
      <div class="flex-shrink-0 pt-0.5">
        <i class="pi pi-calendar text-blue-500 text-xl"></i>
      </div>
      <div class="ml-3 flex-1">
        <h3 class="text-lg font-medium text-blue-800">Season Transition Notice</h3>
        <div class="mt-2 text-sm text-blue-700">
          <p v-if="transition.hasUpcomingRecitals" class="mb-2">
            You have upcoming recitals scheduled while preparing for the next season.
          </p>
          <p v-if="transition.daysUntilEndOfSeason <= 30" class="mb-2">
            The current season ({{ transition.currentSeason }}) ends in {{ transition.daysUntilEndOfSeason }} days.
          </p>
          <p class="font-semibold mb-2">
            {{ transition.message }}
          </p>
          
          <div v-if="transition.nextSteps.length > 0" class="mt-3">
            <p class="font-medium mb-1">Recommended next steps:</p>
            <ul class="list-disc pl-5 space-y-1">
              <li v-for="(step, index) in transition.nextSteps" :key="index">
                {{ step }}
              </li>
            </ul>
          </div>
        </div>
        
        <div class="mt-4 flex" v-if="transition.shouldCreateNewSeason">
          <Button 
            label="Create New Season Schedule" 
            icon="pi pi-calendar-plus" 
            class="p-button-sm p-button-primary" 
            @click="createNewSeason" 
          />
        </div>
        <div class="mt-4 flex" v-else-if="transition.existingSchedules?.length > 0">
          <Button 
            label="Manage Existing Schedules" 
            icon="pi pi-calendar" 
            class="p-button-sm p-button-secondary" 
            @click="manageSchedules" 
          />
        </div>
      </div>
      
      <Button 
        icon="pi pi-times" 
        class="p-button-rounded p-button-text p-button-sm" 
        @click="$emit('dismiss')" 
        aria-label="Dismiss"
      />
    </div>
  </div>
  
  <!-- Dialog for creating new season -->
  <Dialog 
    v-model:visible="newSeasonDialog.visible" 
    :style="{width: '550px'}" 
    header="Create New Season Schedule" 
    :modal="true"
    :closable="true"
  >
    <div class="space-y-4">
      <div class="field">
        <label for="seasonName" class="font-medium">Season Name*</label>
        <InputText 
          id="seasonName" 
          v-model="newSeasonDialog.name" 
          required 
          autofocus 
          class="w-full"
        />
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="field">
          <label for="startDate" class="font-medium">Start Date*</label>
          <Calendar 
            id="startDate" 
            v-model="newSeasonDialog.startDate" 
            dateFormat="yy-mm-dd" 
            class="w-full"
          />
        </div>
        
        <div class="field">
          <label for="endDate" class="font-medium">End Date*</label>
          <Calendar 
            id="endDate" 
            v-model="newSeasonDialog.endDate" 
            dateFormat="yy-mm-dd" 
            class="w-full"
            :minDate="newSeasonDialog.startDate ? new Date(newSeasonDialog.startDate) : undefined"
          />
        </div>
      </div>
      
      <div class="field">
        <label for="description" class="font-medium">Description</label>
        <Textarea 
          id="description" 
          v-model="newSeasonDialog.description" 
          rows="3" 
          class="w-full"
        />
      </div>
      
      <div class="field-checkbox">
        <Checkbox id="copyClasses" v-model="newSeasonDialog.copyClasses" :binary="true" />
        <label for="copyClasses" class="ml-2">Copy classes from current season</label>
      </div>
    </div>
    
    <template #footer>
      <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="closeNewSeasonDialog" />
      <Button label="Create Season" icon="pi pi-check" class="p-button-primary" @click="saveNewSeason" :loading="creating" />
    </template>
  </Dialog>
</template>

<script setup>
import { useScheduleManager } from '~/composables/useScheduleManager'
import { useScheduleTermStore } from '~/stores/useScheduleTermStore'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'

const props = defineProps({
  shown: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['dismiss', 'seasonCreated'])

const toast = useToast()
const router = useRouter()
const { suggestScheduleTransition, transitionClassesToNewSeason } = useScheduleManager()
const scheduleTermStore = useScheduleTermStore()

const transition = ref({
  isTransitionPeriod: false,
  message: '',
  currentSeason: '',
  nextSeason: null,
  hasUpcomingRecitals: false,
  recitals: [],
  daysUntilEndOfSeason: 0,
  existingSchedules: [],
  nextSteps: [],
  shouldCreateNewSeason: false
})

// Dialog state
const newSeasonDialog = reactive({
  visible: false,
  name: '',
  startDate: null,
  endDate: null,
  description: '',
  copyClasses: true
})

const creating = ref(false)

// Check for season transition on mount
onMounted(async () => {
  await checkForTransition()
})

async function checkForTransition() {
  const result = await suggestScheduleTransition()
  transition.value = result
}

function createNewSeason() {
  // Initialize dialog with suggested values
  newSeasonDialog.name = transition.value.nextSeason.name
  newSeasonDialog.startDate = transition.value.nextSeason.suggestedStartDate
  newSeasonDialog.endDate = transition.value.nextSeason.suggestedEndDate
  newSeasonDialog.description = `Schedule for ${transition.value.nextSeason.name} season`
  newSeasonDialog.copyClasses = true
  
  newSeasonDialog.visible = true
}

function closeNewSeasonDialog() {
  newSeasonDialog.visible = false
}

async function saveNewSeason() {
  if (!newSeasonDialog.name || !newSeasonDialog.startDate || !newSeasonDialog.endDate) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all required fields',
      life: 3000
    })
    return
  }
  
  creating.value = true
  
  try {
    // 1. Create the new season schedule
    const newSchedule = await scheduleTermStore.createSchedule({
      name: newSeasonDialog.name,
      description: newSeasonDialog.description,
      start_date: newSeasonDialog.startDate,
      end_date: newSeasonDialog.endDate,
      is_active: false
    })
    
    // 2. If copying classes is selected, copy them from the current active schedule
    if (newSeasonDialog.copyClasses && transition.value.currentSeason) {
      // Find the current schedule ID
      const activeSchedules = await scheduleTermStore.fetchSchedules({ isActive: true })
      
      if (activeSchedules && activeSchedules.length > 0) {
        const currentScheduleId = activeSchedules[0].id
        
        // Copy classes from current to new schedule
        const result = await transitionClassesToNewSeason(currentScheduleId, newSchedule.id)
        
        if (result.success) {
          toast.add({
            severity: 'success',
            summary: 'Classes Copied',
            detail: `${result.count} classes were copied to the new schedule`,
            life: 3000
          })
        } else {
          toast.add({
            severity: 'warn',
            summary: 'Warning',
            detail: result.message || 'Could not copy classes to the new schedule',
            life: 5000
          })
        }
      }
    }
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `${newSeasonDialog.name} schedule has been created successfully`,
      life: 3000
    })
    
    // Close dialog
    closeNewSeasonDialog()
    
    // Emit event
    emit('seasonCreated', newSchedule)
    
    // Navigate to the new schedule builder
    router.push(`/schedules/${newSchedule.id}/builder`)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to create new season schedule',
      life: 5000
    })
  } finally {
    creating.value = false
  }
}

function manageSchedules() {
  router.push('/schedules')
}
</script>