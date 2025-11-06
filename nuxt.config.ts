import tailwindTypography from '@tailwindcss/typography';
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@primevue/nuxt-module',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vee-validate/nuxt',
    'nuxt-security',
    '@vueuse/nuxt',
    '@nuxt/test-utils/module'
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
    marketingSiteUrl: process.env.MARKETING_SITE_URL,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    // Public keys (can be exposed to client)
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      marketingSiteUrl: process.env.MARKETING_SITE_URL || 'https://localhost:3000',
      googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || '',
    }
  },

  // security: {
  //   headers: {
  //     // contentSecurityPolicy: false,
  //     // crossOriginEmbedderPolicy: false,
  //     // crossOriginResourcePolicy: false
  //     crossOriginEmbedderPolicy: 'credentialless',
  //     contentSecurityPolicy: {
  //       'base-uri': ["'self'"],
  //       'font-src': ["'self'", 'https:', 'data:'],
  //       'form-action': ["'self'"],
  //       'frame-ancestors': ["'self'", "https://localhost:3000"],
  //       'img-src': ["'self'", 'data:', 'https:'],
  //       'object-src': ["'none'"],
  //       'script-src-attr': ["'none'"],
  //       'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.stripe.com"],
  //       'style-src': ["'self'", 'https:', "'unsafe-inline'"],
  //       'connect-src': ["'self'", "https://*.stripe.com", "https://api.stripe.com"],
  //       'frame-src': ["'self'", "https://*.stripe.com", "https://js.stripe.com", "https://hooks.stripe.com"],
  //       'upgrade-insecure-requests': true
  //     },
  //     // Add CORS headers
  //     crossOriginResourcePolicy: false
  //   },
  //   rateLimiter: false
  // },

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
  tailwindcss: {
    config: {
        plugins: [tailwindTypography],
    }
},

  compatibilityDate: '2025-03-12'
})