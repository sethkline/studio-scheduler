import { ref, computed } from 'vue'
import type { RecitalShow } from '~/types'

export interface ShowSeat {
  id: string
  seat_id: string
  section: string
  row_name: string
  seat_number: string
  price_in_cents: number
  handicap_access?: boolean
  section_type?: string
  status?: string
}

export interface CartItem {
  show_id: string
  show_name: string
  show_date: string
  show_time: string
  show_location?: string
  seats: ShowSeat[]
  reservation_token?: string
  reserved_until?: string
  added_at: string
}

export interface ShoppingCart {
  items: CartItem[]
  expires_at: string
}

const CART_STORAGE_KEY = 'studio_shopping_cart'
const CART_EXPIRY_DAYS = 7

export function useShoppingCart() {
  const cart = ref<ShoppingCart>(loadCart())
  const toast = useToast()

  /**
   * Load cart from localStorage
   */
  function loadCart(): ShoppingCart {
    if (process.server) {
      return { items: [], expires_at: getExpiryDate() }
    }

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (!stored) {
        return { items: [], expires_at: getExpiryDate() }
      }

      const parsed = JSON.parse(stored)

      // Check if expired
      if (new Date(parsed.expires_at) < new Date()) {
        localStorage.removeItem(CART_STORAGE_KEY)
        return { items: [], expires_at: getExpiryDate() }
      }

      return parsed
    } catch (error) {
      console.error('Failed to load cart:', error)
      return { items: [], expires_at: getExpiryDate() }
    }
  }

  /**
   * Save cart to localStorage
   */
  function saveCart() {
    if (process.server) return

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart.value))
    } catch (error) {
      console.error('Failed to save cart:', error)
    }
  }

  /**
   * Get expiry date (7 days from now)
   */
  function getExpiryDate(): string {
    const date = new Date()
    date.setDate(date.getDate() + CART_EXPIRY_DAYS)
    return date.toISOString()
  }

  /**
   * Add show to cart
   */
  function addToCart(show: RecitalShow, seats: ShowSeat[]) {
    // Check if show already in cart
    const existingIndex = cart.value.items.findIndex(
      item => item.show_id === show.id
    )

    if (existingIndex !== -1) {
      // Replace existing item
      cart.value.items[existingIndex] = {
        show_id: show.id,
        show_name: show.name,
        show_date: show.date,
        show_time: show.start_time,
        show_location: show.location,
        seats: seats,
        added_at: new Date().toISOString()
      }

      toast.add({
        severity: 'info',
        summary: 'Cart Updated',
        detail: `Updated tickets for ${show.name}`,
        life: 3000
      })
    } else {
      // Add new item
      cart.value.items.push({
        show_id: show.id,
        show_name: show.name,
        show_date: show.date,
        show_time: show.start_time,
        show_location: show.location,
        seats: seats,
        added_at: new Date().toISOString()
      })

      toast.add({
        severity: 'success',
        summary: 'Added to Cart',
        detail: `${seats.length} ticket${seats.length > 1 ? 's' : ''} for ${show.name}`,
        life: 3000
      })
    }

    saveCart()
  }

  /**
   * Remove show from cart
   */
  function removeFromCart(showId: string) {
    const item = cart.value.items.find(i => i.show_id === showId)

    cart.value.items = cart.value.items.filter(
      item => item.show_id !== showId
    )

    saveCart()

    if (item) {
      toast.add({
        severity: 'info',
        summary: 'Removed from Cart',
        detail: `Removed ${item.show_name}`,
        life: 3000
      })
    }
  }

  /**
   * Update seats for a show in cart
   */
  function updateCartItem(showId: string, seats: ShowSeat[]) {
    const index = cart.value.items.findIndex(i => i.show_id === showId)

    if (index !== -1) {
      cart.value.items[index].seats = seats
      saveCart()
    }
  }

  /**
   * Clear entire cart
   */
  function clearCart() {
    cart.value = { items: [], expires_at: getExpiryDate() }
    saveCart()

    toast.add({
      severity: 'info',
      summary: 'Cart Cleared',
      detail: 'All items removed',
      life: 3000
    })
  }

  /**
   * Get cart item count (total number of tickets across all shows)
   */
  const itemCount = computed(() => {
    return cart.value.items.reduce((sum, item) => sum + item.seats.length, 0)
  })

  /**
   * Get cart total (sum of all ticket prices)
   */
  const totalAmount = computed(() => {
    return cart.value.items.reduce((sum, item) => {
      const itemTotal = item.seats.reduce((seatSum, seat) => {
        return seatSum + (seat.price_in_cents || 0)
      }, 0)
      return sum + itemTotal
    }, 0)
  })

  /**
   * Get show count (number of different shows in cart)
   */
  const showCount = computed(() => cart.value.items.length)

  /**
   * Check if cart is empty
   */
  const isEmpty = computed(() => cart.value.items.length === 0)

  /**
   * Check if show is in cart
   */
  function isShowInCart(showId: string): boolean {
    return cart.value.items.some(item => item.show_id === showId)
  }

  /**
   * Get cart item for show
   */
  function getCartItem(showId: string): CartItem | undefined {
    return cart.value.items.find(item => item.show_id === showId)
  }

  return {
    // State
    cart: computed(() => cart.value),

    // Computed
    itemCount,
    totalAmount,
    showCount,
    isEmpty,

    // Methods
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    isShowInCart,
    getCartItem
  }
}
