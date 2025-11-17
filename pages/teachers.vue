<template>
  <div>
    <!-- Hero Section -->
    <section class="bg-gradient-to-r from-primary to-secondary text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">Meet Our Faculty</h1>
        <p class="text-xl max-w-2xl mx-auto">
          Our passionate and experienced instructors are dedicated to helping every student reach their full potential.
        </p>
      </div>
    </section>

    <div class="container mx-auto px-4 py-12">
      <!-- Search and Filter -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Search Teachers</label>
            <div class="relative">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input v-model="searchQuery" type="text" placeholder="Search by name or specialty..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Specialty</label>
            <select v-model="specialtyFilter"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              <option value="">All Specialties</option>
              <option v-for="specialty in allSpecialties" :key="specialty" :value="specialty">
                {{ specialty }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Teachers Grid -->
      <div v-if="filteredTeachers.length > 0" class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="teacher in filteredTeachers" :key="teacher.id"
          class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-1">
          <!-- Teacher Photo -->
          <div class="relative h-64 bg-gradient-to-br from-primary to-secondary overflow-hidden">
            <img v-if="teacher.profile_image_url" :src="teacher.profile_image_url" :alt="`${teacher.first_name} ${teacher.last_name}`"
              class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
              {{ teacher.first_name.charAt(0) }}{{ teacher.last_name.charAt(0) }}
            </div>
          </div>

          <!-- Teacher Info -->
          <div class="p-6">
            <h3 class="text-2xl font-bold text-gray-900 mb-1">
              {{ teacher.first_name }} {{ teacher.last_name }}
            </h3>

            <!-- Specialties -->
            <div v-if="teacher.specialties && teacher.specialties.length > 0" class="flex flex-wrap gap-2 mb-4">
              <span v-for="specialty in teacher.specialties.slice(0, 3)" :key="specialty"
                class="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {{ specialty }}
              </span>
              <span v-if="teacher.specialties.length > 3"
                class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                +{{ teacher.specialties.length - 3 }}
              </span>
            </div>

            <!-- Bio Preview -->
            <p class="text-gray-600 mb-4 line-clamp-3">
              {{ teacher.bio || 'An experienced and passionate dance instructor dedicated to helping students grow.' }}
            </p>

            <!-- Contact Info -->
            <div class="space-y-2 mb-4">
              <div v-if="teacher.email" class="flex items-center gap-2 text-sm text-gray-500">
                <i class="pi pi-envelope text-primary" />
                <a :href="`mailto:${teacher.email}`" class="hover:text-primary">{{ teacher.email }}</a>
              </div>
              <div v-if="teacher.phone" class="flex items-center gap-2 text-sm text-gray-500">
                <i class="pi pi-phone text-primary" />
                <a :href="`tel:${teacher.phone}`" class="hover:text-primary">{{ teacher.phone }}</a>
              </div>
            </div>

            <!-- View Profile Button -->
            <button @click="viewTeacherProfile(teacher)"
              class="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all">
              View Full Profile
            </button>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div v-else class="text-center py-16">
        <i class="pi pi-users text-6xl text-gray-300 mb-4" />
        <h3 class="text-2xl font-bold text-gray-900 mb-2">No Teachers Found</h3>
        <p class="text-gray-600 mb-6">Try adjusting your search or filter.</p>
        <button @click="clearFilters" class="text-primary font-semibold hover:underline">
          Clear Filters
        </button>
      </div>

      <!-- Why Learn With Us -->
      <div class="mt-16 bg-gray-50 rounded-xl p-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 text-center">Why Learn With Our Faculty</h2>
        <div class="grid md:grid-cols-4 gap-8">
          <div class="text-center">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-trophy text-primary text-3xl" />
            </div>
            <h3 class="font-bold text-lg text-gray-900 mb-2">Award-Winning</h3>
            <p class="text-gray-600 text-sm">
              Our instructors have won numerous competitions and awards in their dance careers.
            </p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-book text-primary text-3xl" />
            </div>
            <h3 class="font-bold text-lg text-gray-900 mb-2">Certified</h3>
            <p class="text-gray-600 text-sm">
              All teachers hold professional certifications and continue their education regularly.
            </p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-heart text-primary text-3xl" />
            </div>
            <h3 class="font-bold text-lg text-gray-900 mb-2">Passionate</h3>
            <p class="text-gray-600 text-sm">
              Each instructor brings genuine enthusiasm and love for dance to every class.
            </p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-users text-primary text-3xl" />
            </div>
            <h3 class="font-bold text-lg text-gray-900 mb-2">Student-Focused</h3>
            <p class="text-gray-600 text-sm">
              We prioritize individual attention and create supportive learning environments.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Teacher Profile Dialog -->
    <Dialog v-model:visible="showProfileDialog" modal :style="{ width: '50rem' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
      <template #header>
        <div v-if="selectedTeacher" class="flex items-center gap-4">
          <img v-if="selectedTeacher.profile_image_url" :src="selectedTeacher.profile_image_url"
            :alt="`${selectedTeacher.first_name} ${selectedTeacher.last_name}`"
            class="w-16 h-16 rounded-full object-cover" />
          <div v-else class="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold">
            {{ selectedTeacher.first_name.charAt(0) }}{{ selectedTeacher.last_name.charAt(0) }}
          </div>
          <div>
            <h3 class="text-2xl font-bold">{{ selectedTeacher.first_name }} {{ selectedTeacher.last_name }}</h3>
            <p class="text-gray-600">Dance Instructor</p>
          </div>
        </div>
      </template>

      <div v-if="selectedTeacher" class="space-y-6">
        <!-- Specialties -->
        <div v-if="selectedTeacher.specialties && selectedTeacher.specialties.length > 0">
          <h4 class="font-bold text-gray-900 mb-3">Specialties</h4>
          <div class="flex flex-wrap gap-2">
            <span v-for="specialty in selectedTeacher.specialties" :key="specialty"
              class="px-4 py-2 bg-primary/10 text-primary rounded-full font-medium">
              {{ specialty }}
            </span>
          </div>
        </div>

        <!-- Bio -->
        <div>
          <h4 class="font-bold text-gray-900 mb-3">Biography</h4>
          <div class="text-gray-600 whitespace-pre-line">
            {{ selectedTeacher.bio || 'An experienced and passionate dance instructor dedicated to helping students grow and develop their skills.' }}
          </div>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="font-bold text-gray-900 mb-3">Contact Information</h4>
          <div class="space-y-2">
            <div v-if="selectedTeacher.email" class="flex items-center gap-3 text-gray-600">
              <i class="pi pi-envelope text-primary" />
              <a :href="`mailto:${selectedTeacher.email}`" class="hover:text-primary">{{ selectedTeacher.email }}</a>
            </div>
            <div v-if="selectedTeacher.phone" class="flex items-center gap-3 text-gray-600">
              <i class="pi pi-phone text-primary" />
              <a :href="`tel:${selectedTeacher.phone}`" class="hover:text-primary">{{ selectedTeacher.phone }}</a>
            </div>
          </div>
        </div>

        <!-- Teaching Philosophy (if available) -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="font-bold text-blue-900 mb-2">Teaching Philosophy</h4>
          <p class="text-blue-800 italic">
            "Every student has unique potential. My goal is to nurture that potential while fostering a love for dance that lasts a lifetime."
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button label="Close" severity="secondary" @click="showProfileDialog = false" />
          <Button label="View Classes" @click="viewTeacherClasses" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import type { Teacher } from '~/types'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

definePageMeta({
  layout: 'public',
})

const { applyTheme } = useTheme()
const router = useRouter()

// Load theme
onMounted(() => {
  applyTheme()
})

// Fetch teachers
const { data: teachersData } = await useFetch('/api/teachers')
const teachers = ref<Teacher[]>((teachersData.value || []).filter((t: Teacher) => t.status === 'active'))

// Filters
const searchQuery = ref('')
const specialtyFilter = ref('')

// Get all unique specialties
const allSpecialties = computed(() => {
  const specialtiesSet = new Set<string>()
  teachers.value.forEach(teacher => {
    if (teacher.specialties) {
      teacher.specialties.forEach(specialty => specialtiesSet.add(specialty))
    }
  })
  return Array.from(specialtiesSet).sort()
})

// Filtered teachers
const filteredTeachers = computed(() => {
  let result = [...teachers.value]

  // Search filter
  if (searchQuery.value) {
    const search = searchQuery.value.toLowerCase()
    result = result.filter(t =>
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(search) ||
      t.bio?.toLowerCase().includes(search) ||
      t.specialties?.some(s => s.toLowerCase().includes(search))
    )
  }

  // Specialty filter
  if (specialtyFilter.value) {
    result = result.filter(t =>
      t.specialties?.includes(specialtyFilter.value)
    )
  }

  return result
})

const clearFilters = () => {
  searchQuery.value = ''
  specialtyFilter.value = ''
}

// Teacher profile dialog
const showProfileDialog = ref(false)
const selectedTeacher = ref<Teacher | null>(null)

const viewTeacherProfile = (teacher: Teacher) => {
  selectedTeacher.value = teacher
  showProfileDialog.value = true
}

const viewTeacherClasses = () => {
  if (selectedTeacher.value) {
    showProfileDialog.value = false
    router.push(`/classes?teacher=${selectedTeacher.value.id}`)
  }
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
