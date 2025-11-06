<template>
  <header class="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
    <!-- Top Bar -->
    <div class="bg-gradient-to-r from-primary to-secondary text-white">
      <div class="container mx-auto px-4 py-2">
        <div class="flex justify-between items-center text-sm">
          <div class="flex items-center gap-6">
            <a v-if="studio?.phone" :href="`tel:${studio.phone}`" class="flex items-center gap-2 hover:opacity-80">
              <i class="pi pi-phone" />
              <span>{{ studio.phone }}</span>
            </a>
            <a v-if="studio?.email" :href="`mailto:${studio.email}`" class="flex items-center gap-2 hover:opacity-80">
              <i class="pi pi-envelope" />
              <span>{{ studio.email }}</span>
            </a>
          </div>
          <div class="flex items-center gap-4">
            <a v-for="(url, platform) in studio?.social_media" :key="platform" :href="url" target="_blank" rel="noopener" class="hover:opacity-80">
              <i :class="`pi pi-${platform}`" />
            </a>
            <NuxtLink v-if="user" to="/admin/dashboard" class="hover:opacity-80">
              <i class="pi pi-user mr-1" />
              Dashboard
            </NuxtLink>
            <NuxtLink v-else to="/login" class="hover:opacity-80">
              <i class="pi pi-sign-in mr-1" />
              Login
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Navigation -->
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between py-4">
        <!-- Logo & Name -->
        <NuxtLink to="/" class="flex items-center gap-3">
          <img v-if="studio?.logo_url" :src="studio.logo_url" :alt="studio.name" class="h-12 w-auto" />
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ studio?.name || 'Dance Studio' }}</h1>
            <p v-if="studio?.description" class="text-sm text-gray-600">{{ studio.description }}</p>
          </div>
        </NuxtLink>

        <!-- Desktop Navigation -->
        <nav class="hidden lg:flex items-center gap-8">
          <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to"
            class="text-gray-700 hover:text-primary font-medium transition-colors"
            active-class="text-primary">
            {{ item.label }}
          </NuxtLink>
          <NuxtLink to="/register/enroll"
            class="btn-primary px-6 py-2 rounded-full font-semibold">
            Enroll Now
          </NuxtLink>
        </nav>

        <!-- Mobile Menu Toggle -->
        <button @click="mobileMenuOpen = !mobileMenuOpen" class="lg:hidden p-2">
          <i :class="mobileMenuOpen ? 'pi pi-times' : 'pi pi-bars'" class="text-2xl" />
        </button>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <Transition name="slide-down">
      <nav v-if="mobileMenuOpen" class="lg:hidden border-t border-gray-200 bg-white">
        <div class="container mx-auto px-4 py-4 flex flex-col gap-4">
          <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to"
            @click="mobileMenuOpen = false"
            class="text-gray-700 hover:text-primary font-medium py-2"
            active-class="text-primary">
            {{ item.label }}
          </NuxtLink>
          <NuxtLink to="/register/enroll"
            @click="mobileMenuOpen = false"
            class="btn-primary px-6 py-3 rounded-full font-semibold text-center">
            Enroll Now
          </NuxtLink>
        </div>
      </nav>
    </Transition>
  </header>
</template>

<script setup lang="ts">
const studioStore = useStudioStore()
const user = useSupabaseUser()

const studio = computed(() => studioStore.profile)
const mobileMenuOpen = ref(false)

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Classes', to: '/classes' },
  { label: 'Teachers', to: '/teachers' },
  { label: 'Schedule', to: '/schedule' },
  { label: 'Recitals', to: '/public/recitals' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'Contact', to: '/contact' },
]

// Close mobile menu on route change
watch(() => useRoute().path, () => {
  mobileMenuOpen.value = false
})
</script>

<style scoped>
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
