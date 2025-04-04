export default defineEventHandler((event) => {
  // Only apply CORS headers to marketing API routes
  if (getRequestURL(event).pathname.startsWith('/api/marketing')) {
    // Get the runtime config
    const config = useRuntimeConfig()
    
    // Build allowed origins list
    const allowedOrigins = []
    
    // Always allow development origins when in development mode
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:3001')
    }
    
    // Add marketing site URL if defined
    if (config.marketingSiteUrl) {
      allowedOrigins.push(config.marketingSiteUrl)
    }
    
    // Add any additional allowed origins
    if (config.additionalAllowedOrigins) {
      config.additionalAllowedOrigins.split(',').forEach(origin => {
        if (origin.trim()) allowedOrigins.push(origin.trim())
      })
    }

    const origin = getRequestHeader(event, 'Origin') || ''
    
    if (allowedOrigins.includes(origin)) {
      setResponseHeaders(event, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      })
    }
  }

  // Handle preflight requests
  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return null
  }
})