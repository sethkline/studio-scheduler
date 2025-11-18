import { vi } from 'vitest'

/**
 * Mock Supabase client for testing
 * Provides a fluent API that mimics Supabase queries
 */
export function createMockSupabaseClient(mockData: any = {}) {
  const createQueryBuilder = (table: string) => {
    let currentData = mockData[table] || []
    let filters: any = {}
    let selectFields = '*'
    let shouldReturnSingle = false
    let orderConfig: any = null

    const builder: any = {
      select: (fields = '*') => {
        selectFields = fields
        return builder
      },
      insert: (data: any) => {
        if (Array.isArray(data)) {
          currentData.push(...data)
        } else {
          currentData.push(data)
        }
        return builder
      },
      update: (data: any) => {
        if (filters.id) {
          const index = currentData.findIndex((item: any) => item.id === filters.id)
          if (index !== -1) {
            currentData[index] = { ...currentData[index], ...data }
          }
        }
        return builder
      },
      delete: () => {
        if (filters.id) {
          currentData = currentData.filter((item: any) => item.id !== filters.id)
          mockData[table] = currentData
        }
        return builder
      },
      eq: (field: string, value: any) => {
        filters[field] = value
        return builder
      },
      neq: (field: string, value: any) => {
        filters[`${field}_neq`] = value
        return builder
      },
      in: (field: string, values: any[]) => {
        filters[`${field}_in`] = values
        return builder
      },
      gte: (field: string, value: any) => {
        filters[`${field}_gte`] = value
        return builder
      },
      lte: (field: string, value: any) => {
        filters[`${field}_lte`] = value
        return builder
      },
      single: () => {
        shouldReturnSingle = true
        return builder
      },
      order: (field: string, options: any = {}) => {
        orderConfig = { field, ...options }
        return builder
      },
      limit: (count: number) => {
        filters.limit = count
        return builder
      },
      range: (from: number, to: number) => {
        filters.range = { from, to }
        return builder
      },
      then: async (resolve: any) => {
        let filteredData = currentData

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (key === 'limit' || key === 'range') return

          if (key.endsWith('_neq')) {
            const field = key.replace('_neq', '')
            filteredData = filteredData.filter((item: any) => item[field] !== value)
          } else if (key.endsWith('_in')) {
            const field = key.replace('_in', '')
            filteredData = filteredData.filter((item: any) => (value as any[]).includes(item[field]))
          } else if (key.endsWith('_gte')) {
            const field = key.replace('_gte', '')
            filteredData = filteredData.filter((item: any) => item[field] >= value)
          } else if (key.endsWith('_lte')) {
            const field = key.replace('_lte', '')
            filteredData = filteredData.filter((item: any) => item[field] <= value)
          } else {
            filteredData = filteredData.filter((item: any) => item[key] === value)
          }
        })

        // Apply ordering
        if (orderConfig) {
          const { field, ascending = true } = orderConfig
          filteredData.sort((a: any, b: any) => {
            if (a[field] < b[field]) return ascending ? -1 : 1
            if (a[field] > b[field]) return ascending ? 1 : -1
            return 0
          })
        }

        // Apply limit
        if (filters.limit) {
          filteredData = filteredData.slice(0, filters.limit)
        }

        // Apply range
        if (filters.range) {
          filteredData = filteredData.slice(filters.range.from, filters.range.to + 1)
        }

        const result = shouldReturnSingle ? filteredData[0] || null : filteredData

        return resolve({
          data: result,
          error: null,
          count: filteredData.length,
          status: 200,
          statusText: 'OK'
        })
      }
    }

    // Make it thenable
    builder.then = builder.then.bind(builder)

    return builder
  }

  return {
    from: (table: string) => createQueryBuilder(table),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: (bucket: string) => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/test.pdf' } })
      })
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' }, session: { access_token: 'test-token' } },
        error: null
      }),
      signOut: vi.fn().mockResolvedValue({ error: null })
    }
  }
}

/**
 * Mock Stripe client for testing
 */
export function createMockStripeClient() {
  return {
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method'
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 10000,
        metadata: {}
      }),
      confirm: vi.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded'
      })
    },
    refunds: {
      create: vi.fn().mockResolvedValue({
        id: 're_test_123',
        amount: 10000,
        status: 'succeeded',
        payment_intent: 'pi_test_123'
      })
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 10000,
            metadata: { orderId: 'test-order-id' }
          }
        }
      })
    }
  }
}

/**
 * Mock Mailgun client for testing
 */
export function createMockMailgunClient() {
  const messages = {
    create: vi.fn().mockResolvedValue({
      id: '<test-message-id>',
      message: 'Queued. Thank you.'
    })
  }

  return {
    messages
  }
}

/**
 * Mock H3 event for API endpoint testing
 */
export function createMockEvent(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
  params?: Record<string, string>
  query?: Record<string, string>
  user?: any
} = {}) {
  const {
    method = 'GET',
    url = '/api/test',
    headers = {},
    body = null,
    params = {},
    query = {},
    user = null
  } = options

  const event: any = {
    node: {
      req: {
        method,
        url,
        headers: {
          'content-type': 'application/json',
          ...headers
        }
      },
      res: {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn()
      }
    },
    context: {
      params,
      user,
      cloudflare: {}
    },
    _path: url
  }

  // Mock getQuery
  global.getQuery = vi.fn().mockReturnValue(query)

  // Mock getRouterParam
  global.getRouterParam = vi.fn((_, key: string) => params[key])

  // Mock readBody
  global.readBody = vi.fn().mockResolvedValue(body)

  // Mock requireUser / requireAdmin
  global.requireUser = vi.fn().mockResolvedValue(user || {
    id: 'test-user-id',
    email: 'test@example.com',
    user_role: 'admin'
  })

  global.requireAdmin = vi.fn().mockResolvedValue(user || {
    id: 'test-user-id',
    email: 'admin@example.com',
    user_role: 'admin'
  })

  return event
}

/**
 * Verify that an error was thrown with expected properties
 */
export function expectError(error: any, expectedProps: {
  statusCode?: number
  message?: string | RegExp
}) {
  expect(error).toBeDefined()

  if (expectedProps.statusCode) {
    expect(error.statusCode).toBe(expectedProps.statusCode)
  }

  if (expectedProps.message) {
    if (typeof expectedProps.message === 'string') {
      expect(error.message).toBe(expectedProps.message)
    } else {
      expect(error.message).toMatch(expectedProps.message)
    }
  }
}
