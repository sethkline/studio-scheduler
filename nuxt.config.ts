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
    '@nuxt/test-utils/module',
    '@vite-pwa/nuxt'
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
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    mailgunDomain: process.env.MAILGUN_DOMAIN,
    // Public keys (can be exposed to client)
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      marketingSiteUrl: process.env.MARKETING_SITE_URL || 'https://localhost:3000',
      googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || '',
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY
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
        { name: 'description', content: 'Dance studio class scheduling application' },
        { name: 'theme-color', content: '#8B5CF6' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Studio' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
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

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Dance Studio Scheduler',
      short_name: 'Studio',
      description: 'Manage your dance studio classes, schedules, and recitals',
      theme_color: '#8B5CF6',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/icons/icon-72x72.png',
          sizes: '72x72',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-128x128.png',
          sizes: '128x128',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-144x144.png',
          sizes: '144x144',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-152x152.png',
          sizes: '152x152',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-384x384.png',
          sizes: '384x384',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-192x192-maskable.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: '/icons/icon-512x512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      screenshots: [
        {
          src: '/screenshots/schedule.png',
          sizes: '540x720',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'Class Schedule View'
        },
        {
          src: '/screenshots/recitals.png',
          sizes: '540x720',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'Recital Management'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      // Add cache name prefix with version for cache busting
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          // Public Supabase storage (images, assets) - NetworkFirst is safe
          urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-storage-v1',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 // 24 hours
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          // Supabase auth/API calls - NetworkOnly to prevent stale auth data
          urlPattern: /^https:\/\/.*\.supabase\.co\/(auth|rest)\/.*/i,
          handler: 'NetworkOnly'
        },
        {
          // Stripe - NetworkOnly for security
          urlPattern: /^https:\/\/.*\.stripe\.com\/.*/i,
          handler: 'NetworkOnly'
        },
        {
          // Authenticated API routes - NetworkOnly to prevent cross-user cache leaks
          urlPattern: /\/api\/(profile|auth|students|teachers|staff)\/.*/i,
          handler: 'NetworkOnly'
        },
        {
          // Public API routes (tickets, recitals) - NetworkFirst with short TTL
          urlPattern: /\/api\/(recitals|public)\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'public-api-cache-v1',
            networkTimeoutSeconds: 10,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 5 // 5 minutes
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          // Images - CacheFirst for performance
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'image-cache-v1',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
            }
          }
        }
      ]
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600 // Check for updates every hour
    },
    // Only enable dev options in development
    devOptions: {
      enabled: process.env.NODE_ENV === 'development',
      type: 'module'
    }
  },

  compatibilityDate: '2025-03-12'
})