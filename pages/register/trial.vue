<template>
  <div>
    <!-- Hero Section -->
    <section class="bg-gradient-to-r from-primary to-secondary text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">Book Your Free Trial Class</h1>
        <p class="text-xl max-w-2xl mx-auto">
          Experience the joy of dance with a complimentary trial class. No commitment required!
        </p>
      </div>
    </section>

    <div class="container mx-auto px-4 py-12">
      <div class="max-w-4xl mx-auto">
        <!-- Progress Steps -->
        <div class="mb-12">
          <div class="flex items-center justify-between">
            <div v-for="(step, index) in steps" :key="index" class="flex-1 flex items-center">
              <div class="flex flex-col items-center flex-1">
                <div :class="[
                  'w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all',
                  currentStep >= index + 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                ]">
                  {{ index + 1 }}
                </div>
                <div :class="[
                  'text-sm mt-2 font-medium',
                  currentStep >= index + 1 ? 'text-primary' : 'text-gray-500'
                ]">
                  {{ step }}
                </div>
              </div>
              <div v-if="index < steps.length - 1" :class="[
                'h-1 flex-1',
                currentStep > index + 1 ? 'bg-primary' : 'bg-gray-200'
              ]" />
            </div>
          </div>
        </div>

        <!-- Form -->
        <div class="bg-white rounded-xl shadow-lg p-8">
          <form @submit.prevent="handleSubmit">
            <!-- Step 1: Student Information -->
            <div v-show="currentStep === 1" class="space-y-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Student Information</h2>

              <div class="grid md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Student First Name *</label>
                  <input v-model="form.studentFirstName" type="text" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Student Last Name *</label>
                  <input v-model="form.studentLastName" type="text" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
              </div>

              <div class="grid md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                  <input v-model="form.dateOfBirth" type="date" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select v-model="form.gender"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Previous Dance Experience</label>
                <select v-model="form.experience"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="none">No experience</option>
                  <option value="beginner">Beginner (less than 1 year)</option>
                  <option value="intermediate">Intermediate (1-3 years)</option>
                  <option value="advanced">Advanced (3+ years)</option>
                </select>
              </div>
            </div>

            <!-- Step 2: Parent/Guardian Information -->
            <div v-show="currentStep === 2" class="space-y-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Parent/Guardian Information</h2>

              <div class="grid md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input v-model="form.parentFirstName" type="text" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input v-model="form.parentLastName" type="text" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
              </div>

              <div class="grid md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input v-model="form.email" type="email" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input v-model="form.phone" type="tel" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <input v-model="form.address" type="text" required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>

              <div class="grid md:grid-cols-3 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input v-model="form.city" type="text" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">State *</label>
                  <input v-model="form.state" type="text" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Zip Code *</label>
                  <input v-model="form.zipCode" type="text" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
              </div>
            </div>

            <!-- Step 3: Class Selection -->
            <div v-show="currentStep === 3" class="space-y-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Select Trial Class</h2>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Class Interest *</label>
                <select v-model="form.classId" required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="">Select a class...</option>
                  <option v-for="classItem in availableClasses" :key="classItem.id" :value="classItem.id">
                    {{ classItem.name }} - {{ classItem.dance_style?.name }} (Ages {{ classItem.min_age }}-{{ classItem.max_age }})
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Preferred Trial Date *</label>
                <input v-model="form.preferredDate" type="date" required :min="minDate"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">How did you hear about us?</label>
                <select v-model="form.referralSource"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="">Select one...</option>
                  <option value="google">Google Search</option>
                  <option value="social">Social Media</option>
                  <option value="friend">Friend/Family Referral</option>
                  <option value="event">Local Event</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Additional Comments</label>
                <textarea v-model="form.comments" rows="4"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none" />
              </div>
            </div>

            <!-- Step 4: Agreement -->
            <div v-show="currentStep === 4" class="space-y-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Terms & Agreement</h2>

              <div class="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                <h3 class="font-bold mb-4">Trial Class Agreement</h3>
                <div class="space-y-3 text-sm text-gray-600">
                  <p>By booking a trial class, you agree to the following terms:</p>
                  <ul class="list-disc list-inside space-y-2 ml-4">
                    <li>Trial classes are complimentary and for first-time students only</li>
                    <li>Students must arrive 10 minutes early to complete any necessary paperwork</li>
                    <li>Appropriate dance attire and footwear are required</li>
                    <li>Parents/guardians must remain on premises during the trial class</li>
                    <li>No refunds are available after class commencement</li>
                    <li>The studio reserves the right to cancel or reschedule classes</li>
                    <li>Photography and video recording may occur during classes for promotional purposes</li>
                  </ul>
                </div>
              </div>

              <div class="space-y-4">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input v-model="form.agreeTerms" type="checkbox" required
                    class="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary" />
                  <span class="text-sm text-gray-700">
                    I have read and agree to the trial class terms and conditions *
                  </span>
                </label>

                <label class="flex items-start gap-3 cursor-pointer">
                  <input v-model="form.agreeWaiver" type="checkbox" required
                    class="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary" />
                  <span class="text-sm text-gray-700">
                    I understand and accept the liability waiver for dance activities *
                  </span>
                </label>

                <label class="flex items-start gap-3 cursor-pointer">
                  <input v-model="form.agreeMarketing" type="checkbox"
                    class="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary" />
                  <span class="text-sm text-gray-700">
                    I would like to receive updates and promotional emails about classes and events
                  </span>
                </label>
              </div>
            </div>

            <!-- Navigation Buttons -->
            <div class="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button v-if="currentStep > 1" type="button" @click="currentStep--"
                class="px-6 py-3 border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all">
                <i class="pi pi-arrow-left mr-2" />
                Previous
              </button>
              <div v-else />

              <button v-if="currentStep < 4" type="button" @click="nextStep"
                class="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:shadow-lg transition-all">
                Next
                <i class="pi pi-arrow-right ml-2" />
              </button>

              <button v-else type="submit" :disabled="!canSubmit || isSubmitting"
                class="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50">
                {{ isSubmitting ? 'Submitting...' : 'Book Trial Class' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Benefits Section -->
        <div class="mt-12 bg-blue-50 rounded-xl p-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">What to Expect at Your Trial</h2>
          <div class="grid md:grid-cols-3 gap-6">
            <div class="text-center">
              <i class="pi pi-users text-primary text-4xl mb-3" />
              <h3 class="font-bold mb-2">Meet the Teacher</h3>
              <p class="text-sm text-gray-600">Get to know our experienced instructor and their teaching style</p>
            </div>
            <div class="text-center">
              <i class="pi pi-heart text-primary text-4xl mb-3" />
              <h3 class="font-bold mb-2">Feel Welcome</h3>
              <p class="text-sm text-gray-600">Experience our supportive and friendly studio environment</p>
            </div>
            <div class="text-center">
              <i class="pi pi-star text-primary text-4xl mb-3" />
              <h3 class="font-bold mb-2">Try Before You Commit</h3>
              <p class="text-sm text-gray-600">See if the class is the right fit before enrolling</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ClassDefinition } from '~/types'

definePageMeta({
  layout: 'public',
})

const { applyTheme } = useTheme()
const toast = useToast()
const router = useRouter()

onMounted(() => {
  applyTheme()
})

// Fetch available classes
const { data: classesData } = await useFetch('/api/classes/list')
const availableClasses = ref<ClassDefinition[]>(classesData.value || [])

// Form steps
const steps = ['Student Info', 'Parent Info', 'Class Selection', 'Agreement']
const currentStep = ref(1)

// Form data
const form = ref({
  studentFirstName: '',
  studentLastName: '',
  dateOfBirth: '',
  gender: '',
  experience: 'none',
  parentFirstName: '',
  parentLastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  classId: '',
  preferredDate: '',
  referralSource: '',
  comments: '',
  agreeTerms: false,
  agreeWaiver: false,
  agreeMarketing: false,
})

const isSubmitting = ref(false)

// Minimum date for trial (tomorrow)
const minDate = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
})

const canSubmit = computed(() => {
  return form.value.agreeTerms && form.value.agreeWaiver
})

const nextStep = () => {
  if (currentStep.value < 4) {
    currentStep.value++
  }
}

const handleSubmit = async () => {
  if (!canSubmit.value) return

  isSubmitting.value = true
  try {
    // TODO: Implement trial class booking API
    const response = await $fetch('/api/register/trial', {
      method: 'POST',
      body: form.value,
    })

    toast.add({
      severity: 'success',
      summary: 'Trial Class Booked!',
      detail: 'We\'ve sent a confirmation email with details. See you soon!',
      life: 5000,
    })

    // Redirect to confirmation page
    router.push('/register/confirmation')
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to book trial class. Please try again or contact us.',
      life: 5000,
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>
