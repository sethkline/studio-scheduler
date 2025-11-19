import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.nuxt/**',
        'dist/**',
        'coverage/**',
        '**/*.config.*',
        '**/*.test.ts',
        '**/*.spec.ts',
        'tests/**',
        '.storybook/**',
        'storybook-static/**'
      ],
      include: [
        'server/api/**/*.ts',
        'composables/**/*.ts',
        'server/utils/**/*.ts',
        'utils/**/*.ts'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./tests/setup.ts']
  }
})
