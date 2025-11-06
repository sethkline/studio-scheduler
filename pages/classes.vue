<template>
  <div>
    <!-- Hero Section -->
    <section class="bg-gradient-to-r from-primary to-secondary text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">Dance Classes & Programs</h1>
        <p class="text-xl max-w-2xl mx-auto">
          Discover the perfect class for your skill level and interests. From ballet to hip-hop, we have something for everyone.
        </p>
      </div>
    </section>

    <div class="container mx-auto px-4 py-12">
      <!-- Filters -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div class="grid md:grid-cols-4 gap-6">
          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div class="relative">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input v-model="filters.search" type="text" placeholder="Search classes..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
          </div>

          <!-- Dance Style Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Dance Style</label>
            <select v-model="filters.danceStyle"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              <option value="">All Styles</option>
              <option v-for="style in danceStyles" :key="style.id" :value="style.id">
                {{ style.name }}
              </option>
            </select>
          </div>

          <!-- Age Group Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Age Group</label>
            <select v-model="filters.ageGroup"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              <option value="">All Ages</option>
              <option value="3-6">Ages 3-6</option>
              <option value="7-12">Ages 7-12</option>
              <option value="13-18">Teen (13-18)</option>
              <option value="18+">Adult (18+)</option>
            </select>
          </div>

          <!-- Level Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
            <select v-model="filters.level"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              <option value="">All Levels</option>
              <option v-for="level in classLevels" :key="level.id" :value="level.id">
                {{ level.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Clear Filters -->
        <div v-if="hasActiveFilters" class="mt-4">
          <button @click="clearFilters" class="text-primary hover:underline text-sm font-medium">
            <i class="pi pi-times-circle mr-1" />
            Clear All Filters
          </button>
        </div>
      </div>

      <!-- Results Count -->
      <div class="mb-6">
        <p class="text-gray-600">
          Showing <span class="font-semibold">{{ filteredClasses.length }}</span> of <span class="font-semibold">{{ classes.length }}</span> classes
        </p>
      </div>

      <!-- Classes Grid -->
      <div v-if="filteredClasses.length > 0" class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="classItem in filteredClasses" :key="classItem.id"
          class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-1">
          <!-- Class Image/Style Badge -->
          <div class="h-48 relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-90" />
            <div class="absolute inset-0 flex items-center justify-center text-white">
              <div class="text-center">
                <div class="text-3xl font-bold mb-2">{{ classItem.dance_style?.name }}</div>
                <div class="text-sm opacity-90">{{ classItem.class_level?.name }}</div>
              </div>
            </div>
            <!-- Available Spots Badge -->
            <div v-if="classItem.max_students" class="absolute top-4 right-4 bg-white text-gray-900 px-3 py-1 rounded-full text-sm font-semibold">
              {{ classItem.max_students }} spots
            </div>
          </div>

          <!-- Class Details -->
          <div class="p-6">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ classItem.name }}</h3>

            <div class="space-y-3 mb-6">
              <div class="flex items-center gap-3 text-gray-600">
                <i class="pi pi-users text-primary" />
                <span>Ages {{ classItem.min_age }}-{{ classItem.max_age }}</span>
              </div>

              <div class="flex items-center gap-3 text-gray-600">
                <i class="pi pi-clock text-primary" />
                <span>{{ classItem.duration }} minutes</span>
              </div>

              <div v-if="classItem.dance_style" class="flex items-center gap-3 text-gray-600">
                <i class="pi pi-tag text-primary" />
                <span :style="{ color: classItem.dance_style.color || '#8b5cf6' }">
                  {{ classItem.dance_style.name }}
                </span>
              </div>
            </div>

            <p class="text-gray-600 mb-6 line-clamp-3">
              {{ classItem.description || 'A comprehensive dance class designed to develop technique, creativity, and confidence.' }}
            </p>

            <div class="flex gap-3">
              <button @click="enrollInClass(classItem)"
                class="flex-1 bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all">
                Enroll Now
              </button>
              <button @click="viewClassDetails(classItem)"
                class="px-4 py-3 border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all">
                <i class="pi pi-info-circle" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div v-else class="text-center py-16">
        <i class="pi pi-search text-6xl text-gray-300 mb-4" />
        <h3 class="text-2xl font-bold text-gray-900 mb-2">No Classes Found</h3>
        <p class="text-gray-600 mb-6">Try adjusting your filters to see more classes.</p>
        <button @click="clearFilters" class="text-primary font-semibold hover:underline">
          Clear Filters
        </button>
      </div>

      <!-- Program Information -->
      <div class="mt-16 bg-gray-50 rounded-xl p-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 text-center">What to Expect</h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-check-circle text-primary text-3xl" />
            </div>
            <h3 class="font-bold text-xl text-gray-900 mb-2">Qualified Instructors</h3>
            <p class="text-gray-600">
              All our teachers are professionally trained with years of performance and teaching experience.
            </p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-star text-primary text-3xl" />
            </div>
            <h3 class="font-bold text-xl text-gray-900 mb-2">Performance Opportunities</h3>
            <p class="text-gray-600">
              Students have the chance to showcase their skills in our annual recitals and special events.
            </p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-heart text-primary text-3xl" />
            </div>
            <h3 class="font-bold text-xl text-gray-900 mb-2">Supportive Environment</h3>
            <p class="text-gray-600">
              We foster a positive, inclusive atmosphere where every student can thrive and grow.
            </p>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="mt-12 bg-gradient-to-r from-primary to-secondary text-white rounded-xl p-12 text-center">
        <h2 class="text-3xl font-bold mb-4">Not Sure Which Class is Right for You?</h2>
        <p class="text-lg mb-8 max-w-2xl mx-auto">
          Book a free trial class or contact us for a personalized consultation. We're here to help you find the perfect fit!
        </p>
        <div class="flex flex-wrap gap-4 justify-center">
          <NuxtLink to="/register/trial"
            class="px-8 py-4 bg-white text-primary font-bold rounded-full hover:shadow-2xl transition-all">
            Book Free Trial
          </NuxtLink>
          <NuxtLink to="/contact"
            class="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white hover:text-primary transition-all">
            Contact Us
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Class Details Dialog -->
    <Dialog v-model:visible="showDetailsDialog" modal :style="{ width: '50rem' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
      <template #header>
        <h3 class="text-2xl font-bold">{{ selectedClass?.name }}</h3>
      </template>

      <div v-if="selectedClass" class="space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-600 mb-1">Dance Style</div>
            <div class="font-semibold">{{ selectedClass.dance_style?.name }}</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-600 mb-1">Skill Level</div>
            <div class="font-semibold">{{ selectedClass.class_level?.name }}</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-600 mb-1">Age Range</div>
            <div class="font-semibold">{{ selectedClass.min_age }}-{{ selectedClass.max_age }} years</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-600 mb-1">Duration</div>
            <div class="font-semibold">{{ selectedClass.duration }} minutes</div>
          </div>
        </div>

        <div>
          <h4 class="font-bold text-gray-900 mb-2">Class Description</h4>
          <p class="text-gray-600">
            {{ selectedClass.description || 'A comprehensive dance class designed to develop technique, creativity, and confidence.' }}
          </p>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="font-bold text-blue-900 mb-2">What to Bring</h4>
          <ul class="list-disc list-inside text-blue-800 space-y-1">
            <li>Comfortable dance attire</li>
            <li>Appropriate dance shoes</li>
            <li>Water bottle</li>
            <li>Positive attitude!</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button label="Close" severity="secondary" @click="showDetailsDialog = false" />
          <Button label="Enroll Now" @click="enrollInClass(selectedClass)" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import type { ClassDefinition } from '~/types'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

definePageMeta({
  layout: 'public',
})

const { applyTheme } = useTheme()
const router = useRouter()
const toast = useToast()

// Load theme
onMounted(() => {
  applyTheme()
})

// Fetch data
const { data: classesData } = await useFetch('/api/classes/list')
const { data: stylesData } = await useFetch('/api/classes/dance-styles')
const { data: levelsData } = await useFetch('/api/classes/levels')

const classes = ref<ClassDefinition[]>(classesData.value || [])
const danceStyles = ref(stylesData.value || [])
const classLevels = ref(levelsData.value || [])

// Filters
const filters = ref({
  search: '',
  danceStyle: '',
  ageGroup: '',
  level: '',
})

const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.danceStyle || filters.value.ageGroup || filters.value.level
})

const clearFilters = () => {
  filters.value = {
    search: '',
    danceStyle: '',
    ageGroup: '',
    level: '',
  }
}

// Filtered classes
const filteredClasses = computed(() => {
  let result = [...classes.value]

  // Search filter
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.description?.toLowerCase().includes(search) ||
      c.dance_style?.name.toLowerCase().includes(search)
    )
  }

  // Dance style filter
  if (filters.value.danceStyle) {
    result = result.filter(c => c.dance_style_id === filters.value.danceStyle)
  }

  // Age group filter
  if (filters.value.ageGroup) {
    const [minAge, maxAge] = filters.value.ageGroup.split('-').map(a => a.replace('+', ''))
    result = result.filter(c => {
      if (maxAge === '') {
        return c.min_age >= parseInt(minAge)
      }
      return c.min_age >= parseInt(minAge) && c.max_age <= parseInt(maxAge)
    })
  }

  // Level filter
  if (filters.value.level) {
    result = result.filter(c => c.class_level_id === filters.value.level)
  }

  return result
})

// Class details dialog
const showDetailsDialog = ref(false)
const selectedClass = ref<ClassDefinition | null>(null)

const viewClassDetails = (classItem: ClassDefinition) => {
  selectedClass.value = classItem
  showDetailsDialog.value = true
}

const enrollInClass = (classItem: ClassDefinition | null) => {
  if (!classItem) return
  showDetailsDialog.value = false
  router.push(`/register/enroll?classId=${classItem.id}`)
}
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
