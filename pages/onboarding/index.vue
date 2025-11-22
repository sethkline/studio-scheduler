<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
    <Card class="w-full max-w-4xl shadow-2xl">
      <template #header>
        <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <h1 class="text-3xl font-bold mb-2">Welcome to Your Dance Studio Manager</h1>
          <p class="text-purple-100">Let's get your studio set up in just a few steps</p>
        </div>
      </template>

      <template #content>
        <!-- Progress Indicator -->
        <div class="mb-8">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700">Step {{ currentStep + 1 }} of {{ steps.length }}</span>
            <span class="text-sm text-gray-500">{{ Math.round(progress) }}% Complete</span>
          </div>
          <ProgressBar :value="progress" :showValue="false" />
        </div>

        <!-- Step Content -->
        <div class="min-h-[400px]">
          <!-- Welcome Step -->
          <div v-if="currentStep === 0" class="text-center space-y-6">
            <div class="flex justify-center">
              <div class="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <i class="pi pi-star text-5xl text-white"></i>
              </div>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-800 mb-3">Let's Get Started!</h2>
              <p class="text-gray-600 max-w-2xl mx-auto">
                We'll help you set up your studio in just a few minutes. This wizard will guide you through:
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <div class="flex items-start gap-3 p-4 bg-white rounded-lg shadow">
                <i class="pi pi-building text-2xl text-purple-600 mt-1"></i>
                <div>
                  <h3 class="font-semibold text-gray-800">Studio Profile</h3>
                  <p class="text-sm text-gray-600">Basic information and contact details</p>
                </div>
              </div>
              <div class="flex items-start gap-3 p-4 bg-white rounded-lg shadow">
                <i class="pi pi-map-marker text-2xl text-blue-600 mt-1"></i>
                <div>
                  <h3 class="font-semibold text-gray-800">Locations & Rooms</h3>
                  <p class="text-sm text-gray-600">Where your classes take place</p>
                </div>
              </div>
              <div class="flex items-start gap-3 p-4 bg-white rounded-lg shadow">
                <i class="pi pi-palette text-2xl text-pink-600 mt-1"></i>
                <div>
                  <h3 class="font-semibold text-gray-800">Dance Styles</h3>
                  <p class="text-sm text-gray-600">Ballet, Jazz, Hip Hop, and more</p>
                </div>
              </div>
              <div class="flex items-start gap-3 p-4 bg-white rounded-lg shadow">
                <i class="pi pi-chart-line text-2xl text-green-600 mt-1"></i>
                <div>
                  <h3 class="font-semibold text-gray-800">Class Levels</h3>
                  <p class="text-sm text-gray-600">Beginner, Intermediate, Advanced</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Studio Profile Step -->
          <div v-if="currentStep === 1" class="space-y-6">
            <div>
              <h2 class="text-2xl font-bold text-gray-800 mb-2">Studio Profile</h2>
              <p class="text-gray-600">Tell us about your dance studio</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block mb-2 font-medium">Studio Name *</label>
                <InputText v-model="studioProfile.name" class="w-full" placeholder="e.g., Starlight Dance Academy" />
              </div>

              <div>
                <label class="block mb-2 font-medium">Email *</label>
                <InputText v-model="studioProfile.email" type="email" class="w-full" placeholder="info@studio.com" />
              </div>

              <div>
                <label class="block mb-2 font-medium">Phone *</label>
                <InputText v-model="studioProfile.phone" class="w-full" placeholder="(555) 123-4567" />
              </div>

              <div class="md:col-span-2">
                <label class="block mb-2 font-medium">Address</label>
                <InputText v-model="studioProfile.address" class="w-full" placeholder="123 Main Street" />
              </div>

              <div>
                <label class="block mb-2 font-medium">City</label>
                <InputText v-model="studioProfile.city" class="w-full" placeholder="City" />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block mb-2 font-medium">State</label>
                  <InputText v-model="studioProfile.state" class="w-full" placeholder="CA" />
                </div>
                <div>
                  <label class="block mb-2 font-medium">ZIP</label>
                  <InputText v-model="studioProfile.zip_code" class="w-full" placeholder="12345" />
                </div>
              </div>

              <div class="md:col-span-2">
                <label class="block mb-2 font-medium">Website</label>
                <InputText v-model="studioProfile.website" class="w-full" placeholder="https://yourstudio.com" />
              </div>
            </div>
          </div>

          <!-- Locations & Rooms Step -->
          <div v-if="currentStep === 2" class="space-y-6">
            <div>
              <h2 class="text-2xl font-bold text-gray-800 mb-2">Locations & Rooms</h2>
              <p class="text-gray-600">Add your studio locations and dance rooms</p>
            </div>

            <div class="space-y-4">
              <div v-for="(location, idx) in locations" :key="idx" class="border rounded-lg p-4 bg-gray-50">
                <div class="flex justify-between items-start mb-3">
                  <h3 class="font-semibold text-gray-800">Location {{ idx + 1 }}</h3>
                  <Button
                    v-if="locations.length > 1"
                    icon="pi pi-trash"
                    text
                    rounded
                    severity="danger"
                    size="small"
                    @click="removeLocation(idx)"
                  />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label class="block mb-1 text-sm">Location Name *</label>
                    <InputText v-model="location.name" class="w-full" placeholder="Main Studio" />
                  </div>
                  <div>
                    <label class="block mb-1 text-sm">Address</label>
                    <InputText v-model="location.address" class="w-full" placeholder="123 Dance St" />
                  </div>
                </div>

                <div>
                  <label class="block mb-2 text-sm font-medium">Rooms</label>
                  <div class="space-y-2">
                    <div v-for="(room, roomIdx) in location.rooms" :key="roomIdx" class="flex gap-2">
                      <InputText
                        v-model="room.name"
                        class="flex-1"
                        placeholder="Studio A"
                      />
                      <InputNumber
                        v-model="room.capacity"
                        class="w-24"
                        placeholder="Cap."
                        :min="1"
                      />
                      <Button
                        v-if="location.rooms.length > 1"
                        icon="pi pi-times"
                        text
                        rounded
                        size="small"
                        @click="removeRoom(idx, roomIdx)"
                      />
                    </div>
                    <Button
                      label="Add Room"
                      icon="pi pi-plus"
                      text
                      size="small"
                      @click="addRoom(idx)"
                    />
                  </div>
                </div>
              </div>

              <Button
                label="Add Another Location"
                icon="pi pi-plus"
                outlined
                class="w-full"
                @click="addLocation"
              />
            </div>
          </div>

          <!-- Dance Styles Step -->
          <div v-if="currentStep === 3" class="space-y-6">
            <div>
              <h2 class="text-2xl font-bold text-gray-800 mb-2">Dance Styles</h2>
              <p class="text-gray-600">Select the dance styles you teach</p>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div
                v-for="style in commonDanceStyles"
                :key="style.name"
                class="border-2 rounded-lg p-4 cursor-pointer transition-all"
                :class="isStyleSelected(style.name) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'"
                @click="toggleStyle(style)"
              >
                <div class="flex items-center gap-2">
                  <Checkbox :modelValue="isStyleSelected(style.name)" :binary="true" />
                  <div>
                    <div class="font-semibold text-gray-800">{{ style.name }}</div>
                    <div
                      class="w-8 h-3 rounded mt-1"
                      :style="{ backgroundColor: style.color }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t pt-4">
              <h3 class="font-semibold text-gray-800 mb-3">Add Custom Style</h3>
              <div class="flex gap-2">
                <InputText
                  v-model="customStyle.name"
                  class="flex-1"
                  placeholder="Style name"
                />
                <input
                  v-model="customStyle.color"
                  type="color"
                  class="w-16 h-10 rounded cursor-pointer"
                />
                <Button
                  label="Add"
                  icon="pi pi-plus"
                  @click="addCustomStyle"
                />
              </div>
            </div>

            <div v-if="selectedStyles.length > 0" class="bg-blue-50 p-4 rounded-lg">
              <p class="text-sm text-blue-800">
                <strong>{{ selectedStyles.length }}</strong> dance style(s) selected
              </p>
            </div>
          </div>

          <!-- Class Levels Step -->
          <div v-if="currentStep === 4" class="space-y-6">
            <div>
              <h2 class="text-2xl font-bold text-gray-800 mb-2">Class Levels</h2>
              <p class="text-gray-600">Define skill levels for your classes</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="level in commonClassLevels"
                :key="level.name"
                class="border-2 rounded-lg p-4 cursor-pointer transition-all"
                :class="isLevelSelected(level.name) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'"
                @click="toggleLevel(level)"
              >
                <div class="flex items-center gap-2">
                  <Checkbox :modelValue="isLevelSelected(level.name)" :binary="true" />
                  <div class="flex-1">
                    <div class="font-semibold text-gray-800">{{ level.name }}</div>
                    <div class="text-sm text-gray-600">{{ level.description }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t pt-4">
              <h3 class="font-semibold text-gray-800 mb-3">Add Custom Level</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <InputText
                  v-model="customLevel.name"
                  placeholder="Level name"
                />
                <InputNumber
                  v-model="customLevel.sort_order"
                  placeholder="Order"
                  :min="0"
                />
                <Button
                  label="Add"
                  icon="pi pi-plus"
                  @click="addCustomLevel"
                />
              </div>
            </div>

            <div v-if="selectedLevels.length > 0" class="bg-green-50 p-4 rounded-lg">
              <p class="text-sm text-green-800">
                <strong>{{ selectedLevels.length }}</strong> class level(s) selected
              </p>
            </div>
          </div>

          <!-- Completion Step -->
          <div v-if="currentStep === 5" class="text-center space-y-6">
            <div class="flex justify-center">
              <div class="w-24 h-24 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <i class="pi pi-check text-5xl text-white"></i>
              </div>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-800 mb-3">You're All Set!</h2>
              <p class="text-gray-600 max-w-2xl mx-auto">
                Your studio is now configured and ready to use. Here's what you can do next:
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <Card class="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" @click="navigateTo('/students')">
                <template #content>
                  <div class="text-center">
                    <i class="pi pi-users text-4xl text-purple-600 mb-3"></i>
                    <h3 class="font-semibold text-gray-800 mb-2">Add Students</h3>
                    <p class="text-sm text-gray-600">Start enrolling dancers</p>
                  </div>
                </template>
              </Card>

              <Card class="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" @click="navigateTo('/classes')">
                <template #content>
                  <div class="text-center">
                    <i class="pi pi-th-large text-4xl text-blue-600 mb-3"></i>
                    <h3 class="font-semibold text-gray-800 mb-2">Create Classes</h3>
                    <p class="text-sm text-gray-600">Set up your class offerings</p>
                  </div>
                </template>
              </Card>

              <Card class="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" @click="navigateTo('/schedules')">
                <template #content>
                  <div class="text-center">
                    <i class="pi pi-calendar text-4xl text-green-600 mb-3"></i>
                    <h3 class="font-semibold text-gray-800 mb-2">Build Schedule</h3>
                    <p class="text-sm text-gray-600">Create your class schedule</p>
                  </div>
                </template>
              </Card>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-between">
          <Button
            v-if="currentStep > 0 && currentStep < steps.length - 1"
            label="Back"
            icon="pi pi-arrow-left"
            outlined
            @click="previousStep"
          />
          <div v-else></div>

          <div class="flex gap-2">
            <Button
              v-if="currentStep > 0 && currentStep < steps.length - 1"
              label="Skip"
              text
              @click="skipStep"
            />
            <Button
              v-if="currentStep < steps.length - 1"
              :label="currentStep === 0 ? 'Get Started' : 'Continue'"
              icon="pi pi-arrow-right"
              iconPos="right"
              @click="nextStep"
              :loading="saving"
            />
            <Button
              v-else
              label="Go to Dashboard"
              icon="pi pi-home"
              @click="completeSetu"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

definePageMeta({
  middleware: 'admin',
  layout: false,
})

const router = useRouter()
const toast = useToast()

const currentStep = ref(0)
const saving = ref(false)

const steps = ['Welcome', 'Studio Profile', 'Locations & Rooms', 'Dance Styles', 'Class Levels', 'Complete']

const progress = computed(() => {
  return ((currentStep.value + 1) / steps.length) * 100
})

// Studio Profile
const studioProfile = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  website: '',
})

// Locations & Rooms
const locations = ref([
  {
    name: '',
    address: '',
    rooms: [{ name: '', capacity: 20 }],
  },
])

function addLocation() {
  locations.value.push({
    name: '',
    address: '',
    rooms: [{ name: '', capacity: 20 }],
  })
}

function removeLocation(idx: number) {
  locations.value.splice(idx, 1)
}

function addRoom(locationIdx: number) {
  locations.value[locationIdx].rooms.push({ name: '', capacity: 20 })
}

function removeRoom(locationIdx: number, roomIdx: number) {
  locations.value[locationIdx].rooms.splice(roomIdx, 1)
}

// Dance Styles
const commonDanceStyles = [
  { name: 'Ballet', color: '#FFB6C1' },
  { name: 'Jazz', color: '#87CEEB' },
  { name: 'Tap', color: '#DDA0DD' },
  { name: 'Hip Hop', color: '#FFD700' },
  { name: 'Contemporary', color: '#98D8C8' },
  { name: 'Lyrical', color: '#F7CAC9' },
  { name: 'Modern', color: '#B2B2B2' },
  { name: 'Acro', color: '#FFCC99' },
  { name: 'Musical Theater', color: '#FF6B6B' },
]

const selectedStyles = ref<any[]>([])
const customStyle = ref({ name: '', color: '#6B46C1' })

function isStyleSelected(name: string) {
  return selectedStyles.value.some((s) => s.name === name)
}

function toggleStyle(style: any) {
  const idx = selectedStyles.value.findIndex((s) => s.name === style.name)
  if (idx >= 0) {
    selectedStyles.value.splice(idx, 1)
  } else {
    selectedStyles.value.push(style)
  }
}

function addCustomStyle() {
  if (customStyle.value.name) {
    selectedStyles.value.push({ ...customStyle.value })
    customStyle.value = { name: '', color: '#6B46C1' }
  }
}

// Class Levels
const commonClassLevels = [
  { name: 'Beginner', description: 'No prior experience', sort_order: 1 },
  { name: 'Intermediate', description: '1-2 years experience', sort_order: 2 },
  { name: 'Advanced', description: '3+ years experience', sort_order: 3 },
  { name: 'Pre-Professional', description: 'Intensive training', sort_order: 4 },
]

const selectedLevels = ref<any[]>([])
const customLevel = ref({ name: '', sort_order: 5 })

function isLevelSelected(name: string) {
  return selectedLevels.value.some((l) => l.name === name)
}

function toggleLevel(level: any) {
  const idx = selectedLevels.value.findIndex((l) => l.name === level.name)
  if (idx >= 0) {
    selectedLevels.value.splice(idx, 1)
  } else {
    selectedLevels.value.push(level)
  }
}

function addCustomLevel() {
  if (customLevel.value.name) {
    selectedLevels.value.push({ ...customLevel.value, description: '' })
    customLevel.value = { name: '', sort_order: selectedLevels.value.length + 1 }
  }
}

// Navigation
async function nextStep() {
  if (currentStep.value === 1) {
    // Validate and save studio profile
    if (!studioProfile.value.name || !studioProfile.value.email || !studioProfile.value.phone) {
      toast.add({ severity: 'warn', summary: 'Required Fields', detail: 'Please fill in all required fields', life: 3000 })
      return
    }
    await saveStudioProfile()
  } else if (currentStep.value === 2) {
    // Save locations and rooms
    await saveLocationsAndRooms()
  } else if (currentStep.value === 3) {
    // Save dance styles
    await saveDanceStyles()
  } else if (currentStep.value === 4) {
    // Save class levels
    await saveClassLevels()
  }

  currentStep.value++
}

function previousStep() {
  currentStep.value--
}

function skipStep() {
  currentStep.value++
}

async function saveStudioProfile() {
  saving.value = true
  try {
    await $fetch('/api/studio/profile', {
      method: 'POST',
      body: studioProfile.value,
    })
  } catch (error) {
    console.error('Error saving studio profile:', error)
  } finally {
    saving.value = false
  }
}

async function saveLocationsAndRooms() {
  saving.value = true
  try {
    for (const location of locations.value) {
      if (location.name) {
        const { data: createdLocation } = await useFetch('/api/studio/locations', {
          method: 'POST',
          body: { name: location.name, address: location.address },
        })

        if (createdLocation.value && location.rooms.length > 0) {
          for (const room of location.rooms) {
            if (room.name) {
              await $fetch('/api/studio/rooms', {
                method: 'POST',
                body: {
                  location_id: (createdLocation.value as any).id,
                  name: room.name,
                  capacity: room.capacity,
                },
              })
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error saving locations:', error)
  } finally {
    saving.value = false
  }
}

async function saveDanceStyles() {
  saving.value = true
  try {
    for (const style of selectedStyles.value) {
      await $fetch('/api/classes/styles', {
        method: 'POST',
        body: style,
      })
    }
  } catch (error) {
    console.error('Error saving dance styles:', error)
  } finally {
    saving.value = false
  }
}

async function saveClassLevels() {
  saving.value = true
  try {
    for (const level of selectedLevels.value) {
      await $fetch('/api/classes/levels', {
        method: 'POST',
        body: level,
      })
    }
  } catch (error) {
    console.error('Error saving class levels:', error)
  } finally {
    saving.value = false
  }
}

function completeSetup() {
  // Mark onboarding as incomplete to show checklist
  localStorage.removeItem('onboarding_completed')

  // Redirect to admin dashboard
  router.push('/admin/dashboard')
}
</script>
