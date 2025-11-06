<template>
  <div>
    <!-- Hero Section -->
    <section class="relative h-[600px] flex items-center justify-center text-white overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-90" />
      <div v-if="studio?.logo_url" class="absolute inset-0 opacity-20">
        <img :src="studio.logo_url" alt="" class="w-full h-full object-cover" />
      </div>

      <div class="relative container mx-auto px-4 text-center z-10">
        <h1 class="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
          {{ heroTitle }}
        </h1>
        <p class="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
          {{ heroSubtitle }}
        </p>
        <div class="flex flex-wrap gap-4 justify-center">
          <NuxtLink to="/register/trial"
            class="px-8 py-4 bg-white text-primary font-bold rounded-full hover:shadow-2xl transform hover:-translate-y-1 transition-all">
            Book a Trial Class
          </NuxtLink>
          <NuxtLink to="/classes"
            class="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white hover:text-primary transition-all">
            Explore Classes
          </NuxtLink>
        </div>
      </div>

      <!-- Scroll indicator -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <i class="pi pi-chevron-down text-white text-2xl" />
      </div>
    </section>

    <!-- Stats/Highlights Section -->
    <section class="py-16 bg-gray-50">
      <div class="container mx-auto px-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div v-for="stat in stats" :key="stat.label" class="text-center">
            <div class="text-4xl md:text-5xl font-bold text-primary mb-2">{{ stat.value }}</div>
            <div class="text-gray-600 font-medium">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section class="py-20">
      <div class="container mx-auto px-4">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="text-4xl font-bold text-gray-900 mb-6">Welcome to {{ studio?.name }}</h2>
            <p class="text-lg text-gray-600 mb-6 leading-relaxed">
              {{ studio?.description || 'A premier dance studio dedicated to nurturing talent and fostering a love for dance in students of all ages and skill levels.' }}
            </p>
            <div class="space-y-4">
              <div v-for="feature in features" :key="feature.title" class="flex gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <i :class="feature.icon" class="text-primary text-xl" />
                </div>
                <div>
                  <h3 class="font-bold text-gray-900 mb-1">{{ feature.title }}</h3>
                  <p class="text-gray-600">{{ feature.description }}</p>
                </div>
              </div>
            </div>
            <NuxtLink to="/about" class="inline-block mt-8 text-primary font-semibold hover:underline">
              Learn More About Us <i class="pi pi-arrow-right ml-2" />
            </NuxtLink>
          </div>
          <div class="relative">
            <img v-if="studio?.logo_url" :src="studio.logo_url" alt="Studio" class="rounded-2xl shadow-2xl w-full" />
            <div v-else class="bg-gradient-to-br from-primary to-secondary rounded-2xl h-96" />
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Classes Section -->
    <section class="py-20 bg-gray-50">
      <div class="container mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">Popular Classes</h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our most popular dance programs for all ages and skill levels
          </p>
        </div>

        <div v-if="featuredClasses.length > 0" class="grid md:grid-cols-3 gap-8">
          <div v-for="classItem in featuredClasses" :key="classItem.id"
            class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow">
            <div class="h-48 bg-gradient-to-br from-primary to-secondary" />
            <div class="p-6">
              <div class="flex items-center justify-between mb-3">
                <span class="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                  {{ classItem.dance_style?.name }}
                </span>
                <span class="text-gray-500 text-sm">{{ classItem.duration }} min</span>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">{{ classItem.name }}</h3>
              <p class="text-gray-600 mb-4 line-clamp-2">{{ classItem.description }}</p>
              <div class="flex items-center justify-between">
                <div class="text-sm text-gray-500">
                  Ages {{ classItem.min_age }}-{{ classItem.max_age }}
                </div>
                <NuxtLink :to="`/classes?id=${classItem.id}`" class="text-primary font-semibold hover:underline">
                  Learn More <i class="pi pi-arrow-right ml-1" />
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center mt-12">
          <NuxtLink to="/classes" class="inline-block px-8 py-4 bg-primary text-white font-bold rounded-full hover:shadow-lg transition-all">
            View All Classes
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Upcoming Events Section -->
    <section class="py-20">
      <div class="container mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">Upcoming Events</h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Join us for exciting performances, recitals, and special events
          </p>
        </div>

        <div v-if="upcomingShows.length > 0" class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div v-for="show in upcomingShows" :key="show.id"
            class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow">
            <div class="h-48 bg-gradient-to-br from-accent to-secondary" />
            <div class="p-6">
              <div class="flex items-center gap-2 text-primary font-semibold mb-3">
                <i class="pi pi-calendar" />
                <span>{{ formatDate(show.date) }}</span>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">{{ show.name }}</h3>
              <p class="text-gray-600 mb-4 line-clamp-3">{{ show.description }}</p>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">{{ show.location }}</span>
                <NuxtLink :to="`/public/recitals/${show.id}`" class="text-primary font-semibold hover:underline">
                  Details <i class="pi pi-arrow-right ml-1" />
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center text-gray-500 py-12">
          <i class="pi pi-calendar text-6xl mb-4 text-gray-300" />
          <p class="text-lg">No upcoming events at this time. Check back soon!</p>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="py-20 bg-gray-900 text-white">
      <div class="container mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold mb-4">What Families Say</h2>
          <p class="text-lg text-gray-300 max-w-2xl mx-auto">
            Hear from our amazing dance families about their experience
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div v-for="testimonial in testimonials" :key="testimonial.author"
            class="bg-gray-800 rounded-xl p-8 hover:bg-gray-750 transition-colors">
            <div class="flex gap-1 text-accent mb-4">
              <i v-for="star in 5" :key="star" class="pi pi-star-fill" />
            </div>
            <p class="text-gray-300 mb-6 italic">"{{ testimonial.text }}"</p>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center font-bold">
                {{ testimonial.author.charAt(0) }}
              </div>
              <div>
                <div class="font-semibold">{{ testimonial.author }}</div>
                <div class="text-sm text-gray-400">{{ testimonial.role }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-gradient-to-r from-primary to-secondary text-white">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-4xl md:text-5xl font-bold mb-6">Ready to Start Dancing?</h2>
        <p class="text-xl mb-8 max-w-2xl mx-auto">
          Join our dance family today! Book a trial class and experience the joy of dance.
        </p>
        <div class="flex flex-wrap gap-4 justify-center">
          <NuxtLink to="/register/trial"
            class="px-8 py-4 bg-white text-primary font-bold rounded-full hover:shadow-2xl transform hover:-translate-y-1 transition-all">
            Book Free Trial
          </NuxtLink>
          <NuxtLink to="/contact"
            class="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white hover:text-primary transition-all">
            Contact Us
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ClassDefinition } from '~/types'
import type { RecitalShow } from '~/types/recitals'

definePageMeta({
  layout: 'public',
})

const studioStore = useStudioStore()
const { applyTheme } = useTheme()

const studio = computed(() => studioStore.profile)

// Load studio profile and apply theme
onMounted(async () => {
  await studioStore.loadProfile()
  applyTheme()
})

const heroTitle = computed(() => {
  return studio.value?.name ? `Welcome to ${studio.value.name}` : 'Where Passion Meets Performance'
})

const heroSubtitle = computed(() => {
  return studio.value?.description || 'Inspiring dancers of all ages to reach their full potential through exceptional instruction and unforgettable performances.'
})

// Stats
const stats = [
  { value: '15+', label: 'Years of Excellence' },
  { value: '500+', label: 'Happy Students' },
  { value: '20+', label: 'Expert Teachers' },
  { value: '50+', label: 'Classes Offered' },
]

// Features
const features = [
  {
    icon: 'pi pi-users',
    title: 'Expert Instructors',
    description: 'Learn from experienced professionals passionate about dance education',
  },
  {
    icon: 'pi pi-star',
    title: 'All Skill Levels',
    description: 'From beginner to advanced, we have classes for everyone',
  },
  {
    icon: 'pi pi-home',
    title: 'State-of-the-Art Facility',
    description: 'Modern studios with professional floors, mirrors, and sound systems',
  },
  {
    icon: 'pi pi-heart',
    title: 'Supportive Community',
    description: 'Join a welcoming family that celebrates every dancer\'s journey',
  },
]

// Fetch featured classes
const featuredClasses = ref<ClassDefinition[]>([])
const { data: classesData } = await useFetch('/api/classes/list')
if (classesData.value) {
  featuredClasses.value = classesData.value.slice(0, 6)
}

// Fetch upcoming shows
const upcomingShows = ref<RecitalShow[]>([])
const { data: showsData } = await useFetch('/api/public/recital-shows')
if (showsData.value) {
  upcomingShows.value = showsData.value
    .filter((show: RecitalShow) => new Date(show.date) >= new Date())
    .sort((a: RecitalShow, b: RecitalShow) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)
}

// Testimonials
const testimonials = [
  {
    text: 'This studio has been an incredible place for my daughter to grow as a dancer. The teachers are patient, skilled, and truly care about each student.',
    author: 'Sarah M.',
    role: 'Parent',
  },
  {
    text: 'The performance opportunities and recitals have given my son so much confidence. He looks forward to class every week!',
    author: 'Mike T.',
    role: 'Parent',
  },
  {
    text: 'As an adult beginner, I was nervous to start dancing. The welcoming atmosphere and supportive community made all the difference.',
    author: 'Jennifer L.',
    role: 'Adult Student',
  },
]

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 1s ease-out;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
