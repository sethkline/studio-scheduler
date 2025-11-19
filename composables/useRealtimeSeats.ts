// composables/useRealtimeSeats.ts
import { ref, onUnmounted } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ShowSeat } from '~/types/ticketing'

/**
 * Real-time seat status callback
 */
export type SeatUpdateCallback = (seat: ShowSeat, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void

/**
 * Connection status types
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error'

/**
 * Composable for managing real-time seat updates via Supabase
 *
 * Features:
 * - Subscribe to seat status changes for a specific show
 * - Handle connection drops and reconnection
 * - Automatic cleanup on component unmount
 * - Connection status monitoring
 */
export function useRealtimeSeats(showId: string) {
  const client = useSupabaseClient()
  const toast = useToast()

  // State
  const channel = ref<RealtimeChannel | null>(null)
  const isSubscribed = ref(false)
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 2000 // 2 seconds

  // Callbacks
  let onSeatUpdateCallback: SeatUpdateCallback | null = null
  let onConnectionChangeCallback: ((status: ConnectionStatus) => void) | null = null

  /**
   * Subscribe to real-time seat updates for the show
   */
  const subscribe = (onUpdate: SeatUpdateCallback, onConnectionChange?: (status: ConnectionStatus) => void) => {
    if (isSubscribed.value) {
      console.warn('[useRealtimeSeats] Already subscribed to show:', showId)
      return
    }

    onSeatUpdateCallback = onUpdate
    onConnectionChangeCallback = onConnectionChange || null

    try {
      // Create channel for this show
      const channelName = `show_seats:${showId}`

      console.log('[useRealtimeSeats] Creating channel:', channelName)

      channel.value = client
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'show_seats',
            filter: `show_id=eq.${showId}`
          },
          (payload) => {
            console.log('[useRealtimeSeats] Received update:', payload)

            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
            const seat = payload.new as ShowSeat

            // Call the update callback
            if (onSeatUpdateCallback) {
              onSeatUpdateCallback(seat, eventType)
            }
          }
        )
        .subscribe((status) => {
          console.log('[useRealtimeSeats] Subscription status:', status)

          if (status === 'SUBSCRIBED') {
            isSubscribed.value = true
            connectionStatus.value = 'connected'
            reconnectAttempts.value = 0

            if (onConnectionChangeCallback) {
              onConnectionChangeCallback('connected')
            }

            console.log('[useRealtimeSeats] Successfully subscribed to show:', showId)
          } else if (status === 'CHANNEL_ERROR') {
            connectionStatus.value = 'error'

            if (onConnectionChangeCallback) {
              onConnectionChangeCallback('error')
            }

            // Attempt reconnection
            handleReconnect()
          } else if (status === 'TIMED_OUT') {
            connectionStatus.value = 'disconnected'

            if (onConnectionChangeCallback) {
              onConnectionChangeCallback('disconnected')
            }

            // Attempt reconnection
            handleReconnect()
          } else if (status === 'CLOSED') {
            isSubscribed.value = false
            connectionStatus.value = 'disconnected'

            if (onConnectionChangeCallback) {
              onConnectionChangeCallback('disconnected')
            }
          }
        })
    } catch (error) {
      console.error('[useRealtimeSeats] Subscription error:', error)
      connectionStatus.value = 'error'

      if (onConnectionChangeCallback) {
        onConnectionChangeCallback('error')
      }

      toast.add({
        severity: 'error',
        summary: 'Connection Error',
        detail: 'Failed to connect to real-time updates',
        life: 5000
      })
    }
  }

  /**
   * Handle reconnection attempts
   */
  const handleReconnect = () => {
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      console.error('[useRealtimeSeats] Max reconnection attempts reached')
      connectionStatus.value = 'error'

      toast.add({
        severity: 'error',
        summary: 'Connection Lost',
        detail: 'Unable to reconnect to real-time updates. Please refresh the page.',
        life: 10000
      })

      return
    }

    reconnectAttempts.value++
    connectionStatus.value = 'reconnecting'

    if (onConnectionChangeCallback) {
      onConnectionChangeCallback('reconnecting')
    }

    console.log('[useRealtimeSeats] Reconnecting... Attempt', reconnectAttempts.value)

    // Wait before attempting reconnection
    setTimeout(() => {
      // Unsubscribe first
      if (channel.value) {
        channel.value.unsubscribe()
        channel.value = null
      }

      // Resubscribe
      if (onSeatUpdateCallback) {
        subscribe(onSeatUpdateCallback, onConnectionChangeCallback || undefined)
      }
    }, reconnectDelay * reconnectAttempts.value) // Exponential backoff
  }

  /**
   * Unsubscribe from real-time updates
   */
  const unsubscribe = async () => {
    if (!channel.value) {
      return
    }

    console.log('[useRealtimeSeats] Unsubscribing from show:', showId)

    try {
      await channel.value.unsubscribe()
      channel.value = null
      isSubscribed.value = false
      connectionStatus.value = 'disconnected'

      console.log('[useRealtimeSeats] Successfully unsubscribed')
    } catch (error) {
      console.error('[useRealtimeSeats] Unsubscribe error:', error)
    }
  }

  /**
   * Manually trigger reconnection
   */
  const reconnect = () => {
    console.log('[useRealtimeSeats] Manual reconnection triggered')
    reconnectAttempts.value = 0
    handleReconnect()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    console.log('[useRealtimeSeats] Component unmounting, cleaning up subscription')
    unsubscribe()
  })

  return {
    // State
    isSubscribed,
    connectionStatus,
    reconnectAttempts,

    // Methods
    subscribe,
    unsubscribe,
    reconnect
  }
}
