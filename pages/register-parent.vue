<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-primary-800 mb-2">Welcome to {{ studioName }}</h1>
        <p class="text-lg text-gray-600">Create your parent account to get started</p>
      </div>

      <!-- Progress Steps -->
      <div class="mb-8">
        <Steps :model="steps" :activeStep="currentStep" :readonly="true" />
      </div>

      <!-- Registration Card -->
      <Card class="shadow-lg">
        <!-- Step 1: Account Creation -->
        <template v-if="currentStep === 0">
          <div class="space-y-6">
            <div class="text-center mb-6">
              <i class="pi pi-user-plus text-5xl text-primary-500 mb-3"></i>
              <h2 class="text-2xl font-bold">Create Your Account</h2>
              <p class="text-gray-600">Let's start with your basic information</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="field">
                <label for="firstName" class="font-medium">First Name *</label>
                <InputText
                  id="firstName"
                  v-model="formData.first_name"
                  class="w-full"
                  :class="{ 'p-invalid': errors.first_name }"
                  placeholder="Enter your first name"
                />
                <small v-if="errors.first_name" class="p-error">{{ errors.first_name }}</small>
              </div>

              <div class="field">
                <label for="lastName" class="font-medium">Last Name *</label>
                <InputText
                  id="lastName"
                  v-model="formData.last_name"
                  class="w-full"
                  :class="{ 'p-invalid': errors.last_name }"
                  placeholder="Enter your last name"
                />
                <small v-if="errors.last_name" class="p-error">{{ errors.last_name }}</small>
              </div>
            </div>

            <div class="field">
              <label for="email" class="font-medium">Email Address *</label>
              <InputText
                id="email"
                v-model="formData.email"
                type="email"
                class="w-full"
                :class="{ 'p-invalid': errors.email }"
                placeholder="your.email@example.com"
              />
              <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
            </div>

            <div class="field">
              <label for="phone" class="font-medium">Phone Number *</label>
              <InputText
                id="phone"
                v-model="formData.phone"
                type="tel"
                class="w-full"
                :class="{ 'p-invalid': errors.phone }"
                placeholder="(555) 123-4567"
              />
              <small v-if="errors.phone" class="p-error">{{ errors.phone }}</small>
            </div>

            <div class="field">
              <label for="password" class="font-medium">Password *</label>
              <Password
                id="password"
                v-model="formData.password"
                toggleMask
                class="w-full"
                :class="{ 'p-invalid': errors.password }"
                :feedback="true"
                placeholder="Create a strong password"
              >
                <template #header>
                  <h6>Pick a password</h6>
                </template>
                <template #footer>
                  <Divider />
                  <p class="mt-2">Suggestions</p>
                  <ul class="pl-2 ml-2 mt-0" style="line-height: 1.5">
                    <li>At least 8 characters</li>
                    <li>At least one lowercase letter</li>
                    <li>At least one uppercase letter</li>
                    <li>At least one number</li>
                  </ul>
                </template>
              </Password>
              <small v-if="errors.password" class="p-error">{{ errors.password }}</small>
            </div>

            <div class="field">
              <label for="confirmPassword" class="font-medium">Confirm Password *</label>
              <Password
                id="confirmPassword"
                v-model="formData.confirmPassword"
                :feedback="false"
                toggleMask
                class="w-full"
                :class="{ 'p-invalid': errors.confirmPassword }"
                placeholder="Re-enter your password"
              />
              <small v-if="errors.confirmPassword" class="p-error">{{ errors.confirmPassword }}</small>
            </div>
          </div>
        </template>

        <!-- Step 2: Address Information -->
        <template v-if="currentStep === 1">
          <div class="space-y-6">
            <div class="text-center mb-6">
              <i class="pi pi-map-marker text-5xl text-primary-500 mb-3"></i>
              <h2 class="text-2xl font-bold">Your Address</h2>
              <p class="text-gray-600">This helps us stay in touch and plan events</p>
            </div>

            <div class="field">
              <label for="address" class="font-medium">Street Address</label>
              <InputText
                id="address"
                v-model="formData.address"
                class="w-full"
                placeholder="123 Main St"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="field md:col-span-2">
                <label for="city" class="font-medium">City</label>
                <InputText
                  id="city"
                  v-model="formData.city"
                  class="w-full"
                  placeholder="Your city"
                />
              </div>

              <div class="field">
                <label for="state" class="font-medium">State</label>
                <InputText
                  id="state"
                  v-model="formData.state"
                  class="w-full"
                  placeholder="CA"
                  maxlength="2"
                />
              </div>
            </div>

            <div class="field">
              <label for="zipCode" class="font-medium">ZIP Code</label>
              <InputText
                id="zipCode"
                v-model="formData.zip_code"
                class="w-full"
                placeholder="12345"
                maxlength="10"
              />
            </div>
          </div>
        </template>

        <!-- Step 3: Add Students -->
        <template v-if="currentStep === 2">
          <div class="space-y-6">
            <div class="text-center mb-6">
              <i class="pi pi-users text-5xl text-primary-500 mb-3"></i>
              <h2 class="text-2xl font-bold">Add Your Dancers</h2>
              <p class="text-gray-600">Tell us about the dancers in your family</p>
            </div>

            <div v-if="students.length === 0" class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <i class="pi pi-user-plus text-4xl text-gray-400 mb-3"></i>
              <p class="text-gray-600 mb-4">No dancers added yet</p>
              <Button label="Add Your First Dancer" icon="pi pi-plus" @click="showAddStudentDialog = true" />
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(student, index) in students"
                :key="index"
                class="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
              >
                <div class="flex items-center space-x-4">
                  <Avatar
                    :label="getInitials(student.first_name, student.last_name)"
                    size="large"
                    shape="circle"
                    class="bg-primary-100 text-primary-700"
                  />
                  <div>
                    <h3 class="font-semibold">{{ student.first_name }} {{ student.last_name }}</h3>
                    <p class="text-sm text-gray-600">{{ formatDate(student.date_of_birth) }}</p>
                    <p class="text-xs text-gray-500">{{ calculateAge(student.date_of_birth) }} years old</p>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <Button
                    icon="pi pi-pencil"
                    class="p-button-sm p-button-text"
                    @click="editStudent(index)"
                  />
                  <Button
                    icon="pi pi-trash"
                    class="p-button-sm p-button-text p-button-danger"
                    @click="removeStudent(index)"
                  />
                </div>
              </div>

              <Button
                label="Add Another Dancer"
                icon="pi pi-plus"
                class="p-button-outlined w-full"
                @click="showAddStudentDialog = true"
              />
            </div>
          </div>
        </template>

        <!-- Step 4: Confirmation -->
        <template v-if="currentStep === 3">
          <div class="space-y-6">
            <div class="text-center mb-6">
              <i class="pi pi-check-circle text-5xl text-green-500 mb-3"></i>
              <h2 class="text-2xl font-bold">Review & Confirm</h2>
              <p class="text-gray-600">Please review your information before submitting</p>
            </div>

            <!-- Account Summary -->
            <div class="border rounded-lg p-4 bg-gray-50">
              <h3 class="font-semibold text-lg mb-3">Account Information</h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-gray-600">Name:</span>
                  <p class="font-medium">{{ formData.first_name }} {{ formData.last_name }}</p>
                </div>
                <div>
                  <span class="text-gray-600">Email:</span>
                  <p class="font-medium">{{ formData.email }}</p>
                </div>
                <div>
                  <span class="text-gray-600">Phone:</span>
                  <p class="font-medium">{{ formData.phone }}</p>
                </div>
                <div v-if="formData.city">
                  <span class="text-gray-600">Location:</span>
                  <p class="font-medium">{{ formData.city }}, {{ formData.state }}</p>
                </div>
              </div>
            </div>

            <!-- Students Summary -->
            <div class="border rounded-lg p-4 bg-gray-50">
              <h3 class="font-semibold text-lg mb-3">Dancers ({{ students.length }})</h3>
              <div class="space-y-2">
                <div v-for="(student, index) in students" :key="index" class="flex items-center space-x-3 text-sm">
                  <Avatar
                    :label="getInitials(student.first_name, student.last_name)"
                    size="normal"
                    shape="circle"
                    class="bg-primary-100 text-primary-700"
                  />
                  <div>
                    <p class="font-medium">{{ student.first_name }} {{ student.last_name }}</p>
                    <p class="text-gray-600">Age {{ calculateAge(student.date_of_birth) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Terms and Conditions -->
            <div class="field-checkbox">
              <Checkbox id="acceptTerms" v-model="acceptedTerms" :binary="true" />
              <label for="acceptTerms" class="ml-2">
                I agree to the <a href="#" class="text-primary-600 hover:underline">Terms and Conditions</a> and
                <a href="#" class="text-primary-600 hover:underline">Privacy Policy</a>
              </label>
            </div>
            <small v-if="errors.acceptTerms" class="p-error">{{ errors.acceptTerms }}</small>
          </div>
        </template>

        <!-- Navigation Buttons -->
        <template #footer>
          <div class="flex justify-between">
            <Button
              v-if="currentStep > 0"
              label="Back"
              icon="pi pi-arrow-left"
              class="p-button-text"
              @click="previousStep"
            />
            <div v-else></div>

            <div class="flex space-x-2">
              <Button
                v-if="currentStep < steps.length - 1"
                label="Next"
                icon="pi pi-arrow-right"
                iconPos="right"
                @click="nextStep"
              />
              <Button
                v-else
                label="Create Account"
                icon="pi pi-check"
                :loading="loading"
                :disabled="!acceptedTerms"
                @click="submitRegistration"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- Already have account -->
      <div class="text-center mt-6">
        <p class="text-gray-600">
          Already have an account?
          <NuxtLink to="/login" class="text-primary-600 hover:underline font-medium">Sign In</NuxtLink>
        </p>
      </div>
    </div>

    <!-- Add Student Dialog -->
    <Dialog
      v-model:visible="showAddStudentDialog"
      :header="editingStudentIndex !== null ? 'Edit Dancer' : 'Add Dancer'"
      :modal="true"
      :closable="true"
      class="w-full max-w-2xl"
    >
      <AddStudentForm
        v-model="currentStudent"
        @save="saveStudent"
        @cancel="cancelAddStudent"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import type { AddStudentForm } from '~/types/parents'

definePageMeta({
  layout: 'auth',
})

const router = useRouter()
const toast = useToast()
const client = useSupabaseClient()

// Studio name (from config or API)
const studioName = ref('Dance Studio')

// Form state
const currentStep = ref(0)
const loading = ref(false)
const acceptedTerms = ref(false)

// Form data
const formData = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
})

// Students
const students = ref<AddStudentForm[]>([])
const showAddStudentDialog = ref(false)
const currentStudent = ref<AddStudentForm | null>(null)
const editingStudentIndex = ref<number | null>(null)

// Errors
const errors = ref<Record<string, string>>({})

// Steps configuration
const steps = [
  { label: 'Account' },
  { label: 'Address' },
  { label: 'Dancers' },
  { label: 'Confirm' },
]

// Validation functions
function validateStep(step: number): boolean {
  errors.value = {}

  if (step === 0) {
    if (!formData.value.first_name) errors.value.first_name = 'First name is required'
    if (!formData.value.last_name) errors.value.last_name = 'Last name is required'
    if (!formData.value.email) errors.value.email = 'Email is required'
    if (!formData.value.phone) errors.value.phone = 'Phone number is required'
    if (!formData.value.password) errors.value.password = 'Password is required'
    if (formData.value.password.length < 8) errors.value.password = 'Password must be at least 8 characters'
    if (formData.value.password !== formData.value.confirmPassword) {
      errors.value.confirmPassword = 'Passwords do not match'
    }
  }

  if (step === 3) {
    if (!acceptedTerms.value) {
      errors.value.acceptTerms = 'You must accept the terms and conditions'
    }
  }

  return Object.keys(errors.value).length === 0
}

// Navigation
function nextStep() {
  if (validateStep(currentStep.value)) {
    currentStep.value++
  }
}

function previousStep() {
  currentStep.value--
}

// Student management
function saveStudent(student: AddStudentForm) {
  if (editingStudentIndex.value !== null) {
    students.value[editingStudentIndex.value] = student
    editingStudentIndex.value = null
  } else {
    students.value.push(student)
  }
  showAddStudentDialog.value = false
  currentStudent.value = null
}

function editStudent(index: number) {
  editingStudentIndex.value = index
  currentStudent.value = { ...students.value[index] }
  showAddStudentDialog.value = true
}

function removeStudent(index: number) {
  students.value.splice(index, 1)
}

function cancelAddStudent() {
  showAddStudentDialog.value = false
  currentStudent.value = null
  editingStudentIndex.value = null
}

// Helpers
function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase()
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
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

// Submit registration
async function submitRegistration() {
  if (!validateStep(3)) return

  loading.value = true

  try {
    // 1. Create Supabase auth user
    const { data: authData, error: authError } = await client.auth.signUp({
      email: formData.value.email,
      password: formData.value.password,
    })

    if (authError) throw authError

    if (!authData.user) throw new Error('Failed to create user account')

    // 2. Create profile with parent role
    const { error: profileError } = await client.from('profiles').insert({
      id: authData.user.id,
      first_name: formData.value.first_name,
      last_name: formData.value.last_name,
      email: formData.value.email,
      phone: formData.value.phone,
      user_role: 'parent',
      status: 'active',
    })

    if (profileError) throw profileError

    // 3. Create guardian record
    const { data: guardianData, error: guardianError } = await client
      .from('guardians')
      .insert({
        user_id: authData.user.id,
        first_name: formData.value.first_name,
        last_name: formData.value.last_name,
        email: formData.value.email,
        phone: formData.value.phone,
        address: formData.value.address,
        city: formData.value.city,
        state: formData.value.state,
        zip_code: formData.value.zip_code,
        emergency_contact: true,
        status: 'active',
      })
      .select()
      .single()

    if (guardianError) throw guardianError

    // 4. Create students and relationships
    if (students.value.length > 0) {
      for (const student of students.value) {
        // Create student
        const { data: studentData, error: studentError } = await client
          .from('students')
          .insert({
            first_name: student.first_name,
            last_name: student.last_name,
            date_of_birth: student.date_of_birth,
            gender: student.gender,
            email: student.email,
            phone: student.phone,
            allergies: student.allergies,
            medical_conditions: student.medical_conditions,
            medications: student.medications,
            doctor_name: student.doctor_name,
            doctor_phone: student.doctor_phone,
            emergency_contact_name: student.emergency_contact_name,
            emergency_contact_phone: student.emergency_contact_phone,
            emergency_contact_relationship: student.emergency_contact_relationship,
            costume_size_top: student.costume_size_top,
            costume_size_bottom: student.costume_size_bottom,
            shoe_size: student.shoe_size,
            height_inches: student.height_inches,
            notes: student.notes,
            status: 'active',
          })
          .select()
          .single()

        if (studentError) throw studentError

        // Create guardian-student relationship
        const { error: relationshipError } = await client.from('student_guardian_relationships').insert({
          student_id: studentData.id,
          guardian_id: guardianData.id,
          relationship: student.relationship,
          relationship_custom: student.relationship_custom,
          primary_contact: student.primary_contact,
          authorized_pickup: student.authorized_pickup,
          financial_responsibility: student.financial_responsibility,
          can_authorize_medical: student.can_authorize_medical,
        })

        if (relationshipError) throw relationshipError
      }
    }

    toast.add({
      severity: 'success',
      summary: 'Account Created!',
      detail: 'Welcome to our dance family! Please check your email to verify your account.',
      life: 5000,
    })

    // Redirect to login or dashboard
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (error: any) {
    console.error('Registration error:', error)
    toast.add({
      severity: 'error',
      summary: 'Registration Failed',
      detail: error.message || 'Failed to create your account. Please try again.',
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.field {
  @apply mb-4;
}

.field label {
  @apply block mb-2;
}
</style>
