<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-primary-800">User Management</h1>
      <Button label="Add User" icon="pi pi-plus" v-if="isAdmin" @click="openNewUserDialog" />
    </div>
    
    <div class="card">
      <DataTable 
        :value="users" 
        :loading="loading" 
        paginator 
        :rows="10"
        :rowsPerPageOptions="[5, 10, 20, 50]"
        stripedRows
        responsiveLayout="scroll"
      >
        <Column field="email" header="Email" sortable></Column>
        <Column field="display_name" header="Name" sortable>
          <template #body="slotProps">
            {{ slotProps.data.display_name || 'Not set' }}
          </template>
        </Column>
        <Column field="user_role" header="Role" sortable>
          <template #body="slotProps">
            <Badge 
              :value="formatRole(slotProps.data.user_role)" 
              :severity="getRoleSeverity(slotProps.data.user_role)"
            />
          </template>
        </Column>
        <Column field="created_at" header="Joined" sortable>
          <template #body="slotProps">
            {{ formatDate(slotProps.data.created_at) }}
          </template>
        </Column>
        <Column header="Actions" :exportable="false">
          <template #body="slotProps">
            <div class="flex gap-2">
              <Button 
                icon="pi pi-pencil" 
                class="p-button-sm p-button-secondary" 
                @click="editUser(slotProps.data)" 
                tooltip="Edit User"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
    
    <!-- User Edit Dialog -->
    <Dialog 
      v-model:visible="userDialog.visible" 
      :style="{width: '450px'}" 
      :header="userDialog.isEdit ? 'Edit User' : 'New User'" 
      :modal="true"
      :closable="true"
    >
      <div class="space-y-4">
        <div class="field">
          <label for="email" class="font-medium">Email*</label>
          <InputText 
            id="email" 
            v-model="userDialog.formData.email" 
            required 
            class="w-full"
            :disabled="userDialog.isEdit"
            :class="{'p-invalid': userDialog.submitted && !userDialog.formData.email}"
          />
          <small v-if="userDialog.submitted && !userDialog.formData.email" class="p-error">
            Email is required.
          </small>
        </div>
        
        <div class="field">
          <label for="displayName" class="font-medium">Display Name</label>
          <InputText 
            id="displayName" 
            v-model="userDialog.formData.display_name" 
            class="w-full"
          />
        </div>
        
        <div class="field">
          <label for="role" class="font-medium">Role*</label>
          <Dropdown 
            id="role" 
            v-model="userDialog.formData.user_role" 
            :options="roleOptions" 
            optionLabel="name" 
            optionValue="value" 
            placeholder="Select a role"
            class="w-full"
            :class="{'p-invalid': userDialog.submitted && !userDialog.formData.user_role}"
          />
          <small v-if="userDialog.submitted && !userDialog.formData.user_role" class="p-error">
            Role is required.
          </small>
        </div>
        
        <div v-if="!userDialog.isEdit" class="field">
          <label for="password" class="font-medium">Password*</label>
          <Password 
            id="password" 
            v-model="userDialog.formData.password" 
            toggleMask 
            class="w-full"
            :class="{'p-invalid': userDialog.submitted && !userDialog.formData.password}"
          />
          <small v-if="userDialog.submitted && !userDialog.formData.password" class="p-error">
            Password is required.
          </small>
        </div>
      </div>
      
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="closeUserDialog" />
        <Button label="Save" icon="pi pi-check" class="p-button-primary" @click="saveUser" :loading="saving" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '~/stores/auth'

// State
const loading = ref(true)
const saving = ref(false)
const users = ref<any[]>([])
const authStore = useAuthStore()
const toast = useToast()

// Check admin status
const isAdmin = computed(() => {
  return authStore.isAdmin
})

// Role options
const roleOptions = [
  { name: 'Administrator', value: 'admin' },
  { name: 'Staff', value: 'staff' },
  { name: 'Teacher', value: 'teacher' },
  { name: 'Student', value: 'student' },
  { name: 'Parent', value: 'parent' }
]

// User dialog
const userDialog = reactive({
  visible: false,
  isEdit: false,
  submitted: false,
  formData: {
    id: '',
    email: '',
    display_name: '',
    user_role: '',
    password: ''
  }
})

// Load users on component mount
onMounted(async () => {
  await loadUsers()
})

// Load users from the database
async function loadUsers() {
  loading.value = true
  
  try {
    const client = useSupabaseClient()
    
    // Fetch all users from the profiles table
    // Note: In a real application, you might want to add pagination and filtering
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    users.value = data || []
  } catch (error) {
    console.error('Error loading users:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load users',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// Format role name for display
function formatRole(role: string): string {
  if (!role) return 'No Role'
  
  const option = roleOptions.find(r => r.value === role)
  return option ? option.name : role.charAt(0).toUpperCase() + role.slice(1)
}

// Get appropriate severity for role badge
function getRoleSeverity(role: string): string {
  switch (role) {
    case 'admin':
      return 'danger'
    case 'staff':
      return 'warning'
    case 'teacher':
      return 'info'
    case 'student':
      return 'success'
    default:
      return 'secondary'
  }
}

// Format date for display
function formatDate(dateString: string): string {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

// Open dialog to create a new user
function openNewUserDialog() {
  userDialog.isEdit = false
  userDialog.submitted = false
  userDialog.formData = {
    id: '',
    email: '',
    display_name: '',
    user_role: '',
    password: ''
  }
  
  userDialog.visible = true
}

// Open dialog to edit an existing user
function editUser(user: any) {
  userDialog.isEdit = true
  userDialog.submitted = false
  userDialog.formData = {
    id: user.id,
    email: user.email,
    display_name: user.display_name || '',
    user_role: user.user_role || '',
    password: '' // We don't load existing passwords
  }
  
  userDialog.visible = true
}

// Close the user dialog
function closeUserDialog() {
  userDialog.visible = false
}

// Save user (create or update)
async function saveUser() {
  userDialog.submitted = true
  
  // Validate the form
  if (!userDialog.formData.email || 
      !userDialog.formData.user_role || 
      (!userDialog.isEdit && !userDialog.formData.password)) {
    return
  }
  
  saving.value = true
  
  try {
    const client = useSupabaseClient()
    
    if (userDialog.isEdit) {
      // Update existing user profile
      const { error } = await client
        .from('profiles')
        .update({
          display_name: userDialog.formData.display_name,
          user_role: userDialog.formData.user_role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userDialog.formData.id)
      
      if (error) throw error
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'User updated successfully',
        life: 3000
      })
    } else {
      // Create new user with Supabase Auth
      const { data: authData, error: authError } = await client.auth.signUp({
        email: userDialog.formData.email,
        password: userDialog.formData.password
      })
      
      if (authError) throw authError
      
      if (authData.user) {
        // Create or update the user profile
        const { error: profileError } = await client
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: userDialog.formData.email,
            display_name: userDialog.formData.display_name,
            user_role: userDialog.formData.user_role,
            updated_at: new Date().toISOString()
          })
        
        if (profileError) throw profileError
        
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User created successfully',
          life: 3000
        })
      }
    }
    
    // Close dialog and refresh the list
    userDialog.visible = false
    await loadUsers()
  } catch (error) {
    console.error('Error saving user:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save user',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}
</script>