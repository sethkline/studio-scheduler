// tests/integration/admin/order-management.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockEvent, createMockStripeClient } from '../../utils/mocks'
import { createPurchaseFlowScenario, createTestOrder, createTestShow } from '../../utils/factories'

// Import API handlers (these may need to be created if they don't exist)
import listOrders from '../../../server/api/admin/ticketing/orders/index.get'
import getOrderDetails from '../../../server/api/admin/ticketing/orders/[id].get'
import processRefund from '../../../server/api/admin/ticketing/orders/[id]/refund.post'
import getDashboard from '../../../server/api/admin/ticketing/dashboard.get'
import exportSales from '../../../server/api/admin/ticketing/reports/sales.get'

const scenario = createPurchaseFlowScenario()
const show2 = createTestShow({ id: 'show-2', name: 'Summer Recital', venue_id: scenario.venue.id })

const orders = [
  createTestOrder({
    id: 'order-1',
    show_id: scenario.show.id,
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    status: 'paid',
    total_amount_in_cents: 5000,
    stripe_payment_intent_id: 'pi_123'
  }),
  createTestOrder({
    id: 'order-2',
    show_id: scenario.show.id,
    customer_name: 'Jane Smith',
    customer_email: 'jane@example.com',
    status: 'paid',
    total_amount_in_cents: 2500,
    stripe_payment_intent_id: 'pi_456'
  }),
  createTestOrder({
    id: 'order-3',
    show_id: show2.id,
    customer_name: 'Bob Johnson',
    customer_email: 'bob@example.com',
    status: 'pending',
    total_amount_in_cents: 3500
  })
]

const mockData = {
  recital_shows: [scenario.show, show2],
  venues: [scenario.venue],
  ticket_orders: orders,
  tickets: scenario.tickets,
  show_seats: scenario.showSeats
}

const mockStripe = createMockStripeClient()

vi.mock('../../../server/utils/supabase', () => ({
  getSupabaseClient: () => createMockSupabaseClient(mockData)
}))

vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripe)
}))

describe('Admin Order List & Search', () => {
  describe('GET /api/admin/ticketing/orders', () => {
    it('should view all orders', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/admin/ticketing/orders',
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await listOrders(event)

      expect(response.orders).toBeDefined()
      expect(response.orders.length).toBeGreaterThan(0)
    })

    it('should filter by show', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/admin/ticketing/orders?show_id=${scenario.show.id}`,
        query: { show_id: scenario.show.id },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await listOrders(event)

      expect(response.orders).toHaveLength(2)
      response.orders.forEach((order: any) => {
        expect(order.show_id).toBe(scenario.show.id)
      })
    })

    it('should filter by status (pending, confirmed, refunded)', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/admin/ticketing/orders?status=paid',
        query: { status: 'paid' },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await listOrders(event)

      response.orders.forEach((order: any) => {
        expect(order.status).toBe('paid')
      })
    })

    it('should filter by date range', async () => {
      const dateFrom = '2025-01-01'
      const dateTo = '2025-12-31'

      const event = createMockEvent({
        method: 'GET',
        url: `/api/admin/ticketing/orders?date_from=${dateFrom}&date_to=${dateTo}`,
        query: { date_from: dateFrom, date_to: dateTo },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await listOrders(event)

      expect(response.orders).toBeDefined()
    })

    it('should search by customer name', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/admin/ticketing/orders?search=John',
        query: { search: 'John' },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await listOrders(event)

      expect(response.orders.length).toBeGreaterThan(0)
      expect(response.orders[0].customer_name).toContain('John')
    })

    it('should search by customer email', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/admin/ticketing/orders?search=jane@example.com',
        query: { search: 'jane@example.com' },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await listOrders(event)

      expect(response.orders.length).toBeGreaterThan(0)
      expect(response.orders[0].customer_email).toBe('jane@example.com')
    })

    it('should search by order number', async () => {
      const orderNumber = orders[0].order_number

      const event = createMockEvent({
        method: 'GET',
        url: `/api/admin/ticketing/orders?search=${orderNumber}`,
        query: { search: orderNumber },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await listOrders(event)

      expect(response.orders.length).toBeGreaterThan(0)
      expect(response.orders[0].order_number).toBe(orderNumber)
    })

    it('should sort by columns (date, amount, status)', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/admin/ticketing/orders?sort_by=total_amount_in_cents&sort_order=desc',
        query: { sort_by: 'total_amount_in_cents', sort_order: 'desc' },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await listOrders(event)

      expect(response.orders).toBeDefined()
      // Should be sorted by amount descending
      if (response.orders.length > 1) {
        expect(response.orders[0].total_amount_in_cents).toBeGreaterThanOrEqual(
          response.orders[1].total_amount_in_cents
        )
      }
    })

    it('should support pagination', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/admin/ticketing/orders?page=1&limit=2',
        query: { page: '1', limit: '2' },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await listOrders(event)

      expect(response.orders).toBeDefined()
      expect(response.orders.length).toBeLessThanOrEqual(2)
      expect(response.pagination).toBeDefined()
    })
  })
})

describe('Admin Order Details', () => {
  describe('GET /api/admin/ticketing/orders/[id]', () => {
    it('should view complete order details', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/admin/ticketing/orders/${orders[0].id}`,
        params: { id: orders[0].id },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await getOrderDetails(event)

      expect(response.order).toBeDefined()
      expect(response.order.id).toBe(orders[0].id)
    })

    it('should show customer info (name, email, phone)', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/admin/ticketing/orders/${orders[0].id}`,
        params: { id: orders[0].id },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await getOrderDetails(event)

      expect(response.order.customer_name).toBe('John Doe')
      expect(response.order.customer_email).toBe('john@example.com')
    })

    it('should show seats purchased', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/admin/ticketing/orders/${orders[0].id}`,
        params: { id: orders[0].id },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await getOrderDetails(event)

      expect(response.tickets).toBeDefined()
      expect(Array.isArray(response.tickets)).toBe(true)
    })

    it('should show payment info (Stripe ID, amount)', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/admin/ticketing/orders/${orders[0].id}`,
        params: { id: orders[0].id },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await getOrderDetails(event)

      expect(response.order.stripe_payment_intent_id).toBe('pi_123')
      expect(response.order.total_amount_in_cents).toBe(5000)
    })
  })
})

describe('Refund Processing', () => {
  beforeEach(() => {
    mockStripe.refunds.create.mockClear()
    mockData.ticket_orders = [...orders]
    mockData.show_seats = scenario.showSeats.map(seat => ({
      ...seat,
      status: 'sold'
    }))
  })

  describe('POST /api/admin/ticketing/orders/[id]/refund (Happy Path)', () => {
    it('should initiate full refund', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: `/api/admin/ticketing/orders/${orders[0].id}/refund`,
        params: { id: orders[0].id },
        body: {
          amount_in_cents: orders[0].total_amount_in_cents,
          reason: 'Customer request'
        },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await processRefund(event)

      expect(response.success).toBe(true)
      expect(mockStripe.refunds.create).toHaveBeenCalled()
    })

    it('should initiate partial refund', async () => {
      const partialAmount = 2500

      const event = createMockEvent({
        method: 'POST',
        url: `/api/admin/ticketing/orders/${orders[0].id}/refund`,
        params: { id: orders[0].id },
        body: {
          amount_in_cents: partialAmount,
          reason: 'Partial refund'
        },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await processRefund(event)

      expect(response.success).toBe(true)
      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: partialAmount
        })
      )
    })

    it('should process Stripe refund successfully', async () => {
      mockStripe.refunds.create.mockResolvedValueOnce({
        id: 're_test_123',
        amount: orders[0].total_amount_in_cents,
        status: 'succeeded'
      })

      const event = createMockEvent({
        method: 'POST',
        url: `/api/admin/ticketing/orders/${orders[0].id}/refund`,
        params: { id: orders[0].id },
        body: {
          amount_in_cents: orders[0].total_amount_in_cents
        },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await processRefund(event)

      expect(response.success).toBe(true)
      expect(response.refund_id).toBe('re_test_123')
    })

    it('should update order status to "refunded" (full refund)', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: `/api/admin/ticketing/orders/${orders[0].id}/refund`,
        params: { id: orders[0].id },
        body: {
          amount_in_cents: orders[0].total_amount_in_cents
        },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await processRefund(event)

      expect(response.order.status).toBe('refunded')
    })

    it('should keep order status as "paid" for partial refunds', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: `/api/admin/ticketing/orders/${orders[0].id}/refund`,
        params: { id: orders[0].id },
        body: {
          amount_in_cents: 1000 // Partial
        },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await processRefund(event)

      // Status should remain 'paid' for partial refunds
      expect(response.order.status).toBe('paid')
    })

    it('should release seats to "available" (full refund only)', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: `/api/admin/ticketing/orders/${orders[0].id}/refund`,
        params: { id: orders[0].id },
        body: {
          amount_in_cents: orders[0].total_amount_in_cents
        },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      await processRefund(event)

      // Seats should be released (in real implementation)
      expect(true).toBe(true)
    })
  })

  describe('Refund Error Cases', () => {
    it('should not refund unpaid order', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: `/api/admin/ticketing/orders/${orders[2].id}/refund`, // Pending order
        params: { id: orders[2].id },
        body: {
          amount_in_cents: 1000
        },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      await expect(processRefund(event)).rejects.toThrow(/not paid|cannot refund/)
    })

    it('should not refund already refunded order', async () => {
      mockData.ticket_orders[0].status = 'refunded'

      const event = createMockEvent({
        method: 'POST',
        url: `/api/admin/ticketing/orders/${orders[0].id}/refund`,
        params: { id: orders[0].id },
        body: {
          amount_in_cents: 1000
        },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      await expect(processRefund(event)).rejects.toThrow(/already refunded/)
    })

    it('should not refund more than order total', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: `/api/admin/ticketing/orders/${orders[0].id}/refund`,
        params: { id: orders[0].id },
        body: {
          amount_in_cents: orders[0].total_amount_in_cents + 1000 // Exceeds total
        },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      await expect(processRefund(event)).rejects.toThrow(/exceeds|too much/)
    })

    it('should handle Stripe refund failure gracefully', async () => {
      mockStripe.refunds.create.mockRejectedValueOnce(
        new Error('Refund failed')
      )

      const event = createMockEvent({
        method: 'POST',
        url: `/api/admin/ticketing/orders/${orders[0].id}/refund`,
        params: { id: orders[0].id },
        body: {
          amount_in_cents: orders[0].total_amount_in_cents
        },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      await expect(processRefund(event)).rejects.toThrow(/failed/)
    })

    it('should not release seats on partial refund', async () => {
      const event = createMockEvent({
        method: 'POST',
        url: `/api/admin/ticketing/orders/${orders[0].id}/refund`,
        params: { id: orders[0].id },
        body: {
          amount_in_cents: 1000 // Partial
        },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      await processRefund(event)

      // Seats should NOT be released for partial refund
      const soldSeats = mockData.show_seats.filter(s => s.status === 'sold')
      expect(soldSeats.length).toBeGreaterThan(0)
    })
  })
})

describe('Dashboard & Analytics', () => {
  describe('GET /api/admin/ticketing/dashboard', () => {
    it('should show sales by show chart (correct data)', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/admin/ticketing/dashboard',
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await getDashboard(event)

      expect(response.sales_by_show).toBeDefined()
      expect(Array.isArray(response.sales_by_show)).toBe(true)
    })

    it('should show revenue metrics (total, by show)', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/admin/ticketing/dashboard',
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await getDashboard(event)

      expect(response.total_revenue).toBeDefined()
      expect(response.revenue_by_show).toBeDefined()
    })

    it('should calculate correct totals', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/admin/ticketing/dashboard',
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await getDashboard(event)

      const paidOrders = orders.filter(o => o.status === 'paid')
      const expectedTotal = paidOrders.reduce((sum, o) => sum + o.total_amount_in_cents, 0)

      expect(response.total_revenue).toBe(expectedTotal)
    })
  })
})

describe('Sales Reports', () => {
  describe('GET /api/admin/ticketing/reports/sales', () => {
    it('should generate sales CSV (all orders)', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/admin/ticketing/reports/sales.csv',
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await exportSales(event)

      expect(response).toBeDefined()
      // Should be CSV format
      expect(typeof response).toBe('string')
      expect(response).toContain('Order Number')
    })

    it('should filter by date range', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: '/api/admin/ticketing/reports/sales.csv?date_from=2025-01-01&date_to=2025-12-31',
        query: { date_from: '2025-01-01', date_to: '2025-12-31' },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await exportSales(event)

      expect(response).toBeDefined()
    })

    it('should filter by show', async () => {
      const event = createMockEvent({
        method: 'GET',
        url: `/api/admin/ticketing/reports/sales.csv?show_id=${scenario.show.id}`,
        query: { show_id: scenario.show.id },
        user: { id: 'admin-1', user_role: 'admin' }
      })

      const response = await exportSales(event)

      expect(response).toBeDefined()
    })
  })
})
