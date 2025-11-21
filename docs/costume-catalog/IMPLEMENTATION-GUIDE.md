# Costume Catalog Integration - Implementation Guide

**Date:** 2025-01-20  
**Phase:** Phase 1 - Foundation Complete  
**Status:** ✅ Ready for Testing

---

## Executive Summary

The costume catalog system allows dance studios to browse vendor costume catalogs, assign costumes to recital performances, and manage orders. This Phase 1 implementation provides the foundation with database schema, import functionality, and catalog browsing.

### What Was Implemented

✅ **Database Schema** - Multi-tenant architecture with RLS policies  
✅ **Type Definitions** - TypeScript types for costume catalog  
✅ **API Endpoints** - RESTful API for costumes, vendors, and assignments  
✅ **Import System** - CSV import with validation and error handling  
✅ **Catalog Browser** - Search, filter, and view costumes  
✅ **Sample Data** - 5 vendors + 60 sample costumes

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     COSTUME CATALOG SYSTEM                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐      ┌──────────────┐      ┌─────────────┐ │
│  │   Global   │      │  Tenant      │      │  Import/    │ │
│  │  Catalog   │─────▶│  Scoped      │◀─────│  Sync       │ │
│  │            │      │  Assignments │      │  System     │ │
│  └────────────┘      └──────────────┘      └─────────────┘ │
│       │                     │                      │        │
│       ▼                     ▼                      ▼        │
│  ┌────────────┐      ┌──────────────┐      ┌─────────────┐ │
│  │  Vendors   │      │ Performance  │      │   Raw Data  │ │
│  │  Costumes  │      │  Costumes    │      │   Storage   │ │
│  │  Sizes     │      │  Order       │      │   Sync Logs │ │
│  │  Colors    │      │  Details     │      │             │ │
│  │  Images    │      │              │      │             │ │
│  └────────────┘      └──────────────┘      └─────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Decisions

1. **Multi-Tenant Architecture**
   - Global catalog shared across all studios
   - Tenant-scoped assignments via `studio_id`
   - RLS policies enforce data isolation

2. **Separate from Existing Costumes**
   - New endpoints: `/api/costume-catalog/*`
   - Existing costume rental system unchanged
   - Clear separation of concerns

3. **Import-First Approach**
   - CSV import before automated scraping
   - Most vendors provide dealer lists
   - Easier to implement and maintain

4. **Integration with Recitals**
   - Link to `recital_performances` table
   - Follows existing recital architecture
   - Natural workflow for studios

---

## Database Schema

### Tables Created

#### Core Tables

**`vendors`** - Costume vendor information
```sql
- id (PK)
- name, slug, website_url
- contact_email, contact_phone
- is_active, is_global
- sync_enabled, last_sync_at
- created_at, updated_at
```

**`costumes`** - Global costume catalog
```sql
- id (PK)
- vendor_id (FK → vendors)
- vendor_sku (unique with vendor_id)
- name, description, category
- season, gender
- price_cents, currency
- availability
- min_age, max_age
- metadata (JSONB)
- is_active
- created_at, updated_at
```

**`costume_sizes`** - Size variants
```sql
- id (PK)
- costume_id (FK → costumes)
- code (SC, IC, MC, etc.)
- label
- sort_order
```

**`costume_colors`** - Color variants
```sql
- id (PK)
- costume_id (FK → costumes)
- name
- swatch_hex
- sort_order
```

**`costume_images`** - Image gallery
```sql
- id (PK)
- costume_id (FK → costumes)
- url, storage_path
- alt_text
- sort_order, is_primary
```

#### Assignment Tables (Tenant-Scoped)

**`performance_costumes`** - Costume assignments
```sql
- id (PK)
- studio_id (FK → studios) ⚠️ TENANT ISOLATION
- performance_id (FK → recital_performances)
- costume_id (FK → costumes)
- is_primary
- notes
- quantity_needed
- order_status
- ordered_at, received_at
- created_at, updated_at
```

**`costume_order_details`** - Size/color tracking
```sql
- id (PK)
- performance_costume_id (FK → performance_costumes)
- costume_size_id (FK → costume_sizes)
- costume_color_id (FK → costume_colors)
- quantity
- student_id (FK → students)
- notes
```

#### Supporting Tables

**`raw_vendor_items`** - Raw import data
```sql
- id (PK)
- vendor_id (FK → vendors)
- vendor_sku
- payload (JSONB)
- source_url, storage_path
- fetched_at
- processed, processed_at
```

**`vendor_sync_logs`** - Sync history
```sql
- id (PK)
- vendor_id (FK → vendors)
- started_at, completed_at
- status
- items_fetched, items_created, items_updated
- error_message
- metadata (JSONB)
```

### RLS Policies

**Global Catalog** - Public read access
- Vendors, costumes, sizes, colors, images
- Readable by all authenticated users
- Public can view active items (for ticket pages)

**Tenant-Scoped** - Studio isolation
- `performance_costumes` checks `studio_id`
- Users can only access their studio's assignments
- Admin/staff can manage within their studio

**Management** - Admin/staff only
- Create/update vendors
- Import costumes
- View raw data and sync logs

---

## API Endpoints

### Costume Catalog

**`GET /api/costume-catalog`**  
Search and filter costume catalog

Query params:
- `vendor_id` - Filter by vendor
- `category` - ballet, jazz, tap, etc.
- `season` - 2025, Spring 2025, etc.
- `gender` - girls, boys, unisex
- `search` - Search name/SKU/description
- `min_price`, `max_price` - Price range (cents)
- `min_age`, `max_age` - Age range
- `availability` - in_stock, limited, etc.
- `is_active` - true/false (default: true)
- `page`, `page_size` - Pagination

Response:
```typescript
{
  costumes: CatalogCostume[],
  total: number,
  page: number,
  page_size: number,
  total_pages: number
}
```

**`GET /api/costume-catalog/[id]`**  
Get costume details with sizes, colors, images

**`GET /api/costume-catalog/vendors`**  
List all active vendors

### Assignments

**`POST /api/costume-catalog/assignments`**  
Assign costume to performance

Body:
```typescript
{
  performance_id: string,
  costume_id: string,
  is_primary?: boolean,
  notes?: string,
  quantity_needed?: number
}
```

**`GET /api/costume-catalog/assignments/[performanceId]`**  
Get all costumes for a performance

### Admin

**`POST /api/costume-catalog/admin/import`**  
Import costumes from CSV

Body:
```typescript
{
  vendor_slug: string,
  csv_data: CostumeImportRow[]
}
```

Response:
```typescript
{
  total_rows: number,
  imported: number,
  updated: number,
  errors: { row: number, error: string }[]
}
```

---

## Frontend Components

### Pages

**`/pages/admin/costume-catalog/index.vue`**  
Main catalog browser with:
- Search and filters (vendor, category, gender, season)
- Grid view with images
- Pagination
- Detail modal with full costume info
- Galleria for multiple images

**`/pages/admin/costume-catalog/import.vue`**  
CSV import interface with:
- Vendor selection dropdown
- File upload with validation
- CSV preview (first 5 rows)
- Import progress and results
- Error reporting

### Composables

**`/composables/useCostumeCatalogService.ts`**  
Service methods for:
- `searchCostumes()` - Search with filters
- `getCostume()` - Get single costume
- `getVendors()` - List vendors
- `assignCostumeToPerformance()` - Create assignment
- `getPerformanceCostumes()` - List assignments
- `importCostumes()` - Admin CSV import
- `formatPrice()` - Utility for price display
- `getAvailabilityColor()` - Badge colors
- `getOrderStatusColor()` - Status colors

### Types

**`/types/costume-catalog.ts`**  
Comprehensive type definitions:
- `Vendor`, `VendorSyncLog`
- `CatalogCostume`, `CatalogCostumeSize`, `CatalogCostumeColor`, `CatalogCostumeImage`
- `PerformanceCostume`, `CostumeOrderDetail`
- `RawVendorItem`
- `CostumeSearchParams`, `CostumeSearchResult`
- `CostumeImportRow`, `CostumeImportResult`
- Constants: `COSTUME_CATEGORIES`, `COSTUME_GENDERS`, `STANDARD_SIZE_CODES`

---

## Sample Data Provided

### Vendors (5)

1. **Revolution Dancewear** (`revolution`)
2. **Curtain Call Costumes** (`curtain-call`)
3. **Weissman** (`weissman`)
4. **Cicci Dance** (`cicci`)
5. **A Wish Come True** (`wish-come-true`)

### Costumes (60 across 3 CSV files)

- `sample-revolution-catalog.csv` - 20 items
- `sample-curtain-call-catalog.csv` - 20 items
- `sample-weissman-catalog.csv` - 20 items

**Categories covered:**
Ballet, Jazz, Tap, Lyrical, Contemporary, Hip Hop, Musical Theater, Accessories

**Price range:** $8.99 - $99.99

---

## Installation & Setup

### 1. Apply Migrations

```bash
# Via Supabase Dashboard SQL Editor
# Copy and run: supabase/migrations/20251120_001_create_costume_catalog.sql
# Copy and run: supabase/migrations/20251120_002_costume_catalog_rls.sql

# Or via Supabase CLI
supabase db push
```

### 2. Insert Sample Vendors

```bash
# In Supabase SQL Editor
# Run: docs/costume-catalog/sample-vendors.sql
```

### 3. Import Sample Catalog

1. Navigate to `/admin/costume-catalog/import`
2. Select vendor: "Revolution Dancewear"
3. Upload: `docs/costume-catalog/sample-revolution-catalog.csv`
4. Click "Import Costumes"
5. Verify 20 costumes imported

### 4. Browse Catalog

Navigate to `/admin/costume-catalog` to see imported costumes

---

## Testing Checklist

### Database

- [ ] Migrations applied successfully
- [ ] All 9 tables created
- [ ] RLS policies active
- [ ] Sample vendors inserted

### Import

- [ ] Can access import page (`/admin/costume-catalog/import`)
- [ ] Vendor dropdown populated
- [ ] CSV file upload works
- [ ] Preview shows first 5 rows
- [ ] Import completes successfully
- [ ] Results show imported count
- [ ] Errors displayed if any

### Catalog Browser

- [ ] Can access catalog (`/admin/costume-catalog`)
- [ ] Costumes display in grid
- [ ] Images load correctly
- [ ] Search by name works
- [ ] Filter by vendor works
- [ ] Filter by category works
- [ ] Filter by gender works
- [ ] Pagination works
- [ ] Click costume opens detail modal
- [ ] Detail modal shows all info
- [ ] Image gallery works (if multiple images)

### API Endpoints

- [ ] `GET /api/costume-catalog` returns costumes
- [ ] `GET /api/costume-catalog/[id]` returns single costume
- [ ] `GET /api/costume-catalog/vendors` returns vendors
- [ ] Search filters work correctly
- [ ] Pagination works
- [ ] RLS policies enforce access

---

## Next Steps (Phase 2)

### Performance Integration

1. **Add "Assign Costume" button** to recital program builder
2. **Create assignment modal** with:
   - Costume search
   - Primary/secondary selection
   - Notes field
   - Quantity input

3. **Display assigned costumes** on performance cards
4. **Allow removing** costume assignments

### Implementation Tasks

- [ ] Add costume assignment button to program builder
- [ ] Create costume search modal component
- [ ] Integrate assignment API calls
- [ ] Display costumes on performance cards
- [ ] Add remove/update assignment actions
- [ ] Test with sample data

---

## Phase 3 & Beyond

### Order Planning

- Size/color breakdown per performance
- Student-specific costume tracking
- Order quantity calculator
- CSV export for vendor orders

### Automation

- Vendor API integrations
- Automated catalog syncing
- Web scraping for catalogs without APIs
- Change detection and notifications

### Advanced Features

- Costume availability tracking
- Budget planning and cost estimation
- Multi-show costume reuse tracking
- Vendor comparison tools

---

## File Structure

```
dance-studio-scheduler/
├── supabase/migrations/
│   ├── 20251120_001_create_costume_catalog.sql
│   └── 20251120_002_costume_catalog_rls.sql
│
├── types/
│   └── costume-catalog.ts
│
├── server/api/costume-catalog/
│   ├── index.get.ts
│   ├── [id].get.ts
│   ├── vendors.get.ts
│   ├── assignments/
│   │   ├── index.post.ts
│   │   └── [performanceId].get.ts
│   └── admin/
│       └── import.post.ts
│
├── composables/
│   └── useCostumeCatalogService.ts
│
├── pages/admin/costume-catalog/
│   ├── index.vue
│   └── import.vue
│
└── docs/costume-catalog/
    ├── IMPLEMENTATION-GUIDE.md (this file)
    ├── IMPORT-GUIDE.md
    ├── QUICK-START.md
    ├── sample-vendors.sql
    ├── sample-revolution-catalog.csv
    ├── sample-curtain-call-catalog.csv
    └── sample-weissman-catalog.csv
```

---

## Troubleshooting

### Common Issues

**Import fails with "Vendor not found"**
- Verify vendor exists: `SELECT * FROM vendors WHERE slug = 'revolution';`
- Check slug spelling (case-sensitive)
- Ensure vendor was inserted successfully

**Costumes not showing in catalog**
- Check `is_active` flag: `SELECT COUNT(*) FROM costumes WHERE is_active = true;`
- Clear filters in UI
- Verify RLS policies allow access

**Images not loading**
- Sample CSVs use placeholder images (picsum.photos)
- Replace with actual vendor images
- Ensure URLs are publicly accessible

**Permission denied errors**
- Verify user is authenticated
- Check user has `studio_members` record
- Review RLS policies in Supabase

---

## Performance Considerations

### Optimization Strategies

1. **Pagination**
   - Default 20 items per page
   - Max 100 items per page
   - Reduces initial load time

2. **Indexes**
   - All key foreign keys indexed
   - Search fields (name) use GIN indexes
   - Category, season, vendor_id indexed

3. **Image Loading**
   - Lazy load images in grid
   - Use thumbnails where available
   - Consider CDN for image hosting

4. **Caching**
   - Consider caching vendor list
   - Cache frequently accessed costumes
   - Use Supabase built-in caching

---

## Security Considerations

### Data Protection

1. **RLS Policies**
   - Global catalog readable by all
   - Assignments scoped to studio
   - Admin operations restricted

2. **Input Validation**
   - CSV import validates required fields
   - Price conversion sanitized
   - SKU uniqueness enforced

3. **Sensitive Data**
   - No PII in costumes table
   - Student data in separate tables
   - Order details linked, not embedded

---

## Success Metrics

### Phase 1 Goals (Achieved)

✅ Database schema deployed  
✅ Import system functional  
✅ Catalog browser operational  
✅ Sample data available  
✅ Documentation complete

### KPIs to Track

- Number of vendors added
- Costumes imported per vendor
- Search/filter usage
- Time saved vs. manual catalog browsing
- User adoption rate

---

## Support & Resources

### Documentation

- [Quick Start](./QUICK-START.md) - 5-minute setup
- [Import Guide](./IMPORT-GUIDE.md) - Detailed import instructions
- [Architecture Guide](/docs/architecture.md) - System architecture
- [RBAC Guide](/docs/rbac-guide.md) - Role-based access

### Sample Data

- SQL: `docs/costume-catalog/sample-vendors.sql`
- CSV: `docs/costume-catalog/sample-*.csv`

### Key Files

- Types: `/types/costume-catalog.ts`
- Migrations: `/supabase/migrations/20251120_*.sql`
- API: `/server/api/costume-catalog/`
- UI: `/pages/admin/costume-catalog/`

---

**Implementation Date:** 2025-01-20  
**Version:** 1.0.0  
**Status:** ✅ Phase 1 Complete - Ready for Testing

---
