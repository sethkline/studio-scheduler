/**
 * Costume Catalog Service Composable
 *
 * Provides methods for interacting with the costume catalog API
 */

import type {
  CostumeSearchParams,
  CostumeSearchResult,
  CatalogCostume,
  Vendor,
  PerformanceCostume,
  AssignCostumeToPerformanceRequest,
  CostumeImportRow,
  CostumeImportResult
} from '~/types/costume-catalog'

export function useCostumeCatalogService() {
  /**
   * Search and filter costume catalog
   */
  const searchCostumes = async (params: CostumeSearchParams = {}) => {
    return await useFetch<CostumeSearchResult>('/api/costume-catalog', {
      params
    })
  }

  /**
   * Get detailed information about a specific costume
   */
  const getCostume = async (id: string) => {
    return await useFetch<CatalogCostume>(`/api/costume-catalog/${id}`)
  }

  /**
   * Get all active vendors
   */
  const getVendors = async () => {
    return await useFetch<Vendor[]>('/api/costume-catalog/vendors')
  }

  /**
   * Assign a costume to a recital performance
   */
  const assignCostumeToPerformance = async (data: AssignCostumeToPerformanceRequest) => {
    return await useFetch<PerformanceCostume>('/api/costume-catalog/assignments', {
      method: 'POST',
      body: data
    })
  }

  /**
   * Get costume assignments for a performance
   */
  const getPerformanceCostumes = async (performanceId: string) => {
    return await useFetch<PerformanceCostume[]>(
      `/api/costume-catalog/assignments/${performanceId}`
    )
  }

  /**
   * Remove a costume assignment
   */
  const removePerformanceCostume = async (assignmentId: string) => {
    return await useFetch(`/api/costume-catalog/assignments/${assignmentId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Update a costume assignment
   */
  const updatePerformanceCostume = async (
    assignmentId: string,
    data: Partial<PerformanceCostume>
  ) => {
    return await useFetch<PerformanceCostume>(
      `/api/costume-catalog/assignments/${assignmentId}`,
      {
        method: 'PATCH',
        body: data
      }
    )
  }

  /**
   * Import costumes from CSV data (admin only)
   */
  const importCostumes = async (vendorSlug: string, csvData: CostumeImportRow[]) => {
    return await useFetch<CostumeImportResult>('/api/costume-catalog/admin/import', {
      method: 'POST',
      body: {
        vendor_slug: vendorSlug,
        csv_data: csvData
      }
    })
  }

  /**
   * Format price from cents to dollar string
   */
  const formatPrice = (priceCents?: number): string => {
    if (priceCents === null || priceCents === undefined) {
      return 'N/A'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(priceCents / 100)
  }

  /**
   * Get availability badge color
   */
  const getAvailabilityColor = (availability: string): string => {
    const colors: Record<string, string> = {
      in_stock: 'green',
      limited: 'orange',
      pre_order: 'blue',
      discontinued: 'red',
      unknown: 'gray'
    }
    return colors[availability] || 'gray'
  }

  /**
   * Get order status badge color
   */
  const getOrderStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      not_ordered: 'gray',
      pending: 'yellow',
      ordered: 'blue',
      received: 'green'
    }
    return colors[status] || 'gray'
  }

  return {
    // API Methods
    searchCostumes,
    getCostume,
    getVendors,
    assignCostumeToPerformance,
    getPerformanceCostumes,
    removePerformanceCostume,
    updatePerformanceCostume,
    importCostumes,
    
    // Utility Methods
    formatPrice,
    getAvailabilityColor,
    getOrderStatusColor
  }
}
