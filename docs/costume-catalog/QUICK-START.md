# Costume Catalog - Quick Start

Get your costume catalog up and running in 5 minutes!

## Prerequisites

✅ Database migrations applied  
✅ Admin/staff account

## Step 1: Apply Migrations (2 min)

Open Supabase SQL Editor and run:

```bash
# File 1: supabase/migrations/20251120_001_create_costume_catalog.sql
# File 2: supabase/migrations/20251120_002_costume_catalog_rls.sql
```

Or via CLI:
```bash
supabase db push
```

## Step 2: Add Sample Vendors (1 min)

In Supabase SQL Editor, run:

```bash
# File: docs/costume-catalog/sample-vendors.sql
```

This creates 5 sample vendors.

## Step 3: Import Costumes (2 min)

1. Navigate to: `http://localhost:3000/admin/costume-catalog/import`

2. Select vendor: **Revolution Dancewear**

3. Upload CSV: `docs/costume-catalog/sample-revolution-catalog.csv`

4. Click **Import Costumes**

5. Wait for success message (20 costumes imported)

## Step 4: Browse Catalog

Navigate to: `http://localhost:3000/admin/costume-catalog`

🎉 Done! You now have a working costume catalog with 20 costumes.

---

## CSV Template

Copy this template to create your own catalog:

```csv
vendor_sku,name,category,description,season,gender,price,sizes,colors,image_urls,availability
ITEM001,Costume Name,jazz,Description here,2025,girls,45.99,"SC,IC,MC","Pink,Black",https://example.com/img.jpg,in_stock
```

**Required:** `vendor_sku`, `name`  
**Optional:** All other columns

---

## Standard Size Codes

| Code | Label |
|------|-------|
| SC | Small Child |
| IC | Intermediate Child |
| MC | Medium Child |
| LC | Large Child |
| SA | Small Adult |
| IA | Intermediate Adult |
| MA | Medium Adult |
| LA | Large Adult |

---

## Common Issues

**Can't see costumes?**
- Check vendor is active: `SELECT * FROM vendors;`
- Clear filters in UI

**Import fails?**
- Verify vendor slug matches (case-sensitive)
- Ensure CSV has header row
- Check for special characters

**Images not loading?**
- Use public HTTPS URLs
- Sample files use placeholder images

---

## Next Steps

- [ ] Import additional vendor catalogs
- [ ] Test search and filtering
- [ ] View costume details
- [ ] (Phase 2) Assign costumes to performances
- [ ] (Phase 3) Generate order reports

---

## File Locations

```
docs/costume-catalog/
  ├── QUICK-START.md (this file)
  ├── IMPORT-GUIDE.md (detailed guide)
  ├── sample-vendors.sql
  ├── sample-revolution-catalog.csv (20 costumes)
  ├── sample-curtain-call-catalog.csv (20 costumes)
  └── sample-weissman-catalog.csv (20 costumes)

supabase/migrations/
  ├── 20251120_001_create_costume_catalog.sql
  └── 20251120_002_costume_catalog_rls.sql

pages/admin/costume-catalog/
  ├── index.vue (browse catalog)
  └── import.vue (import CSV)
```

---

**Need more help?** See the full [Import Guide](./IMPORT-GUIDE.md)
