// types/merchandise.ts

/**
 * Product Categories
 */
export type ProductCategory =
  | 'apparel'
  | 'accessories'
  | 'equipment'
  | 'gifts'
  | 'other'

/**
 * Order Status Values
 */
export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'completed'
  | 'cancelled'

/**
 * Payment Status Values
 */
export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'

/**
 * Fulfillment Method
 */
export type FulfillmentMethod =
  | 'pickup'
  | 'shipping'

/**
 * Merchandise Product
 */
export interface MerchandiseProduct {
  id: string
  name: string
  description?: string
  category: ProductCategory
  base_price_in_cents: number
  image_url?: string
  additional_images?: string[]
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  variants?: MerchandiseVariant[]
}

/**
 * Merchandise Product Variant (size/color)
 */
export interface MerchandiseVariant {
  id: string
  product_id: string
  sku?: string
  size?: string
  color?: string
  price_adjustment_in_cents: number
  is_available: boolean
  created_at: string
  updated_at: string
  product?: MerchandiseProduct
  inventory?: MerchandiseInventory
}

/**
 * Merchandise Inventory
 */
export interface MerchandiseInventory {
  id: string
  variant_id: string
  quantity_on_hand: number
  quantity_reserved: number
  low_stock_threshold: number
  created_at: string
  updated_at: string
  variant?: MerchandiseVariant
}

/**
 * Shipping Address
 */
export interface ShippingAddress {
  street: string
  street2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

/**
 * Merchandise Order
 */
export interface MerchandiseOrder {
  id: string
  user_id?: string
  order_number: string
  customer_name: string
  email: string
  phone?: string
  subtotal_in_cents: number
  tax_in_cents: number
  shipping_cost_in_cents: number
  total_in_cents: number
  payment_method: string
  payment_intent_id?: string
  payment_status: PaymentStatus
  fulfillment_method: FulfillmentMethod
  shipping_address?: ShippingAddress
  order_status: OrderStatus
  order_date: string
  notes?: string
  created_at: string
  updated_at: string
  items?: MerchandiseOrderItem[]
}

/**
 * Product Snapshot (stored in order items)
 */
export interface ProductSnapshot {
  product_name: string
  product_description?: string
  variant_size?: string
  variant_color?: string
  variant_sku?: string
  image_url?: string
}

/**
 * Merchandise Order Item
 */
export interface MerchandiseOrderItem {
  id: string
  order_id: string
  variant_id: string
  product_snapshot: ProductSnapshot
  quantity: number
  unit_price_in_cents: number
  total_price_in_cents: number
  created_at: string
  updated_at: string
  variant?: MerchandiseVariant
}

/**
 * Shopping Cart Item (client-side only)
 */
export interface CartItem {
  variant_id: string
  product_id: string
  product_name: string
  variant_size?: string
  variant_color?: string
  quantity: number
  unit_price_in_cents: number
  image_url?: string
  max_quantity: number // Available stock
}

/**
 * Shopping Cart State (client-side only)
 */
export interface ShoppingCart {
  items: CartItem[]
  subtotal_in_cents: number
  tax_in_cents: number
  shipping_cost_in_cents: number
  total_in_cents: number
}

/**
 * Checkout Form Data
 */
export interface CheckoutFormData {
  customer_name: string
  email: string
  phone?: string
  fulfillment_method: FulfillmentMethod
  shipping_address?: ShippingAddress
  notes?: string
}

/**
 * Product Filter Options
 */
export interface ProductFilters {
  category?: ProductCategory
  is_active?: boolean
  search?: string
  sort_by?: 'name' | 'price' | 'created_at'
  sort_direction?: 'asc' | 'desc'
}

/**
 * Order Filter Options
 */
export interface OrderFilters {
  user_id?: string
  email?: string
  payment_status?: PaymentStatus
  order_status?: OrderStatus
  start_date?: string
  end_date?: string
  sort_by?: 'order_date' | 'total_in_cents'
  sort_direction?: 'asc' | 'desc'
}

/**
 * Product with Variants and Inventory (expanded)
 */
export interface ProductWithDetails extends MerchandiseProduct {
  variants: (MerchandiseVariant & {
    inventory: MerchandiseInventory
  })[]
}

/**
 * Order with Items (expanded)
 */
export interface OrderWithItems extends MerchandiseOrder {
  items: (MerchandiseOrderItem & {
    variant: MerchandiseVariant & {
      product: MerchandiseProduct
    }
  })[]
}

/**
 * Inventory Stats
 */
export interface InventoryStats {
  total_products: number
  low_stock_items: number
  out_of_stock_items: number
  total_value_in_cents: number
}

/**
 * Sales Stats
 */
export interface SalesStats {
  total_orders: number
  total_revenue_in_cents: number
  pending_orders: number
  completed_orders: number
}
