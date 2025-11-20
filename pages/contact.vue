<template>
  <div>
    <!-- Hero Section -->
    <section class="bg-gradient-to-r from-primary to-secondary text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">Get in Touch</h1>
        <p class="text-xl max-w-2xl mx-auto">
          Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>
      </div>
    </section>

    <div class="container mx-auto px-4 py-16">
      <div class="grid lg:grid-cols-2 gap-12">
        <!-- Contact Form -->
        <div>
          <h2 class="text-3xl font-bold text-gray-900 mb-6">Send Us a Message</h2>

          <form @submit.prevent="handleSubmit" class="space-y-6">
            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                <input v-model="form.firstName" type="text" required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                <input v-model="form.lastName" type="text" required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input v-model="form.email" type="email" required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input v-model="form.phone" type="tel"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Inquiry Type *</label>
              <select v-model="form.inquiryType" required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="">Select a topic...</option>
                <option value="enrollment">Class Enrollment</option>
                <option value="trial">Trial Class</option>
                <option value="schedule">Schedule Information</option>
                <option value="pricing">Pricing & Tuition</option>
                <option value="recitals">Recitals & Events</option>
                <option value="general">General Question</option>
                <option value="feedback">Feedback</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Message *</label>
              <textarea v-model="form.message" rows="6" required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none" />
            </div>

            <button type="submit" :disabled="isSubmitting"
              class="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50">
              {{ isSubmitting ? 'Sending...' : 'Send Message' }}
            </button>
          </form>
        </div>

        <!-- Contact Information -->
        <div>
          <h2 class="text-3xl font-bold text-gray-900 mb-6">Contact Information</h2>

          <div class="space-y-8">
            <!-- Primary Contact -->
            <div class="bg-gray-50 rounded-xl p-6">
              <h3 class="font-bold text-xl text-gray-900 mb-4">{{ studio?.name }}</h3>

              <div class="space-y-4">
                <div v-if="studio?.phone" class="flex gap-4">
                  <div class="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <i class="pi pi-phone text-primary text-xl" />
                  </div>
                  <div>
                    <div class="text-sm text-gray-600 mb-1">Phone</div>
                    <a :href="`tel:${studio.phone}`" class="text-gray-900 font-medium hover:text-primary">
                      {{ studio.phone }}
                    </a>
                  </div>
                </div>

                <div v-if="studio?.email" class="flex gap-4">
                  <div class="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <i class="pi pi-envelope text-primary text-xl" />
                  </div>
                  <div>
                    <div class="text-sm text-gray-600 mb-1">Email</div>
                    <a :href="`mailto:${studio.email}`" class="text-gray-900 font-medium hover:text-primary">
                      {{ studio.email }}
                    </a>
                  </div>
                </div>

                <div v-if="studio?.address" class="flex gap-4">
                  <div class="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <i class="pi pi-map-marker text-primary text-xl" />
                  </div>
                  <div>
                    <div class="text-sm text-gray-600 mb-1">Address</div>
                    <div class="text-gray-900 font-medium">
                      {{ studio.address }}<br />
                      {{ studio.city }}, {{ studio.state }} {{ studio.postal_code }}
                    </div>
                    <a :href="googleMapsLink" target="_blank" rel="noopener"
                      class="text-primary text-sm hover:underline mt-2 inline-block">
                      Get Directions <i class="pi pi-external-link ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- Operating Hours -->
            <div v-if="operatingHours.length > 0" class="bg-gray-50 rounded-xl p-6">
              <h3 class="font-bold text-xl text-gray-900 mb-4">Operating Hours</h3>
              <div class="space-y-2">
                <div v-for="hours in operatingHours" :key="hours.day" class="flex justify-between">
                  <span class="text-gray-600">{{ hours.day }}</span>
                  <span class="font-medium text-gray-900">{{ hours.hours }}</span>
                </div>
              </div>
            </div>

            <!-- Additional Locations -->
            <div v-if="locations.length > 0">
              <h3 class="font-bold text-xl text-gray-900 mb-4">Our Locations</h3>
              <div class="space-y-4">
                <div v-for="location in locations" :key="location.id" class="bg-gray-50 rounded-xl p-6">
                  <h4 class="font-bold text-gray-900 mb-2">{{ location.name }}</h4>
                  <p class="text-gray-600 text-sm mb-2">
                    {{ location.address }}<br />
                    {{ location.city }}, {{ location.state }} {{ location.postal_code }}
                  </p>
                  <a :href="getGoogleMapsLink(location)" target="_blank" rel="noopener"
                    class="text-primary text-sm hover:underline">
                    Get Directions <i class="pi pi-external-link ml-1" />
                  </a>
                </div>
              </div>
            </div>

            <!-- Social Media -->
            <div v-if="studio?.social_media" class="bg-gray-50 rounded-xl p-6">
              <h3 class="font-bold text-xl text-gray-900 mb-4">Follow Us</h3>
              <div class="flex gap-4">
                <a v-for="(url, platform) in studio.social_media" :key="platform"
                  :href="url" target="_blank" rel="noopener"
                  class="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                  <i :class="`pi pi-${platform}`" class="text-xl" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Map Section -->
      <div v-if="studio?.address" class="mt-16">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 text-center">Find Us</h2>
        <div class="rounded-xl overflow-hidden shadow-lg">
          <iframe
            :src="embedMapUrl"
            width="100%"
            height="450"
            style="border:0;"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="mt-16">
        <h2 class="text-3xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
        <div class="max-w-3xl mx-auto space-y-4">
          <div v-for="(faq, index) in faqs" :key="index" class="bg-white border border-gray-200 rounded-lg">
            <button @click="toggleFaq(index)"
              class="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
              <span class="font-semibold text-gray-900">{{ faq.question }}</span>
              <i :class="openFaqs.includes(index) ? 'pi-chevron-up' : 'pi-chevron-down'" class="pi text-primary" />
            </button>
            <Transition name="expand">
              <div v-if="openFaqs.includes(index)" class="px-6 pb-4 text-gray-600">
                {{ faq.answer }}
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StudioLocation } from '~/types/studio'

definePageMeta({
  layout: 'public',
})

const studioStore = useStudioStore()
const toast = useToast()
const { applyTheme } = useTheme()

const studio = computed(() => studioStore.profile)
const locations = ref<StudioLocation[]>([])

// Load data
onMounted(async () => {
  await studioStore.loadProfile()
  await loadLocations()
  applyTheme()
})

const loadLocations = async () => {
  const { data } = await useFetch('/api/studio/locations')
  if (data.value) {
    locations.value = data.value
  }
}

// Form state
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  inquiryType: '',
  message: '',
})

const isSubmitting = ref(false)

const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: form.value,
    })

    toast.add({
      severity: 'success',
      summary: 'Message Sent!',
      detail: 'Thank you for contacting us. We\'ll get back to you soon.',
      life: 5000,
    })

    // Reset form
    form.value = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      inquiryType: '',
      message: '',
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to send message. Please try again or contact us directly.',
      life: 5000,
    })
  } finally {
    isSubmitting.value = false
  }
}

// Operating hours (example - could be fetched from API)
const operatingHours = computed(() => [
  { day: 'Monday', hours: '3:00 PM - 9:00 PM' },
  { day: 'Tuesday', hours: '3:00 PM - 9:00 PM' },
  { day: 'Wednesday', hours: '3:00 PM - 9:00 PM' },
  { day: 'Thursday', hours: '3:00 PM - 9:00 PM' },
  { day: 'Friday', hours: '3:00 PM - 8:00 PM' },
  { day: 'Saturday', hours: '9:00 AM - 2:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
])

// Google Maps
const googleMapsLink = computed(() => {
  if (!studio.value?.address) return ''
  const address = `${studio.value.address}, ${studio.value.city}, ${studio.value.state} ${studio.value.postal_code}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
})

const embedMapUrl = computed(() => {
  if (!studio.value?.address) return ''
  const address = `${studio.value.address}, ${studio.value.city}, ${studio.value.state} ${studio.value.postal_code}`
  return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(address)}`
})

const getGoogleMapsLink = (location: StudioLocation) => {
  const address = `${location.address}, ${location.city}, ${location.state} ${location.postal_code}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// FAQ
const openFaqs = ref<number[]>([])
const toggleFaq = (index: number) => {
  if (openFaqs.value.includes(index)) {
    openFaqs.value = openFaqs.value.filter(i => i !== index)
  } else {
    openFaqs.value.push(index)
  }
}

const faqs = [
  {
    question: 'Do you offer trial classes?',
    answer: 'Yes! We offer a free trial class for new students. This gives you a chance to experience our teaching style and meet our instructors before committing to enrollment.',
  },
  {
    question: 'What should students wear to class?',
    answer: 'Students should wear comfortable, fitted clothing that allows for easy movement. Specific dress code requirements vary by class type. We\'ll provide detailed information upon enrollment.',
  },
  {
    question: 'What is your cancellation policy?',
    answer: 'We require 24 hours notice for class cancellations. Please refer to our enrollment agreement for complete details on our cancellation and refund policies.',
  },
  {
    question: 'Do you have parking available?',
    answer: 'Yes, we have free parking available for all students and families. Additional street parking is also available nearby.',
  },
  {
    question: 'How do I register for classes?',
    answer: 'You can register online through our website, call us during business hours, or visit the studio in person. We\'re happy to help you find the perfect class!',
  },
]
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 200px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
