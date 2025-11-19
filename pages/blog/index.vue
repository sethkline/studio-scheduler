<template>
  <div>
    <section class="bg-gradient-to-r from-primary to-secondary text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">Studio News & Blog</h1>
        <p class="text-xl max-w-2xl mx-auto">
          Stay updated with the latest news, tips, and stories from our dance community.
        </p>
      </div>
    </section>

    <div class="container mx-auto px-4 py-12">
      <div class="grid lg:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="lg:col-span-2">
          <!-- Featured Post -->
          <div v-if="featuredPost" class="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
            <div class="h-64 bg-gradient-to-br from-primary to-secondary" />
            <div class="p-8">
              <div class="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <span class="px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">Featured</span>
                <span>{{ formatDate(featuredPost.published_at) }}</span>
              </div>
              <h2 class="text-3xl font-bold text-gray-900 mb-4">{{ featuredPost.title }}</h2>
              <p class="text-gray-600 mb-6">{{ featuredPost.excerpt }}</p>
              <NuxtLink :to="`/blog/${featuredPost.slug}`"
                class="inline-block px-6 py-3 bg-primary text-white font-bold rounded-lg hover:shadow-lg transition-all">
                Read More
              </NuxtLink>
            </div>
          </div>

          <!-- Posts Grid -->
          <div class="grid md:grid-cols-2 gap-6">
            <div v-for="post in posts" :key="post.id"
              class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow">
              <div class="h-48 bg-gradient-to-br from-primary to-secondary" />
              <div class="p-6">
                <div class="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <span v-if="post.category" class="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                    {{ post.category }}
                  </span>
                  <span>{{ formatDate(post.published_at) }}</span>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{{ post.title }}</h3>
                <p class="text-gray-600 mb-4 line-clamp-3">{{ post.excerpt }}</p>
                <NuxtLink :to="`/blog/${post.slug}`" class="text-primary font-semibold hover:underline">
                  Read More <i class="pi pi-arrow-right ml-1" />
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-8">
          <!-- Search -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="font-bold text-gray-900 mb-4">Search</h3>
            <div class="relative">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input v-model="searchQuery" type="text" placeholder="Search posts..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <!-- Categories -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="font-bold text-gray-900 mb-4">Categories</h3>
            <div class="space-y-2">
              <button v-for="cat in categories" :key="cat.name" @click="selectedCategory = cat.value"
                :class="[
                  'w-full text-left px-4 py-2 rounded-lg transition-colors',
                  selectedCategory === cat.value ? 'bg-primary text-white' : 'hover:bg-gray-100'
                ]">
                {{ cat.name }} ({{ cat.count }})
              </button>
            </div>
          </div>

          <!-- Recent Posts -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="font-bold text-gray-900 mb-4">Recent Posts</h3>
            <div class="space-y-4">
              <NuxtLink v-for="post in recentPosts" :key="post.id" :to="`/blog/${post.slug}`"
                class="block hover:bg-gray-50 p-2 rounded transition-colors">
                <div class="font-semibold text-gray-900 text-sm line-clamp-2">{{ post.title }}</div>
                <div class="text-xs text-gray-500 mt-1">{{ formatDate(post.published_at) }}</div>
              </NuxtLink>
            </div>
          </div>

          <!-- Newsletter -->
          <div class="bg-gradient-to-br from-primary to-secondary text-white rounded-xl p-6">
            <h3 class="font-bold mb-2">Subscribe to Newsletter</h3>
            <p class="text-sm mb-4 opacity-90">Get the latest updates delivered to your inbox.</p>
            <form @submit.prevent="handleSubscribe" class="space-y-3">
              <input v-model="email" type="email" placeholder="Your email" required
                class="w-full px-4 py-2 rounded-lg text-gray-900" />
              <button type="submit" class="w-full bg-white text-primary font-bold py-2 rounded-lg hover:shadow-lg transition-all">
                Subscribe
              </button>
            </form>
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

const { applyTheme } = useTheme()
const toast = useToast()

onMounted(() => {
  applyTheme()
})

// Mock data (replace with API calls)
const featuredPost = ref({
  id: 1,
  title: 'Preparing for Your First Dance Recital',
  slug: 'first-dance-recital',
  excerpt: 'Everything you need to know to make your first recital experience amazing...',
  published_at: '2024-03-15',
})

const posts = ref([
  { id: 2, title: '5 Benefits of Dance for Children', slug: 'benefits-of-dance', excerpt: 'Discover how dance can positively impact your child\'s development...', published_at: '2024-03-10', category: 'Tips' },
  { id: 3, title: 'Meet Our New Ballet Instructor', slug: 'new-ballet-instructor', excerpt: 'We\'re excited to welcome Miss Sarah to our teaching team...', published_at: '2024-03-05', category: 'News' },
])

const recentPosts = computed(() => posts.value.slice(0, 5))

const categories = ref([
  { name: 'All Posts', value: 'all', count: 24 },
  { name: 'Studio News', value: 'news', count: 8 },
  { name: 'Dance Tips', value: 'tips', count: 12 },
  { name: 'Events', value: 'events', count: 4 },
])

const searchQuery = ref('')
const selectedCategory = ref('all')
const email = ref('')

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const handleSubscribe = () => {
  toast.add({
    severity: 'success',
    summary: 'Subscribed!',
    detail: 'Thank you for subscribing to our newsletter.',
    life: 3000,
  })
  email.value = ''
}
</script>

<style scoped>
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
