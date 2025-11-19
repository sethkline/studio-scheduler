export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const router = useRouter()

  const gaId = config.public.googleAnalyticsId

  if (!gaId) {
    console.warn('Google Analytics ID not configured')
    return
  }

  // Load Google Analytics script
  useHead({
    script: [
      {
        src: `https://www.googletagmanager.com/gtag/js?id=${gaId}`,
        async: true,
      },
      {
        children: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
          });
        `,
      },
    ],
  })

  // Track page views on route change
  router.afterEach((to) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', gaId, {
        page_path: to.fullPath,
      })
    }
  })
})
