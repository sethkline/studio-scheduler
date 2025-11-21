# Costume Catalog Import Guide

This guide walks you through setting up the costume catalog system with sample data.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Database Setup](#database-setup)
3. [Importing Sample Vendors](#importing-sample-vendors)
4. [Importing Costume Catalogs](#importing-costume-catalogs)
5. [CSV File Format](#csv-file-format)
6. [Creating Your Own Data](#creating-your-own-data)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

**Get up and running in 5 minutes:**

1. Run the database migrations
2. Insert sample vendors
3. Import a sample catalog via the UI
4. Browse costumes in the admin panel

---

## Database Setup

### Step 1: Run Migrations

The costume catalog requires two database migrations. Run these in your Supabase SQL Editor:

**Migration 1: Create Tables**
```bash
# Location: supabase/migrations/20251120_001_create_costume_catalog.sql
```

**Migration 2: Add RLS Policies**
```bash
# Location: supabase/migrations/20251120_002_costume_catalog_rls.sql
```

**To apply:**
1. Open your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of each migration file
4. Run them in order (001 first, then 002)

Alternatively, if using Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify Tables

After running migrations, verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%costume%' OR table_name = 'vendors';
```

You should see:
- `vendors`
- `costumes`
- `costume_sizes`
- `costume_colors`
- `costume_images`
- `performance_costumes`
- `costume_order_details`
- `raw_vendor_items`
- `vendor_sync_logs`

---

## Importing Sample Vendors

### Method 1: Via Supabase SQL Editor (Recommended for Testing)

1. Open Supabase SQL Editor
2. Copy contents of `docs/costume-catalog/sample-vendors.sql`
3. Run the query

This will insert 5 sample vendors:
- Revolution Dancewear
- Curtain Call Costumes
- Weissman
- Cicci Dance
- A Wish Come True

### Method 2: Via Application (Manual Entry)

You can also add vendors directly in the database or via future admin UI:

```sql
INSERT INTO vendors (name, slug, website_url, is_active, is_global)
VALUES (
  'Your Vendor Name',
  'vendor-slug',
  'https://www.vendor.com',
  true,
  true
);
```

**Important Vendor Fields:**
- `name`: Display name (e.g., "Revolution Dancewear")
- `slug`: URL-friendly identifier used in imports (e.g., "revolution")
- `is_global`: Set to `true` to share across all studios
- `is_active`: Set to `true` to make vendor visible

---

## Importing Costume Catalogs

### Using the Import UI

1. **Navigate to Import Page**
   ```
   http://localhost:3000/admin/costume-catalog/import
   ```

2. **Select Vendor**
   - Choose from the dropdown (must be created first)
   - For sample data, select "Revolution Dancewear", "Curtain Call Costumes", or "Weissman"

3. **Upload CSV File**
   - Use one of the sample CSV files:
     - `sample-revolution-catalog.csv` (20 costumes)
     - `sample-curtain-call-catalog.csv` (20 costumes)
     - `sample-weissman-catalog.csv` (20 costumes)

4. **Preview Data**
   - Review the first 5 rows to ensure proper formatting
   - Check that all required fields are present

5. **Import**
   - Click "Import Costumes"
   - Wait for import to complete
   - Review results (imported, updated, errors)

6. **View Catalog**
   - Click "View Catalog" or navigate to `/admin/costume-catalog`
   - Search and filter your newly imported costumes

### Import Results

The import page shows:
- **Total Rows**: Number of rows in CSV
- **Imported**: New costumes created
- **Updated**: Existing costumes updated (by vendor + SKU)
- **Errors**: Rows that failed with error messages

**Note:** Re-importing the same file will update existing costumes rather than create duplicates.

---

## CSV File Format

### Required Columns

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `vendor_sku` | ✅ Yes | Vendor's SKU/item number | `REV-2501` |
| `name` | ✅ Yes | Costume name | `Sparkle Dreams Tutu` |
| `category` | No | Dance category | `ballet`, `jazz`, `tap`, `lyrical`, etc. |
| `description` | No | Detailed description | `Classic ballet tutu with sequined bodice...` |
| `season` | No | Season/year | `2025`, `Spring 2025`, `Fall 2024` |
| `gender` | No | Target gender | `girls`, `boys`, `unisex`, `adult-female`, `adult-male` |
| `price` | No | Price in dollars | `52.99` (will be converted to cents) |
| `sizes` | No | Comma-separated sizes | `SC,IC,MC,LC,SA,IA,MA` |
| `colors` | No | Comma-separated colors | `Pink,White,Lavender` |
| `image_urls` | No | Comma-separated image URLs | `https://example.com/img1.jpg,https://example.com/img2.jpg` |
| `availability` | No | Stock status | `in_stock`, `limited`, `discontinued`, `pre_order` |

### Standard Size Codes

Use these standard codes for consistency across vendors:

**Child Sizes:**
- `SC` - Small Child
- `IC` - Intermediate Child  
- `MC` - Medium Child
- `LC` - Large Child
- `XLC` - X-Large Child

**Adult Sizes:**
- `SA` - Small Adult
- `IA` - Intermediate Adult
- `MA` - Medium Adult
- `LA` - Large Adult
- `XLA` - X-Large Adult

### Category Values

Recommended categories (lowercase):
- `ballet`
- `jazz`
- `tap`
- `lyrical`
- `contemporary`
- `hip-hop`
- `musical-theater`
- `costume` (general)
- `accessory`

### Availability Values

- `in_stock` - Currently available
- `limited` - Limited quantities
- `pre_order` - Pre-order only
- `discontinued` - No longer available
- `unknown` - Availability unknown

### Sample CSV Row

```csv
vendor_sku,name,category,description,season,gender,price,sizes,colors,image_urls,availability
REV-2501,Sparkle Dreams Tutu,ballet,Classic ballet tutu with sequined bodice,2025,girls,52.99,"SC,IC,MC,LC","Pink,White",https://example.com/img.jpg,in_stock
```

**Important:**
- Header row is required (first line)
- Use double quotes around values containing commas
- Prices in dollars (will be converted to cents automatically)
- Empty fields are allowed (except vendor_sku and name)

---

## Creating Your Own Data

### Option 1: Export from Vendor

Many vendors provide dealer price lists in Excel/CSV format:

1. **Contact your vendor** and request:
   - Dealer price list
   - Catalog export
   - Product data feed

2. **Convert to CSV**:
   - Open in Excel/Google Sheets
   - Map their columns to our format
   - Save as CSV

3. **Map vendor columns** to our format:
   ```
   Their "Item #" → vendor_sku
   Their "Description" → name
   Their "Style" → category
   Their "Price" → price
   etc.
   ```

### Option 2: Manual Entry

For small catalogs, create a CSV manually:

1. **Start with the template**:
   ```csv
   vendor_sku,name,category,description,season,gender,price,sizes,colors,image_urls,availability
   ```

2. **Add rows**:
   ```csv
   vendor_sku,name,category,description,season,gender,price,sizes,colors,image_urls,availability
   ITEM001,My First Costume,jazz,Beautiful jazz costume,2025,girls,45.99,"SC,IC,MC","Black,Red",https://example.com/img.jpg,in_stock
   ITEM002,My Second Costume,ballet,Classic tutu,2025,girls,59.99,"IC,MC,LC","Pink,White",https://example.com/img2.jpg,in_stock
   ```

3. **Save as `.csv`**

### Option 3: Google Sheets Template

Create a shared Google Sheets template:

1. Create new sheet with column headers
2. Fill in data
3. File → Download → CSV
4. Upload to import page

**Pro tip:** Use data validation for categories, genders, and availability to ensure consistency.

---

## Troubleshooting

### Import Errors

**"Vendor not found"**
- Ensure vendor exists in database with matching slug
- Run `SELECT slug FROM vendors;` to see available vendors
- Vendor slug is case-sensitive

**"Missing required fields"**
- Both `vendor_sku` and `name` are required
- Check CSV has header row
- Verify no empty rows in middle of file

**"Failed to parse CSV"**
- Check for proper comma delimiters
- Ensure values with commas are quoted: `"SC,IC,MC"`
- Remove any special characters or smart quotes

**"Duplicate costume"**
- Costume with same vendor_id + vendor_sku already exists
- This is OK - it will update the existing costume
- Check the "Updated" count in results

### No Costumes Showing in Catalog

1. **Check `is_active` flag**:
   ```sql
   SELECT name, is_active FROM costumes LIMIT 10;
   ```
   - All imported costumes should have `is_active = true`

2. **Check vendor is active**:
   ```sql
   SELECT name, is_active FROM vendors;
   ```

3. **Clear filters** in the catalog browser UI

4. **Check RLS policies**:
   - Ensure you're logged in
   - Verify your user has `studio_members` record

### Image URLs Not Loading

- Verify URLs are publicly accessible (not behind login)
- Use HTTPS URLs
- Check for CORS issues
- Sample CSV uses placeholder images from picsum.photos
- Replace with actual vendor images when available

### Price Formatting Issues

- Prices should be in dollars: `45.99` (NOT cents: `4599`)
- The import automatically converts to cents
- Leave blank if price unavailable (will show "N/A")

### Size Codes Not Recognized

- Use standard codes: SC, IC, MC, LC, XLC, SA, IA, MA, LA, XLA
- Vendor-specific sizes can be added but may not map consistently
- Avoid using numeric sizes (6, 8, 10) - use letter codes instead

---

## Next Steps

After importing your catalog:

1. **Browse the Catalog**
   - Navigate to `/admin/costume-catalog`
   - Test search and filters
   - View costume details

2. **Assign Costumes to Performances** (Coming in Phase 2)
   - Integrate with recital program builder
   - Track costume assignments per performance

3. **Order Planning** (Coming in Phase 3)
   - Generate size reports
   - Export order lists for vendors
   - Track order status

4. **Add More Vendors**
   - Insert additional vendors via SQL
   - Import their catalogs
   - Build comprehensive costume library

---

## Sample Data Summary

### Included Files

1. **`sample-vendors.sql`**
   - 5 vendors
   - Ready to run in Supabase SQL Editor

2. **`sample-revolution-catalog.csv`**
   - 20 costumes from Revolution Dancewear
   - Mix of ballet, jazz, tap, lyrical, hip-hop, accessories
   - Girls, boys, and unisex items

3. **`sample-curtain-call-catalog.csv`**
   - 20 costumes from Curtain Call
   - Spring 2025 collection
   - Performance-ready costumes

4. **`sample-weissman-catalog.csv`**
   - 20 costumes from Weissman
   - Premium competition costumes
   - Higher price point items

### Total Sample Data

- **5 vendors**
- **60 costumes**
- Multiple categories, sizes, colors
- Mix of availability statuses
- Price range: $8.99 - $99.99

---

## Getting Help

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review the console for error messages
3. Check Supabase logs for database errors
4. Verify migrations ran successfully
5. Ensure all required environment variables are set

---

## Resources

- **Migration Files**: `/supabase/migrations/20251120_00*.sql`
- **Sample Data**: `/docs/costume-catalog/sample-*.csv`
- **Type Definitions**: `/types/costume-catalog.ts`
- **API Endpoints**: `/server/api/costume-catalog/`
- **UI Components**: `/pages/admin/costume-catalog/`

---

Happy importing! 🎭✨
