import { defineStore } from 'pinia'
import type { CartItem, ShoppingCart } from '~/types/merchandise'

interface CartState {
  items: CartItem[]
  loading: boolean
  error: string | null
}

const CART_STORAGE_KEY = 'studio_merchandise_cart'

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    items: [],
    loading: false,
    error: null
  }),

  getters: {
    /**
     * Get total number of items in cart
     */
    itemCount: (state): number => {
      return state.items.reduce((total, item) => total + item.quantity, 0)
    },

    /**
     * Get total number of unique products in cart
     */
    uniqueItemCount: (state): number => {
      return state.items.length
    },

    /**
     * Calculate subtotal in cents
     */
    subtotalInCents: (state): number => {
      return state.items.reduce((total, item) => {
        return total + (item.unit_price_in_cents * item.quantity)
      }, 0)
    },

    /**
     * Calculate tax (simple 8% tax rate - should be configurable)
     */
    taxInCents: (state): number => {
      const subtotal = state.items.reduce((total, item) => {
        return total + (item.unit_price_in_cents * item.quantity)
      }, 0)
      return Math.round(subtotal * 0.08)
    },

    /**
     * Calculate shipping cost (free for pickup, flat rate for shipping)
     */
    shippingCostInCents: () => (fulfillmentMethod: 'pickup' | 'shipping'): number => {
      return fulfillmentMethod === 'shipping' ? 1000 : 0 // $10 flat rate shipping
    },

    /**
     * Calculate total in cents
     */
    totalInCents: (state): number => {
      const subtotal = state.items.reduce((total, item) => {
        return total + (item.unit_price_in_cents * item.quantity)
      }, 0)
      const tax = Math.round(subtotal * 0.08)
      // Default to pickup if calculating total without fulfillment method selected
      return subtotal + tax
    },

    /**
     * Calculate total with fulfillment method
     */
    totalWithFulfillment: (state) => (fulfillmentMethod: 'pickup' | 'shipping'): number => {
      const subtotal = state.items.reduce((total, item) => {
        return total + (item.unit_price_in_cents * item.quantity)
      }, 0)
      const tax = Math.round(subtotal * 0.08)
      const shipping = fulfillmentMethod === 'shipping' ? 1000 : 0
      return subtotal + tax + shipping
    },

    /**
     * Get cart summary
     */
    cartSummary: (state): ShoppingCart => {
      const subtotal = state.items.reduce((total, item) => {
        return total + (item.unit_price_in_cents * item.quantity)
      }, 0)
      const tax = Math.round(subtotal * 0.08)

      return {
        items: state.items,
        subtotal_in_cents: subtotal,
        tax_in_cents: tax,
        shipping_cost_in_cents: 0, // Will be calculated at checkout based on fulfillment method
        total_in_cents: subtotal + tax
      }
    },

    /**
     * Check if cart is empty
     */
    isEmpty: (state): boolean => state.items.length === 0,

    /**
     * Get item by variant ID
     */
    getItemByVariantId: (state) => (variantId: string): CartItem | undefined => {
      return state.items.find(item => item.variant_id === variantId)
    },

    /**
     * Check if item exists in cart
     */
    hasItem: (state) => (variantId: string): boolean => {
      return state.items.some(item => item.variant_id === variantId)
    }
  },

  actions: {
    /**
     * Initialize cart from localStorage
     */
    initializeCart() {
      if (import.meta.client) {
        try {
          const savedCart = localStorage.getItem(CART_STORAGE_KEY)
          if (savedCart) {
            const parsed = JSON.parse(savedCart)
            this.items = parsed.items || []
          }
        } catch (error) {
          console.error('Error loading cart from localStorage:', error)
          this.items = []
        }
      }
    },

    /**
     * Save cart to localStorage
     */
    saveCart() {
      if (import.meta.client) {
        try {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
            items: this.items,
            updatedAt: new Date().toISOString()
          }))
        } catch (error) {
          console.error('Error saving cart to localStorage:', error)
        }
      }
    },

    /**
     * Add item to cart
     */
    addItem(item: CartItem) {
      const existingItem = this.items.find(i => i.variant_id === item.variant_id)

      if (existingItem) {
        // Update quantity if item already exists
        const newQuantity = existingItem.quantity + item.quantity
        if (newQuantity <= item.max_quantity) {
          existingItem.quantity = newQuantity
        } else {
          existingItem.quantity = item.max_quantity
          this.error = `Cannot add more than ${item.max_quantity} of this item`
        }
      } else {
        // Add new item
        this.items.push({ ...item })
      }

      this.saveCart()
    },

    /**
     * Remove item from cart
     */
    removeItem(variantId: string) {
      const index = this.items.findIndex(item => item.variant_id === variantId)
      if (index > -1) {
        this.items.splice(index, 1)
        this.saveCart()
      }
    },

    /**
     * Update item quantity
     */
    updateQuantity(variantId: string, quantity: number) {
      const item = this.items.find(i => i.variant_id === variantId)
      if (!item) return

      if (quantity <= 0) {
        this.removeItem(variantId)
      } else if (quantity <= item.max_quantity) {
        item.quantity = quantity
        this.saveCart()
      } else {
        this.error = `Cannot add more than ${item.max_quantity} of this item`
      }
    },

    /**
     * Clear all items from cart
     */
    clearCart() {
      this.items = []
      this.error = null
      this.saveCart()
    },

    /**
     * Clear error message
     */
    clearError() {
      this.error = null
    },

    /**
     * Validate cart items against current inventory
     * This should be called before checkout to ensure items are still available
     */
    async validateCart(): Promise<boolean> {
      // TODO: Implement API call to validate cart items
      // This would check if items are still in stock and prices haven't changed
      return true
    }
  }
})
