export interface SeoMeta {
  title: string
  description: string
  image?: string
  url?: string
  type?: string
  keywords?: string[]
  author?: string
  publishedTime?: string
  modifiedTime?: string
}

export function useSeo(meta: SeoMeta) {
  const config = useRuntimeConfig()
  const route = useRoute()
  const studioStore = useStudioStore()

  const baseUrl = config.public.marketingSiteUrl || 'https://example.com'
  const studioName = computed(() => studioStore.profile?.name || 'Dance Studio')

  const fullTitle = computed(() => {
    return meta.title.includes(studioName.value)
      ? meta.title
      : `${meta.title} | ${studioName.value}`
  })

  const fullUrl = computed(() => meta.url || `${baseUrl}${route.path}`)
  const imageUrl = computed(() => {
    if (meta.image) {
      return meta.image.startsWith('http') ? meta.image : `${baseUrl}${meta.image}`
    }
    return studioStore.profile?.logo_url || `${baseUrl}/default-og-image.jpg`
  })

  useHead({
    title: fullTitle.value,
    meta: [
      // Basic meta tags
      { name: 'description', content: meta.description },
      { name: 'keywords', content: meta.keywords?.join(', ') },
      { name: 'author', content: meta.author || studioName.value },

      // Open Graph / Facebook
      { property: 'og:type', content: meta.type || 'website' },
      { property: 'og:url', content: fullUrl.value },
      { property: 'og:title', content: fullTitle.value },
      { property: 'og:description', content: meta.description },
      { property: 'og:image', content: imageUrl.value },
      { property: 'og:site_name', content: studioName.value },

      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:url', content: fullUrl.value },
      { name: 'twitter:title', content: fullTitle.value },
      { name: 'twitter:description', content: meta.description },
      { name: 'twitter:image', content: imageUrl.value },

      // Article meta (for blog posts)
      ...(meta.publishedTime ? [{ property: 'article:published_time', content: meta.publishedTime }] : []),
      ...(meta.modifiedTime ? [{ property: 'article:modified_time', content: meta.modifiedTime }] : []),
    ],
    link: [
      { rel: 'canonical', href: fullUrl.value },
    ],
  })

  // Generate JSON-LD structured data
  const generateStructuredData = () => {
    const structuredData: any[] = []

    // Organization schema
    if (studioStore.profile) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'DanceGroup',
        name: studioStore.profile.name,
        description: studioStore.profile.description,
        url: baseUrl,
        logo: studioStore.profile.logo_url,
        email: studioStore.profile.email,
        telephone: studioStore.profile.phone,
        address: {
          '@type': 'PostalAddress',
          streetAddress: studioStore.profile.address,
          addressLocality: studioStore.profile.city,
          addressRegion: studioStore.profile.state,
          postalCode: studioStore.profile.postal_code,
          addressCountry: studioStore.profile.country || 'US',
        },
        sameAs: Object.values(studioStore.profile.social_media || {}),
      })
    }

    // Add Article schema for blog posts
    if (meta.type === 'article' && meta.publishedTime) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: meta.title,
        description: meta.description,
        image: imageUrl.value,
        datePublished: meta.publishedTime,
        dateModified: meta.modifiedTime || meta.publishedTime,
        author: {
          '@type': 'Organization',
          name: studioName.value,
        },
      })
    }

    return structuredData
  }

  // Add structured data to head
  useHead({
    script: generateStructuredData().map(data => ({
      type: 'application/ld+json',
      children: JSON.stringify(data),
    })),
  })
}

export function useEventSchema(event: {
  name: string
  description: string
  startDate: string
  endDate?: string
  location: string
  image?: string
  url?: string
}) {
  const config = useRuntimeConfig()
  const studioStore = useStudioStore()

  const baseUrl = config.public.marketingSiteUrl || 'https://example.com'

  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'DanceEvent',
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate || event.startDate,
    location: {
      '@type': 'Place',
      name: event.location,
      address: studioStore.profile?.address
        ? {
            '@type': 'PostalAddress',
            streetAddress: studioStore.profile.address,
            addressLocality: studioStore.profile.city,
            addressRegion: studioStore.profile.state,
            postalCode: studioStore.profile.postal_code,
          }
        : undefined,
    },
    image: event.image || studioStore.profile?.logo_url,
    url: event.url || baseUrl,
    organizer: {
      '@type': 'Organization',
      name: studioStore.profile?.name,
      url: baseUrl,
    },
  }

  useHead({
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(eventSchema),
      },
    ],
  })
}
