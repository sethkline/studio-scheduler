<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Studio Profile Setup</h1>
    
    <div v-if="loading" class="flex justify-center my-8">
      <i class="pi pi-spin pi-spinner text-2xl"></i>
    </div>
    
    <div v-else class="card">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Studio Name -->
          <div class="col-span-2">
            <label for="studioName" class="label">Studio Name*</label>
            <InputText
              id="studioName"
              v-model="form.name"
              class="w-full"
              :class="{ 'p-invalid': validationErrors.name }"
              required
            />
            <small v-if="validationErrors.name" class="p-error">{{ validationErrors.name }}</small>
          </div>
          
          <!-- Description -->
          <div class="col-span-2">
            <label for="description" class="label">Description</label>
            <Textarea
              id="description"
              v-model="form.description"
              rows="3"
              class="w-full"
            />
          </div>
          
          <!-- Contact Information -->
          <div>
            <label for="email" class="label">Email</label>
            <InputText
              id="email"
              v-model="form.email"
              type="email"
              class="w-full"
              :class="{ 'p-invalid': validationErrors.email }"
            />
            <small v-if="validationErrors.email" class="p-error">{{ validationErrors.email }}</small>
          </div>
          
          <div>
            <label for="phone" class="label">Phone</label>
            <InputText
              id="phone"
              v-model="form.phone"
              class="w-full"
            />
          </div>
          
          <div>
            <label for="website" class="label">Website</label>
            <InputText
              id="website"
              v-model="form.website"
              class="w-full"
            />
          </div>
          
          <div>
            <label for="taxId" class="label">Tax ID</label>
            <InputText
              id="taxId"
              v-model="form.tax_id"
              class="w-full"
            />
          </div>
          
          <!-- Address Information -->
          <div class="col-span-2">
            <h3 class="text-lg font-semibold mb-2">Main Address</h3>
          </div>
          
          <div class="col-span-2">
            <label for="address" class="label">Street Address</label>
            <InputText
              id="address"
              v-model="form.address"
              class="w-full"
            />
          </div>
          
          <div>
            <label for="city" class="label">City</label>
            <InputText
              id="city"
              v-model="form.city"
              class="w-full"
            />
          </div>
          
          <div>
            <label for="state" class="label">State</label>
            <InputText
              id="state"
              v-model="form.state"
              class="w-full"
            />
          </div>
          
          <div>
            <label for="postalCode" class="label">Postal Code</label>
            <InputText
              id="postalCode"
              v-model="form.postal_code"
              class="w-full"
            />
          </div>
          
          <div>
            <label for="country" class="label">Country</label>
            <InputText
              id="country"
              v-model="form.country"
              class="w-full"
            />
          </div>
          
          <!-- Logo Upload (placeholder for now) -->
          <div class="col-span-2">
            <label class="label">Studio Logo</label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p class="text-gray-500">Logo upload feature coming soon</p>
            </div>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3 pt-4">
          <Button
            label="Reset"
            type="button"
            class="p-button-outlined"
            @click="resetForm"
            :disabled="saving"
          />
          <Button
            label="Save Profile"
            type="submit"
            :loading="saving"
          />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useStudioStore } from '~/stores/studio'
import { useToast } from 'primevue/usetoast'

// Component setup
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

// Store and services
const studioStore = useStudioStore()
const toast = useToast()

// State
const loading = ref(true)
const saving = ref(false)
const validationErrors = ref({})

// Form state
const form = reactive({
  name: '',
  description: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'USA',
  tax_id: '',
  logo_url: ''
})

// Load data
onMounted(async () => {
  try {
    loading.value = true
    const profile = await studioStore.fetchStudioProfile()
    
    if (profile) {
      // Populate form with existing data
      Object.keys(form).forEach(key => {
        if (profile[key] !== undefined) {
          form[key] = profile[key]
        }
      })
    }
  } catch (error) {
    console.error('Error loading studio profile:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load studio profile.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
})

// Form validation
const validateForm = () => {
  const errors = {}
  
  if (!form.name.trim()) {
    errors.name = 'Studio name is required'
  }
  
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address'
  }
  
  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

// Form submission
const handleSubmit = async () => {
  if (!validateForm()) return
  
  try {
    saving.value = true
    
    const result = await studioStore.updateStudioProfile(form)
    
    if (result) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Studio profile has been saved.',
        life: 3000
      })
    } else {
      throw new Error('Failed to save profile')
    }
  } catch (error) {
    console.error('Error saving studio profile:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save profile.',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

// Reset form
const resetForm = () => {
  const profile = studioStore.profile
  
  if (profile) {
    Object.keys(form).forEach(key => {
      if (profile[key] !== undefined) {
        form[key] = profile[key]
      } else {
        // Reset to defaults
        if (key === 'country') {
          form[key] = 'USA'
        } else {
          form[key] = ''
        }
      }
    })
  } else {
    // Reset all fields to empty
    Object.keys(form).forEach(key => {
      if (key === 'country') {
        form[key] = 'USA'
      } else {
        form[key] = ''
      }
    })
  }
  
  validationErrors.value = {}
}
</script>