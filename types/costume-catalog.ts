/**
 * Costume Catalog Types
 *
 * Type definitions for the costume catalog system including vendors,
 * costumes, and performance assignments.
 *
 * NOTE: This is separate from /types/costumes.ts which handles
 * studio-owned costume inventory and rentals. This file handles
 * vendor costume catalogs for purchasing/ordering.
 */

// =====================================================
// VENDOR TYPES
// =====================================================

export interface Vendor {
  id: string
  name: string
  slug: string
  website_url?: string
  contact_email?: string
  contact_phone?: string
  is_active: boolean
  is_global: boolean
  sync_enabled: boolean
  last_sync_at?: string
  sync_frequency: 'daily' | 'weekly' | 'monthly' | 'manual'
  notes?: string
  created_at: string
  updated_at: string
}

export interface VendorSyncLog {
  id: string
  vendor_id: string
  started_at: string
  completed_at?: string
  status: 'running' | 'success' | 'failed' | 'partial'
  items_fetched: number
  items_created: number
  items_updated: number
  items_deactivated: number
  error_message?: string
  metadata: Record<string, any>
  vendor?: Vendor
}

// =====================================================
// COSTUME CATALOG TYPES
// =====================================================

export interface CatalogCostume {
  id: string
  vendor_id: string
  vendor_sku: string
  name: string
  category?: string // 'ballet', 'jazz', 'tap', 'lyrical', 'hip-hop', 'costume', 'accessory'
  description?: string
  season?: string
  gender?: string // 'girls', 'boys', 'unisex', 'adult-female', 'adult-male'
  price_cents?: number
  currency: string
  is_active: boolean
  availability: 'in_stock' | 'limited' | 'discontinued' | 'pre-order' | 'unknown'
  min_age?: number
  max_age?: number
  raw_source_id?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  // Relations
  vendor?: Vendor
  sizes?: CatalogCostumeSize[]
  colors?: CatalogCostumeColor[]
  images?: CatalogCostumeImage[]
}

export interface CatalogCostumeSize {
  id: string
  costume_id: string
  code: string // 'SC', 'IC', 'MC', 'LC', 'SA', 'IA', 'MA', 'LA', 'XLA'
  label: string // 'Small Child', 'Intermediate Child', etc.
  sort_order: number
  created_at: string
}

export interface CatalogCostumeColor {
  id: string
  costume_id: string
  name: string
  swatch_hex?: string
  sort_order: number
  created_at: string
}

export interface CatalogCostumeImage {
  id: string
  costume_id: string
  url: string
  storage_path?: string
  alt_text?: string
  sort_order: number
  is_primary: boolean
  created_at: string
}

// =====================================================
// PERFORMANCE COSTUME TYPES (Tenant-Scoped)
// =====================================================

export interface PerformanceCostume {
  id: string
  studio_id: string
  performance_id: string
  costume_id: string
  is_primary: boolean
  notes?: string
  quantity_needed?: number
  order_status: 'not_ordered' | 'pending' | 'ordered' | 'received'
  ordered_at?: string
  received_at?: string
  created_at: string
  updated_at: string
  // Relations
  costume?: CatalogCostume
  order_details?: CostumeOrderDetail[]
}

export interface CostumeOrderDetail {
  id: string
  performance_costume_id: string
  costume_size_id?: string
  costume_color_id?: string
  quantity: number
  student_id?: string
  notes?: string
  created_at: string
  updated_at: string
  // Relations
  size?: CatalogCostumeSize
  color?: CatalogCostumeColor
}

// =====================================================
// RAW DATA TYPES
// =====================================================

export interface RawVendorItem {
  id: string
  vendor_id: string
  vendor_sku: string
  payload: Record<string, any>
  source_url?: string
  storage_path?: string
  fetched_at: string
  processed: boolean
  processed_at?: string
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CostumeSearchParams {
  vendor_id?: string
  category?: string
  season?: string
  gender?: string
  search?: string
  min_price?: number
  max_price?: number
  min_age?: number
  max_age?: number
  availability?: string
  is_active?: boolean
  page?: number
  page_size?: number
}

export interface CostumeSearchResult {
  costumes: CatalogCostume[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AssignCostumeToPerformanceRequest {
  performance_id: string
  costume_id: string
  is_primary?: boolean
  notes?: string
  quantity_needed?: number
}

export interface CostumeImportRow {
  vendor_sku: string
  name: string
  category?: string
  description?: string
  season?: string
  gender?: string
  price?: number
  sizes?: string // Comma-separated: "SC,IC,MC"
  colors?: string // Comma-separated: "Black,Royal Blue"
  image_urls?: string // Comma-separated URLs
  availability?: string
}

export interface CostumeImportResult {
  total_rows: number
  imported: number
  updated: number
  errors: {
    row: number
    error: string
  }[]
}

// =====================================================
// SCRAPER TYPES (For future implementation)
// =====================================================

export interface RawCostumeData {
  vendorSku: string
  name: string
  category?: string
  description?: string
  sizes: string[]
  colors: string[]
  price?: number
  currency: string
  season?: string
  gender?: string
  mainImageUrl?: string
  extraImageUrls: string[]
  sourceUrl: string
  availability?: string
  raw: any
}

export interface NormalizedCostume {
  vendorSku: string
  name: string
  category?: string
  description?: string
  sizes: { code: string; label: string }[]
  colors: { name: string; swatchHex?: string }[]
  priceCents?: number
  currency: string
  season?: string
  gender?: string
  images: { url: string; alt?: string; sortOrder: number }[]
  availability: string
  metadata: Record<string, any>
}

// =====================================================
// UI STATE TYPES
// =====================================================

export interface CostumeFilters {
  vendor_id?: string
  category?: string
  season?: string
  gender?: string
  search?: string
  price_range?: [number, number]
  age_range?: [number, number]
  availability?: string[]
}

export interface CostumeSortOption {
  field: 'name' | 'price_cents' | 'season' | 'created_at'
  direction: 'asc' | 'desc'
}

// =====================================================
// CONSTANTS
// =====================================================

export const COSTUME_CATEGORIES = [
  { label: 'Ballet', value: 'ballet' },
  { label: 'Jazz', value: 'jazz' },
  { label: 'Tap', value: 'tap' },
  { label: 'Lyrical', value: 'lyrical' },
  { label: 'Contemporary', value: 'contemporary' },
  { label: 'Hip Hop', value: 'hip-hop' },
  { label: 'Musical Theater', value: 'musical-theater' },
  { label: 'Costume', value: 'costume' },
  { label: 'Accessory', value: 'accessory' },
] as const

export const COSTUME_GENDERS = [
  { label: 'Girls', value: 'girls' },
  { label: 'Boys', value: 'boys' },
  { label: 'Unisex', value: 'unisex' },
  { label: 'Adult Female', value: 'adult-female' },
  { label: 'Adult Male', value: 'adult-male' },
] as const

export const COSTUME_AVAILABILITIES = [
  { label: 'In Stock', value: 'in_stock', color: 'green' },
  { label: 'Limited', value: 'limited', color: 'orange' },
  { label: 'Pre-Order', value: 'pre-order', color: 'blue' },
  { label: 'Discontinued', value: 'discontinued', color: 'red' },
  { label: 'Unknown', value: 'unknown', color: 'gray' },
] as const

export const ORDER_STATUSES = [
  { label: 'Not Ordered', value: 'not_ordered', color: 'gray' },
  { label: 'Pending', value: 'pending', color: 'yellow' },
  { label: 'Ordered', value: 'ordered', color: 'blue' },
  { label: 'Received', value: 'received', color: 'green' },
] as const

// Standard size codes used across vendors
export const STANDARD_SIZE_CODES = [
  { code: 'SC', label: 'Small Child', sort: 1 },
  { code: 'IC', label: 'Intermediate Child', sort: 2 },
  { code: 'MC', label: 'Medium Child', sort: 3 },
  { code: 'LC', label: 'Large Child', sort: 4 },
  { code: 'XLC', label: 'X-Large Child', sort: 5 },
  { code: 'SA', label: 'Small Adult', sort: 6 },
  { code: 'IA', label: 'Intermediate Adult', sort: 7 },
  { code: 'MA', label: 'Medium Adult', sort: 8 },
  { code: 'LA', label: 'Large Adult', sort: 9 },
  { code: 'XLA', label: 'X-Large Adult', sort: 10 },
] as const
