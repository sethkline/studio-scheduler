/**
 * Additional security headers middleware
 * Complements nuxt-security module with custom headers
 */
export default defineEventHandler((event) => {
  const isProduction = process.env.NODE_ENV === 'production'

  // Set additional security headers
  const headers: Record<string, string> = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Disable DNS prefetching to prevent information leakage
    'X-DNS-Prefetch-Control': 'off',

    // Prevent browsers from performing MIME type sniffing
    'X-Download-Options': 'noopen',

    // Restrict feature permissions
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
  }

  // Production-only headers
  if (isProduction) {
    // Enable XSS protection
    headers['X-XSS-Protection'] = '1; mode=block'

    // Prevent page from being displayed in iframe (clickjacking protection)
    headers['X-Frame-Options'] = 'SAMEORIGIN'

    // Expect-CT header for certificate transparency
    headers['Expect-CT'] = 'max-age=86400, enforce'
  }

  // Set all headers
  setResponseHeaders(event, headers)
})
