<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">My Dancers</h1>
        <p class="text-gray-600 mt-1">Manage your children's profiles and information</p>
      </div>
      <Button
        label="Add Dancer"
        icon="pi pi-plus"
        @click="navigateTo('/parent/students/add')"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-5xl text-primary-500"></i>
      <p class="text-gray-600 mt-4">Loading dancers...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!students || students.length === 0"
      class="card text-center py-12 bg-gray-50"
    >
      <i class="pi pi-users text-6xl text-gray-400 mb-4"></i>
      <h2 class="text-xl font-semibold text-gray-700 mb-2">No Dancers Yet</h2>
      <p class="text-gray-600 mb-6">
        Add your first dancer to get started with class enrollment and schedule management
      </p>
      <Button
        label="Add Your First Dancer"
        icon="pi pi-plus"
        size="large"
        @click="navigateTo('/parent/students/add')"
      />
    </div>

    <!-- Students Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="student in students"
        :key="student.id"
        class="card hover:shadow-lg transition-shadow duration-200 cursor-pointer"
        @click="viewStudent(student.id)"
      >
        <!-- Student Header with Photo -->
        <div class="flex items-start space-x-4 mb-4">
          <Avatar
            :image="student.photo_url"
            :label="getInitials(student.first_name, student.last_name)"
            size="xlarge"
            shape="circle"
            class="bg-primary-100 text-primary-700 flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <h3 class="text-xl font-bold text-gray-900 truncate">
              {{ student.first_name }} {{ student.last_name }}
            </h3>
            <p class="text-sm text-gray-600">Age {{ calculateAge(student.date_of_birth) }}</p>
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1"
              :class="getStatusClass(student.status)"
            >
              {{ student.status === 'active' ? 'Active' : student.status === 'inactive' ? 'Inactive' : 'On Hold' }}
            </span>
          </div>
        </div>

        <Divider />

        <!-- Student Info -->
        <div class="space-y-3">
          <!-- Emergency Contact -->
          <div class="flex items-start text-sm">
            <i class="pi pi-phone text-gray-400 mr-2 mt-1"></i>
            <div class="flex-1">
              <p class="font-medium text-gray-700">Emergency Contact</p>
              <p class="text-gray-600">{{ student.emergency_contact_name }}</p>
              <p class="text-gray-500 text-xs">{{ student.emergency_contact_phone }}</p>
            </div>
          </div>

          <!-- Medical Info Alert -->
          <div
            v-if="hasMedicalInfo(student)"
            class="flex items-center text-sm bg-yellow-50 border border-yellow-200 rounded p-2"
          >
            <i class="pi pi-exclamation-triangle text-yellow-600 mr-2"></i>
            <span class="text-yellow-800 font-medium">Has medical information on file</span>
          </div>

          <!-- Allergies Alert -->
          <div
            v-if="student.allergies"
            class="flex items-center text-sm bg-red-50 border border-red-200 rounded p-2"
          >
            <i class="pi pi-exclamation-circle text-red-600 mr-2"></i>
            <span class="text-red-800 font-medium">Allergies: {{ student.allergies }}</span>
          </div>
        </div>

        <Divider />

        <!-- Actions -->
        <div class="flex items-center justify-between">
          <Button
            label="View Details"
            icon="pi pi-eye"
            size="small"
            outlined
            @click.stop="viewStudent(student.id)"
          />
          <Button
            label="Edit"
            icon="pi pi-pencil"
            size="small"
            outlined
            @click.stop="editStudent(student.id)"
          />
        </div>
      </div>
    </div>

    <!-- Confirm Archive Dialog -->
    <Dialog
      v-model:visible="showArchiveDialog"
      modal
      :header="`Archive ${selectedStudent?.first_name} ${selectedStudent?.last_name}?`"
      :style="{ width: '450px' }"
    >
      <p class="mb-4">
        Are you sure you want to archive this dancer? They will be marked as inactive but their information
        will be preserved.
      </p>
      <template #footer>
        <Button label="Cancel" outlined @click="showArchiveDialog = false" />
        <Button
          label="Archive"
          severity="danger"
          @click="confirmArchive"
          :loading="archiving"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useParentStudentService } from '~/composables/useParentStudentService'
import type { StudentProfile } from '~/types/parents'

definePageMeta({
  middleware: 'parent',
})

const toast = useToast()
const { fetchStudents, archiveStudent } = useParentStudentService()

// State
const loading = ref(true)
const students = ref<StudentProfile[]>([])
const showArchiveDialog = ref(false)
const selectedStudent = ref<StudentProfile | null>(null)
const archiving = ref(false)

// Load students on mount
onMounted(async () => {
  await loadStudents()
})

async function loadStudents() {
  loading.value = true
  try {
    const { data, error } = await fetchStudents()

    if (error.value) {
      throw new Error(error.value.message || 'Failed to load students')
    }

    students.value = data.value || []
  } catch (error: any) {
    console.error('Error loading students:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load dancers',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function viewStudent(studentId: string) {
  navigateTo(`/parent/students/${studentId}`)
}

function editStudent(studentId: string) {
  navigateTo(`/parent/students/${studentId}/edit`)
}

function promptArchive(student: StudentProfile) {
  selectedStudent.value = student
  showArchiveDialog.value = true
}

async function confirmArchive() {
  if (!selectedStudent.value) return

  archiving.value = true
  try {
    const { error } = await archiveStudent(selectedStudent.value.id)

    if (error.value) {
      throw new Error(error.value.message || 'Failed to archive student')
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Dancer archived successfully',
      life: 3000,
    })

    // Reload students
    await loadStudents()
    showArchiveDialog.value = false
    selectedStudent.value = null
  } catch (error: any) {
    console.error('Error archiving student:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to archive dancer',
      life: 3000,
    })
  } finally {
    archiving.value = false
  }
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

function hasMedicalInfo(student: StudentProfile): boolean {
  return !!(
    student.medical_conditions ||
    student.medications ||
    student.doctor_name
  )
}
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow p-6;
}
</style>
