import type {
  MerchandiseProduct,
  ProductWithDetails,
  MerchandiseOrder,
  OrderWithItems,
  ProductFilters,
  OrderFilters,
  CheckoutFormData,
  CartItem
} from '~/types/merchandise'

export function useMerchandiseService() {
  /**
   * PRODUCT OPERATIONS
   */

  /**
   * Fetch all products with optional filters
   */
  const fetchProducts = async (filters?: ProductFilters) => {
    return await useFetch<{ products: MerchandiseProduct[], total: number }>('/api/merchandise/products', {
      params: filters
    })
  }

  /**
   * Fetch a single product by ID with variants and inventory
   */
  const fetchProduct = async (id: string) => {
    return await useFetch<ProductWithDetails>(`/api/merchandise/products/${id}`)
  }

  /**
   * Create a new product (admin only)
   */
  const createProduct = async (productData: Partial<MerchandiseProduct>) => {
    return await useFetch<MerchandiseProduct>('/api/merchandise/products', {
      method: 'POST',
      body: productData
    })
  }

  /**
   * Update an existing product (admin only)
   */
  const updateProduct = async (id: string, productData: Partial<MerchandiseProduct>) => {
    return await useFetch<MerchandiseProduct>(`/api/merchandise/products/${id}`, {
      method: 'PUT',
      body: productData
    })
  }

  /**
   * Delete a product (admin only)
   */
  const deleteProduct = async (id: string) => {
    return await useFetch(`/api/merchandise/products/${id}`, {
      method: 'DELETE'
    })
  }

  /**
   * VARIANT OPERATIONS
   */

  /**
   * Create a product variant
   */
  const createVariant = async (productId: string, variantData: any) => {
    return await useFetch(`/api/merchandise/products/${productId}/variants`, {
      method: 'POST',
      body: variantData
    })
  }

  /**
   * Update a product variant
   */
  const updateVariant = async (variantId: string, variantData: any) => {
    return await useFetch(`/api/merchandise/variants/${variantId}`, {
      method: 'PUT',
      body: variantData
    })
  }

  /**
   * Delete a product variant
   */
  const deleteVariant = async (variantId: string) => {
    return await useFetch(`/api/merchandise/variants/${variantId}`, {
      method: 'DELETE'
    })
  }

  /**
   * INVENTORY OPERATIONS
   */

  /**
   * Update inventory for a variant
   */
  const updateInventory = async (variantId: string, inventoryData: {
    quantity_on_hand?: number
    quantity_reserved?: number
    low_stock_threshold?: number
  }) => {
    return await useFetch(`/api/merchandise/inventory/${variantId}`, {
      method: 'PUT',
      body: inventoryData
    })
  }

  /**
   * Get inventory status for all variants
   */
  const fetchInventoryStatus = async () => {
    return await useFetch('/api/merchandise/inventory')
  }

  /**
   * ORDER OPERATIONS
   */

  /**
   * Fetch orders with optional filters
   */
  const fetchOrders = async (filters?: OrderFilters) => {
    return await useFetch<{ orders: MerchandiseOrder[], total: number }>('/api/merchandise/orders', {
      params: filters
    })
  }

  /**
   * Fetch a single order by ID with items
   */
  const fetchOrder = async (id: string) => {
    return await useFetch<OrderWithItems>(`/api/merchandise/orders/${id}`)
  }

  /**
   * Fetch orders for current user
   */
  const fetchMyOrders = async () => {
    return await useFetch<{ orders: OrderWithItems[] }>('/api/merchandise/orders/my-orders')
  }

  /**
   * Create a new order (checkout)
   */
  const createOrder = async (orderData: {
    items: CartItem[]
    checkout: CheckoutFormData
  }) => {
    return await useFetch<{ order: MerchandiseOrder }>('/api/merchandise/orders', {
      method: 'POST',
      body: orderData
    })
  }

  /**
   * Update order status (admin only)
   */
  const updateOrderStatus = async (id: string, status: string) => {
    return await useFetch(`/api/merchandise/orders/${id}/status`, {
      method: 'PUT',
      body: { status }
    })
  }

  /**
   * Cancel an order
   */
  const cancelOrder = async (id: string) => {
    return await useFetch(`/api/merchandise/orders/${id}/cancel`, {
      method: 'POST'
    })
  }

  /**
   * CHECKOUT OPERATIONS
   */

  /**
   * Create a payment intent for checkout
   */
  const createPaymentIntent = async (amount: number, orderData: any) => {
    return await useFetch('/api/merchandise/checkout/create-payment-intent', {
      method: 'POST',
      body: { amount, orderData }
    })
  }

  /**
   * Confirm payment and complete order
   */
  const confirmPayment = async (paymentIntentId: string, orderData: any) => {
    return await useFetch('/api/merchandise/checkout/confirm', {
      method: 'POST',
      body: { paymentIntentId, orderData }
    })
  }

  /**
   * STATISTICS & REPORTING
   */

  /**
   * Get sales statistics
   */
  const fetchSalesStats = async (startDate?: string, endDate?: string) => {
    return await useFetch('/api/merchandise/stats/sales', {
      params: { startDate, endDate }
    })
  }

  /**
   * Get inventory statistics
   */
  const fetchInventoryStats = async () => {
    return await useFetch('/api/merchandise/stats/inventory')
  }

  /**
   * Get top selling products
   */
  const fetchTopProducts = async (limit: number = 10) => {
    return await useFetch('/api/merchandise/stats/top-products', {
      params: { limit }
    })
  }

  return {
    // Products
    fetchProducts,
    fetchProduct,
    createProduct,
    updateProduct,
    deleteProduct,

    // Variants
    createVariant,
    updateVariant,
    deleteVariant,

    // Inventory
    updateInventory,
    fetchInventoryStatus,

    // Orders
    fetchOrders,
    fetchOrder,
    fetchMyOrders,
    createOrder,
    updateOrderStatus,
    cancelOrder,

    // Checkout
    createPaymentIntent,
    confirmPayment,

    // Stats
    fetchSalesStats,
    fetchInventoryStats,
    fetchTopProducts
  }
}
