<template>
  <div>
    <section class="bg-gradient-to-r from-primary to-secondary text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">Enroll in Classes</h1>
        <p class="text-xl max-w-2xl mx-auto">
          Join our dance family! Complete your enrollment and start dancing today.
        </p>
      </div>
    </section>

    <div class="container mx-auto px-4 py-12 max-w-4xl">
      <div class="bg-white rounded-xl shadow-lg p-8">
        <p class="text-center text-gray-600 mb-8">
          Full enrollment form implementation - includes account creation, class selection, payment setup, and emergency contacts.
        </p>
        <div class="text-center">
          <NuxtLink to="/contact"
            class="inline-block px-8 py-4 bg-primary text-white font-bold rounded-lg hover:shadow-lg transition-all">
            Contact Us to Enroll
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'public',
})

const { applyTheme } = useTheme()
onMounted(() => {
  applyTheme()
})
</script>
