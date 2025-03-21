<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-primary-800">My Profile</h1>
    
    <div class="card">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Profile Overview -->
        <div class="md:col-span-1">
          <div class="bg-gray-50 p-6 rounded-lg flex flex-col items-center">
            <div class="w-24 h-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-3xl font-bold mb-4">
              {{ profileInitials }}
            </div>
            <h2 class="text-xl font-semibold">{{ profile.display_name || profile.email }}</h2>
            <p class="text-gray-600 mt-1">{{ profile.email }}</p>
            <Badge v-if="profile.user_role" 
                   :value="formatRole(profile.user_role)" 
                   :severity="getRoleBadgeType(profile.user_role)"
                   class="mt-2" />
            
            <div class="mt-6 w-full">
              <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Account Details</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Member Since</span>
                  <span class="text-sm font-medium">{{ formatDate(profile.created_at) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Last Updated</span>
                  <span class="text-sm font-medium">{{ formatDate(profile.updated_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Profile Form -->
        <div class="md:col-span-2">
          <form @submit.prevent="saveProfile" class="space-y-6">
            <div class="card">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
              
              <div class="space-y-4">
                <div class="field">
                  <label for="displayName" class="label">Display Name</label>
                  <InputText id="displayName" v-model="formData.display_name" class="w-full" />
                </div>
                
                <div class="field">
                  <label for="email" class="label">Email Address</label>
                  <InputText id="email" v-model="formData.email" disabled class="w-full" />
                  <small class="text-gray-500">Contact an administrator to change your email address.</small>
                </div>
                
                <div class="field">
                  <label for="role" class="label">Role</label>
                  <InputText id="role" :value="formatRole(formData.user_role)" disabled class="w-full" />
                  <small class="text-gray-500">Your role determines your access permissions in the system.</small>
                </div>
              </div>
            </div>
            
            <div class="card">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
              
              <div class="space-y-4">
                <div class="field">
                  <label for="currentPassword" class="label">Current Password</label>
                  <Password id="currentPassword" v-model="formData.currentPassword" toggleMask class="w-full" feedback={false} />
                </div>
                
                <div class="field">
                  <label for="newPassword" class="label">New Password</label>
                  <Password id="newPassword" v-model="formData.newPassword" toggleMask class="w-full" />
                </div>
                
                <div class="field">
                  <label for="confirmPassword" class="label">Confirm New Password</label>
                  <Password id="confirmPassword" v-model="formData.confirmPassword" toggleMask class="w-full" feedback={false} />
                  <small v-if="passwordMismatch" class="p-error">Passwords do not match.</small>
                </div>
              </div>
            </div>
            
            <div class="flex justify-end space-x-2">
              <Button label="Reset" icon="pi pi-undo" class="p-button-outlined" type="button" @click="resetForm" />
              <Button label="Save Changes" icon="pi pi-check" type="submit" :loading="saving" />
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '~/stores/auth'

// State
const user = useSupabaseUser()
const client = useSupabaseClient()
const toast = useToast()
const authStore = useAuthStore()
const saving = ref(false)
const profile = reactive<any>({
  id: '',
  email: '',
  display_name: '',
  user_role: '',
  created_at: '',
  updated_at: ''
})

// Form data
const formData = reactive({
  display_name: '',
  email: '',
  user_role: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Computed properties
const profileInitials = computed(() => {
  if (profile.display_name) {
    const nameParts = profile.display_name.split(' ')
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
    }
    return profile.display_name[0].toUpperCase()
  }
  return profile.email ? profile.email[0].toUpperCase() : '?'
})

const passwordMismatch = computed(() => {
  return (
    formData.newPassword && 
    formData.confirmPassword && 
    formData.newPassword !== formData.confirmPassword
  )
})

// Load profile data on mount
onMounted(async () => {
  await loadProfile()
})

// Format role name for display
function formatRole(role: string): string {
  if (!role) return 'No Role Assigned'
  
  switch (role) {
    case 'admin':
      return 'Administrator'
    case 'staff':
      return 'Staff Member'
    case 'teacher':
      return 'Teacher'
    case 'student':
      return 'Student'
    case 'parent':
      return 'Parent'
    default:
      return role.charAt(0).toUpperCase() + role.slice(1)
  }
}

// Get badge type based on role
function getRoleBadgeType(role: string): string {
  switch (role) {
    case 'admin':
      return 'danger'
    case 'staff':
      return 'warning'
    case 'teacher':
      return 'info'
    case 'student':
      return 'success'
    case 'parent':
      return 'primary'
    default:
      return 'secondary'
  }
}

// Format date for display
function formatDate(dateString: string): string {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

// Load user profile
async function loadProfile() {
  if (!user.value) return
  
  try {
    // Check if profile already loaded in auth store
    if (authStore.userProfile) {
      Object.assign(profile, authStore.userProfile)
      formData.display_name = profile.display_name || ''
      formData.email = profile.email || ''
      formData.user_role = profile.user_role || ''
      return
    }
    
    // Fetch from database if not in auth store
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()
    
    if (error) throw error
    
    // Update local state
    if (data) {
      Object.assign(profile, data)
      formData.display_name = profile.display_name || ''
      formData.email = profile.email || ''
      formData.user_role = profile.user_role || ''
    }
  } catch (error) {
    console.error('Error loading profile:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load your profile',
      life: 3000
    })
  }
}

// Reset form to original values
function resetForm() {
  formData.display_name = profile.display_name || ''
  formData.currentPassword = ''
  formData.newPassword = ''
  formData.confirmPassword = ''
}

// Save profile changes
async function saveProfile() {
  // Validate form
  if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'New passwords do not match',
      life: 3000
    })
    return
  }
  
  saving.value = true
  let hasChanges = false
  
  try {
    // Only update if there are changes to the display name
    if (formData.display_name !== profile.display_name) {
      hasChanges = true
      
      // Update profile in database
      const { error } = await client
        .from('profiles')
        .update({
          display_name: formData.display_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.value.id)
      
      if (error) throw error
      
      // Update local state
      profile.display_name = formData.display_name
      profile.updated_at = new Date().toISOString()
      
      // Update auth store
      if (authStore.userProfile) {
        authStore.userProfile.display_name = formData.display_name
      }
    }
    
    // Change password if requested
    if (formData.currentPassword && formData.newPassword) {
      hasChanges = true
      
      const { error } = await client.auth.updateUser({
        password: formData.newPassword
      })
      
      if (error) throw error
      
      // Clear password fields after successful update
      formData.currentPassword = ''
      formData.newPassword = ''
      formData.confirmPassword = ''
    }
    
    // Show success message if changes were made
    if (hasChanges) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Profile updated successfully',
        life: 3000
      })
    } else {
      toast.add({
        severity: 'info',
        summary: 'Info',
        detail: 'No changes to save',
        life: 3000
      })
    }
  } catch (error) {
    console.error('Error updating profile:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update profile',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}
</script>