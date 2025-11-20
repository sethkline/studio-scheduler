/**
 * Reservation Expiration Tests
 *
 * Tests the automated cleanup of expired reservations
 * and proper seat release back to available pool
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'
import { createClient } from '@supabase/supabase-js'

describe('Reservation Expiration', () => {
  let supabaseClient: ReturnType<typeof createClient>

  beforeAll(async () => {
    await setup({
      server: true
    })

    // Initialize Supabase client for direct database access
    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
  })

  describe('Automatic Cleanup Function', () => {
    it('should release seats from expired reservations', async () => {
      // Create a reservation
      const reservation = await $fetch('/api/seat-reservations/reserve-v2', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          seat_ids: ['test-seat-id'],
          email: 'user@example.com'
        }
      })

      expect(reservation.success).toBe(true)
      const reservationId = reservation.reservation!.id

      // Manually set expiration to past (simulate expired reservation)
      await supabaseClient
        .from('seat_reservations')
        .update({
          expires_at: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
        })
        .eq('id', reservationId)

      // Run cleanup function
      const { data: cleanupResult } = await supabaseClient
        .rpc('cleanup_expired_seat_reservations')

      // Verify cleanup ran
      expect(cleanupResult).toBeDefined()

      // Verify reservation is now inactive
      const { data: updatedReservation } = await supabaseClient
        .from('seat_reservations')
        .select('is_active')
        .eq('id', reservationId)
        .single()

      expect(updatedReservation?.is_active).toBe(false)

      // Verify seat is back to available
      const { data: seat } = await supabaseClient
        .from('show_seats')
        .select('status, reserved_by, reserved_until')
        .eq('id', 'test-seat-id')
        .single()

      expect(seat?.status).toBe('available')
      expect(seat?.reserved_by).toBeNull()
      expect(seat?.reserved_until).toBeNull()
    })

    it('should not release active reservations that have not expired', async () => {
      // Create a reservation
      const reservation = await $fetch('/api/seat-reservations/reserve-v2', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          seat_ids: ['test-seat-id-2'],
          email: 'user@example.com'
        }
      })

      const reservationId = reservation.reservation!.id

      // Run cleanup function (reservation is not expired)
      await supabaseClient.rpc('cleanup_expired_seat_reservations')

      // Verify reservation is still active
      const { data: stillActiveReservation } = await supabaseClient
        .from('seat_reservations')
        .select('is_active')
        .eq('id', reservationId)
        .single()

      expect(stillActiveReservation?.is_active).toBe(true)

      // Verify seat is still reserved
      const { data: seat } = await supabaseClient
        .from('show_seats')
        .select('status')
        .eq('id', 'test-seat-id-2')
        .single()

      expect(seat?.status).toBe('reserved')
    })

    it('should return correct statistics from cleanup function', async () => {
      // Create 3 expired reservations
      const reservations = await Promise.all([
        $fetch('/api/seat-reservations/reserve-v2', {
          method: 'POST',
          body: {
            show_id: 'test-show-id',
            seat_ids: ['seat-1'],
            email: 'user1@example.com'
          }
        }),
        $fetch('/api/seat-reservations/reserve-v2', {
          method: 'POST',
          body: {
            show_id: 'test-show-id',
            seat_ids: ['seat-2'],
            email: 'user2@example.com'
          }
        }),
        $fetch('/api/seat-reservations/reserve-v2', {
          method: 'POST',
          body: {
            show_id: 'test-show-id',
            seat_ids: ['seat-3'],
            email: 'user3@example.com'
          }
        })
      ])

      // Expire all three
      const reservationIds = reservations.map(r => r.reservation!.id)
      await supabaseClient
        .from('seat_reservations')
        .update({
          expires_at: new Date(Date.now() - 1000).toISOString()
        })
        .in('id', reservationIds)

      // Run cleanup
      const { data: result } = await supabaseClient
        .rpc('cleanup_expired_seat_reservations')

      // Verify statistics
      const stats = result?.[0]
      expect(stats.total_reservations_expired).toBeGreaterThanOrEqual(3)
      expect(stats.total_seats_released).toBeGreaterThanOrEqual(3)
      expect(stats.reservation_ids.length).toBeGreaterThanOrEqual(3)
    })

    it('should log expiration events to audit log', async () => {
      // Create and expire a reservation
      const reservation = await $fetch('/api/seat-reservations/reserve-v2', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          seat_ids: ['test-seat-audit'],
          email: 'user@example.com'
        }
      })

      const reservationId = reservation.reservation!.id

      await supabaseClient
        .from('seat_reservations')
        .update({
          expires_at: new Date(Date.now() - 1000).toISOString()
        })
        .eq('id', reservationId)

      // Run cleanup
      await supabaseClient.rpc('cleanup_expired_seat_reservations')

      // Check audit log
      const { data: auditLogs } = await supabaseClient
        .from('seat_reservation_audit_log')
        .select('*')
        .eq('reservation_id', reservationId)
        .eq('event_type', 'expired')

      expect(auditLogs).toBeDefined()
      expect(auditLogs!.length).toBeGreaterThan(0)

      const expiredLog = auditLogs![0]
      expect(expiredLog.event_type).toBe('expired')
      expect(expiredLog.reservation_id).toBe(reservationId)
    })
  })

  describe('Expired Reservation Behavior', () => {
    it('should reject attempts to use expired reservation token', async () => {
      // Create a reservation
      const reservation = await $fetch('/api/seat-reservations/reserve-v2', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          seat_ids: ['test-seat-expired'],
          email: 'user@example.com'
        }
      })

      const token = reservation.reservation!.token

      // Expire it
      await supabaseClient
        .from('seat_reservations')
        .update({
          expires_at: new Date(Date.now() - 1000).toISOString()
        })
        .eq('reservation_token', token)

      // Try to create an order with expired reservation
      await expect(async () => {
        await $fetch('/api/ticket-orders/create', {
          method: 'POST',
          body: {
            show_id: 'test-show-id',
            reservation_token: token,
            customer_name: 'Test User',
            customer_email: 'user@example.com'
          }
        })
      }).rejects.toThrow()
    })

    it('should reject extension attempts on expired reservations', async () => {
      // Create and expire a reservation
      const reservation = await $fetch('/api/seat-reservations/reserve-v2', {
        method: 'POST',
        body: {
          show_id: 'test-show-id',
          seat_ids: ['test-seat-extend-expired'],
          email: 'user@example.com'
        }
      })

      const token = reservation.reservation!.token

      await supabaseClient
        .from('seat_reservations')
        .update({
          expires_at: new Date(Date.now() - 1000).toISOString()
        })
        .eq('reservation_token', token)

      // Try to extend
      await expect(async () => {
        await $fetch(`/api/seat-reservations/${token}/extend`, {
          method: 'POST'
        })
      }).rejects.toThrow()
    })
  })

  describe('Cleanup Performance', () => {
    it('should handle cleanup of many expired reservations efficiently', async () => {
      // Create 50 expired reservations
      const reservations = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          $fetch('/api/seat-reservations/reserve-v2', {
            method: 'POST',
            body: {
              show_id: 'test-show-id',
              seat_ids: [`perf-seat-${i}`],
              email: `user${i}@example.com`
            }
          })
        )
      )

      // Expire all
      const reservationIds = reservations.map(r => r.reservation!.id)
      await supabaseClient
        .from('seat_reservations')
        .update({
          expires_at: new Date(Date.now() - 1000).toISOString()
        })
        .in('id', reservationIds)

      // Measure cleanup time
      const startTime = Date.now()
      await supabaseClient.rpc('cleanup_expired_seat_reservations')
      const duration = Date.now() - startTime

      // Should complete in reasonable time (< 5 seconds for 50 reservations)
      expect(duration).toBeLessThan(5000)
    })
  })
})
