<template>
  <div>
    <!-- Hero -->
    <section class="bg-gradient-to-r from-primary to-secondary text-white py-20">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto text-center">
          <div class="flex items-center justify-center gap-4 text-sm mb-4">
            <span class="px-3 py-1 bg-white/20 rounded-full">{{ post.category }}</span>
            <span>{{ formatDate(post.published_at) }}</span>
            <span>{{ post.read_time }} min read</span>
          </div>
          <h1 class="text-5xl font-bold mb-4">{{ post.title }}</h1>
          <p class="text-xl opacity-90">{{ post.excerpt }}</p>
        </div>
      </div>
    </section>

    <div class="container mx-auto px-4 py-12">
      <div class="max-w-4xl mx-auto">
        <!-- Content -->
        <article class="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-8 prose prose-lg max-w-none">
          <div v-html="post.content" />
        </article>

        <!-- Share -->
        <div class="bg-gray-50 rounded-xl p-6 mb-8">
          <h3 class="font-bold text-gray-900 mb-4">Share this post</h3>
          <div class="flex gap-4">
            <button class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <i class="pi pi-facebook mr-2" />
              Facebook
            </button>
            <button class="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600">
              <i class="pi pi-twitter mr-2" />
              Twitter
            </button>
            <button class="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
              <i class="pi pi-envelope mr-2" />
              Email
            </button>
          </div>
        </div>

        <!-- Related Posts -->
        <div>
          <h2 class="text-3xl font-bold text-gray-900 mb-6">Related Posts</h2>
          <div class="grid md:grid-cols-3 gap-6">
            <NuxtLink v-for="related in relatedPosts" :key="related.id" :to="`/blog/${related.slug}`"
              class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow">
              <div class="h-40 bg-gradient-to-br from-primary to-secondary" />
              <div class="p-4">
                <h3 class="font-bold text-gray-900 mb-2 line-clamp-2">{{ related.title }}</h3>
                <p class="text-sm text-gray-600">{{ formatDate(related.published_at) }}</p>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'public',
})

const route = useRoute()
const { applyTheme } = useTheme()

onMounted(() => {
  applyTheme()
})

// Mock post data (replace with API call)
const post = ref({
  id: 1,
  title: 'Preparing for Your First Dance Recital',
  slug: route.params.slug,
  excerpt: 'Everything you need to know to make your first recital experience amazing and stress-free.',
  content: '<p>Your first dance recital is an exciting milestone! Here are some tips to help you prepare...</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>',
  category: 'Tips',
  published_at: '2024-03-15',
  read_time: 5,
})

const relatedPosts = ref([
  { id: 2, title: '5 Benefits of Dance for Children', slug: 'benefits-of-dance', published_at: '2024-03-10' },
  { id: 3, title: 'Choosing the Right Dance Class', slug: 'choosing-dance-class', published_at: '2024-03-05' },
  { id: 4, title: 'Dance Costume Care Tips', slug: 'costume-care', published_at: '2024-03-01' },
])

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
