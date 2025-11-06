<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-5xl text-primary-500"></i>
      <p class="text-gray-600 mt-4">Loading dancer information...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card bg-red-50 border border-red-200">
      <div class="flex items-start space-x-3">
        <i class="pi pi-exclamation-circle text-red-600 text-2xl"></i>
        <div>
          <h3 class="text-lg font-semibold text-red-900">Error Loading Dancer</h3>
          <p class="text-red-700">{{ error }}</p>
          <Button
            label="Go Back"
            icon="pi pi-arrow-left"
            class="mt-4"
            outlined
            @click="navigateTo('/parent/students')"
          />
        </div>
      </div>
    </div>

    <!-- Student Details -->
    <template v-else-if="student">
      <!-- Header with Actions -->
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-4">
          <Button
            icon="pi pi-arrow-left"
            outlined
            @click="navigateTo('/parent/students')"
          />
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              {{ student.first_name }} {{ student.last_name }}
            </h1>
            <p class="text-gray-600 mt-1">
              Age {{ calculateAge(student.date_of_birth) }} • Born {{ formatDate(student.date_of_birth) }}
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <Button
            v-if="!editMode"
            label="Edit Profile"
            icon="pi pi-pencil"
            @click="enterEditMode"
          />
          <Button
            v-if="editMode"
            label="Cancel"
            icon="pi pi-times"
            outlined
            @click="cancelEdit"
          />
          <Button
            v-if="editMode"
            label="Save Changes"
            icon="pi pi-check"
            @click="saveChanges"
            :loading="saving"
          />
        </div>
      </div>

      <!-- View Mode -->
      <div v-if="!editMode" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Photo & Status -->
        <div class="space-y-6">
          <!-- Photo Card -->
          <div class="card text-center">
            <Avatar
              :image="student.photo_url"
              :label="getInitials(student.first_name, student.last_name)"
              size="xlarge"
              shape="circle"
              class="mx-auto bg-primary-100 text-primary-700"
              :style="{ width: '150px', height: '150px', fontSize: '3rem' }"
            />
            <h3 class="text-xl font-bold mt-4">{{ student.first_name }} {{ student.last_name }}</h3>
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2"
              :class="getStatusClass(student.status)"
            >
              {{ formatStatus(student.status) }}
            </span>
            <Button
              label="Update Photo"
              icon="pi pi-camera"
              class="w-full mt-4"
              outlined
              @click="showPhotoUploadDialog = true"
            />
          </div>

          <!-- Quick Info Card -->
          <div class="card">
            <h3 class="font-semibold text-lg mb-4">Quick Info</h3>
            <div class="space-y-3 text-sm">
              <div v-if="student.gender">
                <p class="text-gray-600">Gender</p>
                <p class="font-medium">{{ formatGender(student.gender) }}</p>
              </div>
              <div v-if="student.email">
                <p class="text-gray-600">Email</p>
                <p class="font-medium">{{ student.email }}</p>
              </div>
              <div v-if="student.phone">
                <p class="text-gray-600">Phone</p>
                <p class="font-medium">{{ student.phone }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Detailed Information -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Emergency Contact Card -->
          <div class="card">
            <div class="flex items-center space-x-2 mb-4">
              <i class="pi pi-phone text-primary-500 text-xl"></i>
              <h3 class="font-semibold text-lg">Emergency Contact</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">Contact Name</p>
                <p class="font-medium">{{ student.emergency_contact_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Contact Phone</p>
                <p class="font-medium">{{ student.emergency_contact_phone }}</p>
              </div>
              <div v-if="student.emergency_contact_relationship">
                <p class="text-sm text-gray-600">Relationship</p>
                <p class="font-medium">{{ student.emergency_contact_relationship }}</p>
              </div>
            </div>
          </div>

          <!-- Medical Information Card -->
          <div class="card" :class="{ 'border-2 border-yellow-300': hasMedicalInfo(student) }">
            <div class="flex items-center space-x-2 mb-4">
              <i class="pi pi-heart text-red-500 text-xl"></i>
              <h3 class="font-semibold text-lg">Medical Information</h3>
              <Badge v-if="hasMedicalInfo(student)" severity="warning" value="Important" />
            </div>

            <div v-if="hasMedicalInfo(student)" class="space-y-4">
              <div v-if="student.allergies" class="bg-red-50 border border-red-200 rounded p-3">
                <p class="text-sm font-semibold text-red-900 mb-1">Allergies</p>
                <p class="text-red-800">{{ student.allergies }}</p>
              </div>

              <div v-if="student.medical_conditions">
                <p class="text-sm text-gray-600 font-semibold">Medical Conditions</p>
                <p class="text-gray-900">{{ student.medical_conditions }}</p>
              </div>

              <div v-if="student.medications">
                <p class="text-sm text-gray-600 font-semibold">Current Medications</p>
                <p class="text-gray-900">{{ student.medications }}</p>
              </div>

              <div v-if="student.doctor_name || student.doctor_phone" class="grid grid-cols-2 gap-4">
                <div v-if="student.doctor_name">
                  <p class="text-sm text-gray-600">Doctor Name</p>
                  <p class="font-medium">{{ student.doctor_name }}</p>
                </div>
                <div v-if="student.doctor_phone">
                  <p class="text-sm text-gray-600">Doctor Phone</p>
                  <p class="font-medium">{{ student.doctor_phone }}</p>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-4 text-gray-500">
              <p>No medical information on file</p>
            </div>
          </div>

          <!-- Costume Sizing Card -->
          <div class="card">
            <div class="flex items-center space-x-2 mb-4">
              <i class="pi pi-shopping-bag text-purple-500 text-xl"></i>
              <h3 class="font-semibold text-lg">Costume Sizing</h3>
            </div>

            <div v-if="hasCostumeInfo(student)" class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div v-if="student.costume_size_top">
                <p class="text-sm text-gray-600">Top Size</p>
                <p class="font-medium">{{ student.costume_size_top }}</p>
              </div>
              <div v-if="student.costume_size_bottom">
                <p class="text-sm text-gray-600">Bottom Size</p>
                <p class="font-medium">{{ student.costume_size_bottom }}</p>
              </div>
              <div v-if="student.shoe_size">
                <p class="text-sm text-gray-600">Shoe Size</p>
                <p class="font-medium">{{ student.shoe_size }}</p>
              </div>
              <div v-if="student.height_inches">
                <p class="text-sm text-gray-600">Height</p>
                <p class="font-medium">{{ student.height_inches }}"</p>
              </div>
            </div>

            <div v-else class="text-center py-4 text-gray-500">
              <p>No costume sizing on file</p>
            </div>
          </div>

          <!-- Additional Notes Card -->
          <div v-if="student.notes" class="card">
            <div class="flex items-center space-x-2 mb-4">
              <i class="pi pi-file-edit text-gray-500 text-xl"></i>
              <h3 class="font-semibold text-lg">Additional Notes</h3>
            </div>
            <p class="text-gray-700 whitespace-pre-wrap">{{ student.notes }}</p>
          </div>
        </div>
      </div>

      <!-- Edit Mode -->
      <div v-else class="card">
        <StudentPhotoUploader
          :student-id="student.id"
          :photo-url="student.photo_url"
          class="mb-6 pb-6 border-b"
          @photo-uploaded="handlePhotoUpdated"
        />

        <AddStudentForm
          v-model="editFormData"
          @save="saveChanges"
          @cancel="cancelEdit"
        />
      </div>
    </template>

    <!-- Photo Upload Dialog -->
    <Dialog
      v-model:visible="showPhotoUploadDialog"
      modal
      header="Update Student Photo"
      :style="{ width: '450px' }"
    >
      <StudentPhotoUploader
        v-if="student"
        :student-id="student.id"
        :photo-url="student.photo_url"
        @photo-uploaded="handlePhotoUpdated"
        @photo-removed="handlePhotoRemoved"
      />
      <template #footer>
        <Button label="Close" @click="showPhotoUploadDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useParentStudentService } from '~/composables/useParentStudentService'
import type { StudentWithGuardians, AddStudentForm as StudentFormData } from '~/types/parents'

definePageMeta({
  middleware: 'parent',
})

const route = useRoute()
const toast = useToast()
const { fetchStudent, updateStudent } = useParentStudentService()

// State
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const student = ref<StudentWithGuardians | null>(null)
const editMode = ref(false)
const editFormData = ref<StudentFormData | null>(null)
const showPhotoUploadDialog = ref(false)

const studentId = computed(() => route.params.id as string)

// Load student on mount
onMounted(async () => {
  await loadStudent()
})

async function loadStudent() {
  loading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await fetchStudent(studentId.value)

    if (fetchError.value) {
      throw new Error(fetchError.value.message || 'Failed to load student')
    }

    student.value = data.value || null
  } catch (err: any) {
    console.error('Error loading student:', err)
    error.value = err.message || 'Failed to load dancer information'
  } finally {
    loading.value = false
  }
}

function enterEditMode() {
  if (!student.value) return

  // Convert student data to form data format
  editFormData.value = {
    first_name: student.value.first_name,
    last_name: student.value.last_name,
    date_of_birth: student.value.date_of_birth,
    gender: student.value.gender,
    photo_url: student.value.photo_url,
    email: student.value.email,
    phone: student.value.phone,
    allergies: student.value.allergies,
    medical_conditions: student.value.medical_conditions,
    medications: student.value.medications,
    doctor_name: student.value.doctor_name,
    doctor_phone: student.value.doctor_phone,
    emergency_contact_name: student.value.emergency_contact_name,
    emergency_contact_phone: student.value.emergency_contact_phone,
    emergency_contact_relationship: student.value.emergency_contact_relationship,
    costume_size_top: student.value.costume_size_top,
    costume_size_bottom: student.value.costume_size_bottom,
    shoe_size: student.value.shoe_size,
    height_inches: student.value.height_inches,
    notes: student.value.notes,
    // Relationship fields - get from first guardian relationship
    relationship: student.value.guardians?.[0]?.relationship?.relationship || 'parent',
    relationship_custom: student.value.guardians?.[0]?.relationship?.relationship_custom,
    primary_contact: student.value.guardians?.[0]?.relationship?.primary_contact || false,
    authorized_pickup: student.value.guardians?.[0]?.relationship?.authorized_pickup || false,
    financial_responsibility: student.value.guardians?.[0]?.relationship?.financial_responsibility || false,
    can_authorize_medical: student.value.guardians?.[0]?.relationship?.can_authorize_medical || false,
  }

  editMode.value = true
}

function cancelEdit() {
  editMode.value = false
  editFormData.value = null
}

async function saveChanges(formData?: StudentFormData) {
  const dataToSave = formData || editFormData.value
  if (!dataToSave) return

  saving.value = true

  try {
    const { error: updateError } = await updateStudent(studentId.value, dataToSave)

    if (updateError.value) {
      throw new Error(updateError.value.message || 'Failed to update student')
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Dancer information updated successfully',
      life: 3000,
    })

    // Reload student data
    await loadStudent()
    editMode.value = false
    editFormData.value = null
  } catch (err: any) {
    console.error('Error updating student:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to update dancer information',
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

function handlePhotoUpdated() {
  showPhotoUploadDialog.value = false
  loadStudent() // Reload to get updated photo URL
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Photo updated successfully',
    life: 3000,
  })
}

function handlePhotoRemoved() {
  showPhotoUploadDialog.value = false
  loadStudent() // Reload to reflect removed photo
}

// Helper functions
function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase()
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'inactive':
      return 'Inactive'
    case 'on_hold':
      return 'On Hold'
    default:
      return status
  }
}

function formatGender(gender: string): string {
  switch (gender) {
    case 'male':
      return 'Male'
    case 'female':
      return 'Female'
    case 'non-binary':
      return 'Non-binary'
    case 'prefer-not-to-say':
      return 'Prefer not to say'
    default:
      return gender
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-800'
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function hasMedicalInfo(student: StudentWithGuardians): boolean {
  return !!(student.allergies || student.medical_conditions || student.medications || student.doctor_name)
}

function hasCostumeInfo(student: StudentWithGuardians): boolean {
  return !!(
    student.costume_size_top ||
    student.costume_size_bottom ||
    student.shoe_size ||
    student.height_inches
  )
}
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow p-6;
}
</style>
