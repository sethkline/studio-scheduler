<template>
  <footer class="bg-gray-900 text-gray-300">
    <!-- Main Footer -->
    <div class="container mx-auto px-4 py-12">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <!-- Studio Info -->
        <div>
          <h3 class="text-white text-lg font-bold mb-4">{{ studio?.name }}</h3>
          <p v-if="studio?.description" class="text-sm mb-4">{{ studio.description }}</p>
          <div class="flex gap-4 mt-4">
            <a v-for="(url, platform) in studio?.social_media" :key="platform"
              :href="url" target="_blank" rel="noopener"
              class="w-10 h-10 rounded-full bg-gray-800 hover:bg-primary flex items-center justify-center transition-colors">
              <i :class="`pi pi-${platform}`" />
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div>
          <h3 class="text-white text-lg font-bold mb-4">Quick Links</h3>
          <ul class="space-y-2">
            <li v-for="item in quickLinks" :key="item.to">
              <NuxtLink :to="item.to" class="hover:text-primary transition-colors">
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Contact Info -->
        <div>
          <h3 class="text-white text-lg font-bold mb-4">Contact Us</h3>
          <ul class="space-y-3 text-sm">
            <li v-if="studio?.address" class="flex gap-3">
              <i class="pi pi-map-marker text-primary" />
              <div>
                <div>{{ studio.address }}</div>
                <div>{{ studio.city }}, {{ studio.state }} {{ studio.postal_code }}</div>
              </div>
            </li>
            <li v-if="studio?.phone" class="flex gap-3">
              <i class="pi pi-phone text-primary" />
              <a :href="`tel:${studio.phone}`" class="hover:text-primary">{{ studio.phone }}</a>
            </li>
            <li v-if="studio?.email" class="flex gap-3">
              <i class="pi pi-envelope text-primary" />
              <a :href="`mailto:${studio.email}`" class="hover:text-primary">{{ studio.email }}</a>
            </li>
          </ul>
        </div>

        <!-- Newsletter Signup -->
        <div>
          <h3 class="text-white text-lg font-bold mb-4">Stay Connected</h3>
          <p class="text-sm mb-4">Subscribe to our newsletter for updates on classes, events, and performances.</p>
          <form @submit.prevent="handleNewsletterSignup" class="flex flex-col gap-2">
            <input v-model="email" type="email" placeholder="Your email" required
              class="px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:border-primary focus:outline-none" />
            <button type="submit" :disabled="isSubmitting"
              class="btn-primary px-4 py-2 rounded font-semibold disabled:opacity-50">
              {{ isSubmitting ? 'Subscribing...' : 'Subscribe' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div class="border-t border-gray-800">
      <div class="container mx-auto px-4 py-6">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <div>
            &copy; {{ new Date().getFullYear() }} {{ studio?.name }}. All rights reserved.
          </div>
          <div class="flex gap-6">
            <NuxtLink to="/privacy" class="hover:text-primary transition-colors">Privacy Policy</NuxtLink>
            <NuxtLink to="/terms" class="hover:text-primary transition-colors">Terms of Service</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const studioStore = useStudioStore()
const toast = useToast()

const studio = computed(() => studioStore.profile)
const email = ref('')
const isSubmitting = ref(false)

const quickLinks = [
  { label: 'Classes & Programs', to: '/classes' },
  { label: 'Our Teachers', to: '/teachers' },
  { label: 'Class Schedule', to: '/schedule' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Recitals & Events', to: '/public/recitals' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'Blog', to: '/blog' },
]

const handleNewsletterSignup = async () => {
  isSubmitting.value = true
  try {
    // TODO: Implement newsletter signup API
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.add({
      severity: 'success',
      summary: 'Subscribed!',
      detail: 'Thank you for subscribing to our newsletter.',
      life: 3000,
    })
    email.value = ''
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to subscribe. Please try again.',
      life: 3000,
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  transition: all 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
</style>
