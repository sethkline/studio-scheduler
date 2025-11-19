<template>
  <div class="public-recital-page">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <ProgressSpinner />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <i class="pi pi-exclamation-circle text-6xl text-red-500 mb-4"></i>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Recital Not Found</h1>
        <p class="text-gray-600">This recital may not be public yet or the link is incorrect.</p>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="recitalData">
      <!-- Hero Section -->
      <div class="hero-section">
        <div
          v-if="recitalData.recital.heroImageUrl"
          class="hero-image"
          :style="{ backgroundImage: `url(${recitalData.recital.heroImageUrl})` }"
        >
          <div class="hero-overlay"></div>
        </div>
        <div class="hero-content container mx-auto px-4">
          <h1 class="text-5xl md:text-6xl font-bold text-white mb-4">
            {{ recitalData.recital.name }}
          </h1>
          <p class="text-xl text-white mb-8">
            {{ recitalData.recital.description }}
          </p>
          <div class="flex gap-4">
            <Button
              label="Purchase Tickets"
              size="large"
              @click="navigateTo(`/public/recital-tickets/${recitalData.recital.id}`)"
            />
            <Button
              label="View Program"
              size="large"
              severity="secondary"
              outlined
              @click="scrollToProgram"
            />
          </div>
        </div>
      </div>

      <!-- Countdown Section -->
      <div v-if="recitalData.recital.showCountdown" class="countdown-section bg-blue-50 py-12">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-8">Show Begins In</h2>
          <div class="flex justify-center gap-8">
            <div class="countdown-item">
              <div class="countdown-number">{{ countdown.days }}</div>
              <div class="countdown-label">Days</div>
            </div>
            <div class="countdown-item">
              <div class="countdown-number">{{ countdown.hours }}</div>
              <div class="countdown-label">Hours</div>
            </div>
            <div class="countdown-item">
              <div class="countdown-number">{{ countdown.minutes }}</div>
              <div class="countdown-label">Minutes</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Show Dates Section -->
      <div class="shows-section py-16 bg-white">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-8">Show Dates & Times</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              v-for="show in recitalData.recital.shows"
              :key="show.id"
              class="show-card"
            >
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600 mb-2">
                  {{ formatDate(show.show_date) }}
                </div>
                <div class="text-lg text-gray-700 mb-4">{{ show.show_time }}</div>
                <div class="text-gray-600">{{ show.venue || recitalData.recital.venueName }}</div>
                <Button
                  label="Get Tickets"
                  class="mt-4 w-full"
                  @click="navigateTo(`/public/recital-tickets/${recitalData.recital.id}?show=${show.id}`)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Program Highlights -->
      <div
        v-if="recitalData.recital.programHighlights"
        class="program-section py-16 bg-gray-50"
        id="program"
      >
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-8">Program Highlights</h2>
          <div class="max-w-3xl mx-auto text-lg text-gray-700 whitespace-pre-wrap">
            {{ recitalData.recital.programHighlights }}
          </div>
        </div>
      </div>

      <!-- Gallery Section -->
      <div v-if="recitalData.gallery && recitalData.gallery.length > 0" class="gallery-section py-16 bg-white">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-8">Photo Gallery</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              v-for="image in recitalData.gallery"
              :key="image.id"
              class="gallery-item"
            >
              <img
                :src="image.image_url"
                :alt="image.alt_text || 'Recital photo'"
                class="w-full h-64 object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Venue & Directions -->
      <div class="venue-section py-16 bg-gray-50">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-8">Venue & Parking</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 class="text-xl font-semibold mb-4">{{ recitalData.recital.venueName }}</h3>
              <p class="text-gray-700 mb-4">{{ recitalData.recital.venueAddress }}</p>
              <div v-if="recitalData.recital.venueDirections" class="text-gray-600 whitespace-pre-wrap">
                {{ recitalData.recital.venueDirections }}
              </div>
            </div>
            <div v-if="recitalData.recital.venueMapUrl">
              <iframe
                :src="recitalData.recital.venueMapUrl"
                width="100%"
                height="300"
                style="border:0;"
                allowfullscreen
                loading="lazy"
              ></iframe>
            </div>
          </div>
        </div>
      </div>

      <!-- FAQ Section -->
      <div v-if="recitalData.faq && recitalData.faq.length > 0" class="faq-section py-16 bg-white">
        <div class="container mx-auto px-4">
          <h2 class="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div class="max-w-3xl mx-auto space-y-6">
            <div
              v-for="item in recitalData.faq"
              :key="item.id"
              class="faq-item"
            >
              <h3 class="font-semibold text-lg text-gray-900 mb-2">{{ item.question }}</h3>
              <p class="text-gray-700">{{ item.answer }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Social Share Section -->
      <div v-if="recitalData.recital.enableSocialShare" class="share-section py-12 bg-blue-600">
        <div class="container mx-auto px-4 text-center">
          <h3 class="text-2xl font-bold text-white mb-4">Share with Friends & Family</h3>
          <div class="flex justify-center gap-4">
            <Button
              label="Facebook"
              icon="pi pi-facebook"
              severity="secondary"
              outlined
              @click="shareOnFacebook"
            />
            <Button
              label="Twitter"
              icon="pi pi-twitter"
              severity="secondary"
              outlined
              @click="shareOnTwitter"
            />
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="cta-section py-16 bg-gray-900 text-white text-center">
        <div class="container mx-auto px-4">
          <h2 class="text-4xl font-bold mb-4">Don't Miss This Amazing Performance!</h2>
          <p class="text-xl mb-8">Reserve your seats today</p>
          <Button
            label="Purchase Tickets Now"
            size="large"
            @click="navigateTo(`/public/recital-tickets/${recitalData.recital.id}`)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

const loading = ref(true)
const error = ref(false)
const recitalData = ref<any>(null)
const countdown = ref({ days: 0, hours: 0, minutes: 0 })

const loadRecital = async () => {
  loading.value = true
  error.value = false

  try {
    const { data, error: fetchError } = await useFetch(`/api/public/recitals/by-slug/${slug}`)

    if (fetchError.value || !data.value) {
      error.value = true
      return
    }

    recitalData.value = data.value
    calculateCountdown()
  } catch (err) {
    error.value = true
  } finally {
    loading.value = false
  }
}

const calculateCountdown = () => {
  if (!recitalData.value?.recital?.shows?.[0]) return

  const updateCountdown = () => {
    const showDate = new Date(recitalData.value.recital.shows[0].show_date)
    const now = new Date()
    const diff = showDate.getTime() - now.getTime()

    countdown.value = {
      days: Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))),
      hours: Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
      minutes: Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)))
    }
  }

  updateCountdown()
  setInterval(updateCountdown, 60000) // Update every minute
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
}

const scrollToProgram = () => {
  const element = document.getElementById('program')
  element?.scrollIntoView({ behavior: 'smooth' })
}

const shareOnFacebook = () => {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank')
}

const shareOnTwitter = () => {
  const text = `Check out ${recitalData.value.recital.name}!`
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${window.location.href}`, '_blank')
}

// Set SEO meta tags
useHead({
  title: recitalData.value?.recital?.name || 'Recital',
  meta: [
    { name: 'description', content: recitalData.value?.recital?.metaDescription || '' },
    { property: 'og:title', content: recitalData.value?.recital?.name || '' },
    { property: 'og:description', content: recitalData.value?.recital?.metaDescription || '' },
    { property: 'og:image', content: recitalData.value?.recital?.heroImageUrl || '' }
  ]
})

onMounted(() => {
  loadRecital()
})
</script>

<style scoped>
.public-recital-page {
  @apply min-h-screen bg-white;
}

.hero-section {
  @apply relative min-h-[500px] flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600;
}

.hero-image {
  @apply absolute inset-0 bg-cover bg-center;
}

.hero-overlay {
  @apply absolute inset-0 bg-black bg-opacity-50;
}

.hero-content {
  @apply relative z-10 text-center;
}

.countdown-item {
  @apply text-center;
}

.countdown-number {
  @apply text-5xl font-bold text-blue-600;
}

.countdown-label {
  @apply text-gray-600 uppercase text-sm mt-2;
}

.show-card {
  @apply p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors;
}

.gallery-item {
  @apply overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow;
}

.faq-item {
  @apply p-6 bg-gray-50 rounded-lg;
}
</style>
