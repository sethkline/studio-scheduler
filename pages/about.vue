<template>
  <div>
    <section class="bg-gradient-to-r from-primary to-secondary text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">About {{ studio?.name }}</h1>
        <p class="text-xl max-w-2xl mx-auto">
          {{ studio?.description }}
        </p>
      </div>
    </section>

    <div class="container mx-auto px-4 py-16">
      <!-- Mission -->
      <div class="max-w-4xl mx-auto mb-16 text-center">
        <h2 class="text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
        <p class="text-lg text-gray-600 leading-relaxed">
          To inspire and nurture dancers of all ages through exceptional instruction, creating a supportive community where artistry, discipline, and joy combine to help every student reach their full potential.
        </p>
      </div>

      <!-- Values -->
      <div class="grid md:grid-cols-3 gap-8 mb-16">
        <div class="bg-white rounded-xl shadow-lg p-8 text-center">
          <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="pi pi-heart text-primary text-3xl" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-3">Excellence</h3>
          <p class="text-gray-600">We maintain the highest standards in dance education and performance.</p>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-8 text-center">
          <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="pi pi-users text-primary text-3xl" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-3">Community</h3>
          <p class="text-gray-600">We foster a welcoming, inclusive environment for all dancers.</p>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-8 text-center">
          <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="pi pi-star text-primary text-3xl" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-3">Growth</h3>
          <p class="text-gray-600">We support each student's individual journey and artistic development.</p>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">Ready to Start Your Dance Journey?</h2>
        <NuxtLink to="/register/trial"
          class="inline-block px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg hover:shadow-lg transition-all">
          Book a Free Trial Class
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'public',
})

const studioStore = useStudioStore()
const { applyTheme } = useTheme()

const studio = computed(() => studioStore.profile)

onMounted(async () => {
  await studioStore.loadProfile()
  applyTheme()
})
</script>
