import { vi } from 'vitest'

// Setup global test environment
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.NUXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NUXT_PUBLIC_SUPABASE_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  process.env.STRIPE_SECRET_KEY = 'sk_test_123456789'
  process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123456789'
  process.env.MAILGUN_API_KEY = 'test-mailgun-key'
  process.env.MAILGUN_DOMAIN = 'test.mailgun.org'
  process.env.MARKETING_SITE_URL = 'http://localhost:3000'
})

// Reset mocks between tests
afterEach(() => {
  vi.clearAllMocks()
})

// Global test utilities
global.testUtils = {
  generateId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
}
