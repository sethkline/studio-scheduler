import tailwindTypography from '@tailwindcss/typography';

/**
 * Validate required environment variables
 */
function validateEnvironmentVariables() {
  const isProduction = process.env.NODE_ENV === 'production'
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN'
  ]

  // In production, also require these
  if (isProduction) {
    requiredVars.push('MARKETING_SITE_URL')
    requiredVars.push('VAPID_PUBLIC_KEY')
    requiredVars.push('VAPID_PRIVATE_KEY')
  }

  const missingVars = requiredVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    const errorMessage = `
╔════════════════════════════════════════════════════════════════════╗
║  Missing Required Environment Variables                           ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  The following environment variables are required but not set:    ║
║                                                                    ║
${missingVars.map(v => `║  - ${v.padEnd(60, ' ')}║`).join('\n')}
║                                                                    ║
║  Please create a .env file based on .env.example and fill in      ║
║  the required values.                                              ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
    `.trim()

    // Only throw error in production, warn in development
    if (isProduction) {
      throw new Error(errorMessage)
    } else {
      console.warn('\x1b[33m%s\x1b[0m', errorMessage)
    }
  }

  // Validate URL formats
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
    console.warn('⚠️  SUPABASE_URL should start with https://')
  }

  if (isProduction && process.env.MARKETING_SITE_URL && !process.env.MARKETING_SITE_URL.startsWith('https://')) {
    console.warn('⚠️  MARKETING_SITE_URL should use https:// in production')
  }
}

// Run validation
validateEnvironmentVariables()

export default defineNuxtConfig({
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

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

  security: {
    headers: {
      crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production' ? 'credentialless' : false,
      contentSecurityPolicy: {
        'base-uri': ["'self'"],
        'font-src': ["'self'", 'https:', 'data:'],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
        'object-src': ["'none'"],
        'script-src-attr': ["'none'"],
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'", // Required for Vue/Nuxt in dev mode
          "https://*.stripe.com",
          "https://js.stripe.com"
        ],
        'style-src': ["'self'", 'https:', "'unsafe-inline'"],
        'connect-src': [
          "'self'",
          "https://*.stripe.com",
          "https://api.stripe.com",
          "https://*.supabase.co",
          "wss://*.supabase.co"
        ],
        'frame-src': [
          "'self'",
          "https://*.stripe.com",
          "https://js.stripe.com",
          "https://hooks.stripe.com"
        ],
        'upgrade-insecure-requests': process.env.NODE_ENV === 'production'
      },
      crossOriginResourcePolicy: false, // Allow resources to be loaded cross-origin
      strictTransportSecurity: {
        maxAge: 31536000, // 1 year
        includeSubdomains: true,
        preload: true
      },
      xContentTypeOptions: 'nosniff',
      xFrameOptions: 'SAMEORIGIN',
      xXSSProtection: '1; mode=block',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        camera: ['()'],
        microphone: ['()'],
        geolocation: ['()'],
        payment: ['self']
      }
    },
    rateLimiter: {
      tokensPerInterval: 100,
      interval: 'minute',
      headers: true,
      driver: {
        name: 'lruCache'
      },
      throwError: false
    }
  },

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

  routeRules: {
    // Stricter rate limiting for public API endpoints
    '/api/public/**': {
      security: {
        rateLimiter: {
          tokensPerInterval: 50,
          interval: 'minute',
          throwError: false
        }
      }
    },
    '/api/tickets/**': {
      security: {
        rateLimiter: {
          tokensPerInterval: 50,
          interval: 'minute',
          throwError: false
        }
      }
    },
    '/api/payments/**': {
      security: {
        rateLimiter: {
          tokensPerInterval: 30,
          interval: 'minute',
          throwError: false
        }
      }
    },
    // More relaxed rate limiting for authenticated endpoints
    '/api/**': {
      security: {
        rateLimiter: {
          tokensPerInterval: 100,
          interval: 'minute',
          throwError: false
        }
      }
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
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-cache',
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
          urlPattern: /^https:\/\/.*\.stripe\.com\/.*/i,
          handler: 'NetworkOnly'
        },
        {
          urlPattern: /\/api\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
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
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'image-cache',
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
    devOptions: {
      enabled: process.env.NODE_ENV === 'development',
      type: 'module'
    }
  },

  compatibilityDate: '2025-03-12'
})