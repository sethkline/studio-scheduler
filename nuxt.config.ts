// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@primevue/nuxt-module',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vee-validate/nuxt',
    'nuxt-security',
    '@vueuse/nuxt'
  ],

  primevue: {
    options: { theme: 'none' },
  },

  css: [
    '@/assets/styles/tailwind.css', 
    '@/assets/styles/base.css', 
    'primeicons/primeicons.css'
  ],

  postcss: {
    plugins: {
      'postcss-import': {},
      tailwindcss: {},
      autoprefixer: {},
    }
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    redirect: false,
  },

  runtimeConfig: {
    // Private keys (server-side only)
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    // Public keys (can be exposed to client)
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    }
  },

  security: {
    headers: {
      crossOriginEmbedderPolicy: 'credentialless',
      contentSecurityPolicy: {
        'base-uri': ["'self'"],
        'font-src': ["'self'", 'https:', 'data:'],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'object-src': ["'none'"],
        'script-src-attr': ["'none'"],
        'style-src': ["'self'", 'https:', "'unsafe-inline'"],
        'upgrade-insecure-requests': true
      }
    }
  },

  app: {
    head: {
      title: 'Dance Studio Scheduler',
      meta: [
        { name: 'description', content: 'Dance studio class scheduling application' }
      ]
    }
  },

  typescript: {
    strict: true
  },

  compatibilityDate: '2025-03-12'
})