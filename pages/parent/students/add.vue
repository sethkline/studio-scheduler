<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Page Header -->
    <div class="flex items-center space-x-3">
      <Button
        icon="pi pi-arrow-left"
        outlined
        @click="navigateTo('/parent/students')"
      />
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Add New Dancer</h1>
        <p class="text-gray-600 mt-1">Fill in your dancer's information below</p>
      </div>
    </div>

    <!-- Main Card -->
    <div class="card">
      <!-- Photo Upload Section -->
      <div class="mb-6 pb-6 border-b">
        <StudentPhotoUploader
          v-model="photoFile"
          @photo-uploaded="handlePhotoUploaded"
        />
      </div>

      <!-- Student Form -->
      <AddStudentForm
        v-model="studentData"
        @save="handleSave"
        @cancel="handleCancel"
      />
    </div>

    <!-- Saving Indicator -->
    <div v-if="saving" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
        <i class="pi pi-spin pi-spinner text-5xl text-primary-500"></i>
        <p class="text-lg font-medium">Adding dancer...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useParentStudentService } from '~/composables/useParentStudentService'
import type { AddStudentForm as StudentFormData } from '~/types/parents'

definePageMeta({
  middleware: 'parent',
})

const toast = useToast()
const { createStudent, uploadStudentPhoto } = useParentStudentService()

// State
const saving = ref(false)
const photoFile = ref<File | null>(null)
const studentData = ref<StudentFormData | null>(null)

// Handle photo upload
function handlePhotoUploaded(file: File) {
  photoFile.value = file
}

// Handle form save
async function handleSave(formData: StudentFormData) {
  saving.value = true

  try {
    // Create student record
    const { data, error } = await createStudent(formData)

    if (error.value) {
      throw new Error(error.value.message || 'Failed to create student')
    }

    const createdStudent = data.value?.student
    if (!createdStudent) {
      throw new Error('Student was created but no data returned')
    }

    // Upload photo if one was selected
    if (photoFile.value && createdStudent.id) {
      const { error: photoError } = await uploadStudentPhoto(createdStudent.id, photoFile.value)

      if (photoError.value) {
        console.error('Error uploading photo:', photoError.value)
        // Don't fail the whole operation if photo upload fails
        toast.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Dancer added but photo upload failed. You can upload it later.',
          life: 5000,
        })
      }
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `${formData.first_name} has been added successfully!`,
      life: 3000,
    })

    // Navigate to student details or back to list
    navigateTo(`/parent/students/${createdStudent.id}`)
  } catch (error: any) {
    console.error('Error creating student:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to add dancer. Please try again.',
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

// Handle form cancel
function handleCancel() {
  navigateTo('/parent/students')
}
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow p-6;
}
</style>
