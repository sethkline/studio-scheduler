import { getSupabaseClient } from '~/server/utils/supabase'

/**
 * Dynamic PWA manifest endpoint
 * Generates studio-specific manifest for multi-tenant support
 */
export default defineEventHandler(async (event) => {
  const client = getSupabaseClient()

  try {
    // Fetch studio profile to customize manifest
    const { data: studio, error } = await client
      .from('studio_profile')
      .select('studio_name, logo_url, primary_color')
      .single()

    // Default manifest values
    const defaultManifest = {
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
    }

    // If studio data exists, customize the manifest
    if (!error && studio) {
      const manifest = {
        ...defaultManifest,
        name: studio.studio_name ? `${studio.studio_name} - Studio Manager` : defaultManifest.name,
        short_name: studio.studio_name || defaultManifest.short_name,
        description: studio.studio_name
          ? `Manage ${studio.studio_name} classes, schedules, and recitals`
          : defaultManifest.description,
        theme_color: studio.primary_color || defaultManifest.theme_color,
      }

      // Set correct content type for manifest
      event.node.res.setHeader('Content-Type', 'application/manifest+json')
      event.node.res.setHeader('Cache-Control', 'public, max-age=3600') // Cache for 1 hour

      return manifest
    }

    // Return default manifest if no studio data
    event.node.res.setHeader('Content-Type', 'application/manifest+json')
    event.node.res.setHeader('Cache-Control', 'public, max-age=3600')

    return defaultManifest
  } catch (error) {
    console.error('Error generating manifest:', error)

    // Return default manifest on error
    event.node.res.setHeader('Content-Type', 'application/manifest+json')
    return {
      name: 'Dance Studio Scheduler',
      short_name: 'Studio',
      description: 'Manage your dance studio classes, schedules, and recitals',
      theme_color: '#8B5CF6',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
    }
  }
})
