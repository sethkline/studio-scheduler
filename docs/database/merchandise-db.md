# Merchandise Management - Database Documentation

## Overview

This document provides a comprehensive overview of the database design for the Studio Merchandise Store feature. The schema supports product catalog management, variant tracking (sizes/colors), inventory management, shopping cart, order processing with Stripe integration, and fulfillment (pickup/shipping).

## Database Schema

### Merchandise Tables

#### `merchandise_products`
Stores product information for studio merchandise.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| name | varchar | NOT NULL | Product name |
| description | text | | Product description |
| category | varchar | NOT NULL | Product category (apparel, accessories, equipment, etc.) |
| base_price_in_cents | integer | NOT NULL | Base price in cents |
| image_url | text | | Main product image URL |
| additional_images | jsonb | default '[]'::jsonb | Array of additional image URLs |
| is_active | boolean | NOT NULL, default true | Whether product is available for purchase |
| sort_order | integer | default 0 | Display order in catalog |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `merchandise_variants`
Stores size/color variants for products.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| product_id | uuid | NOT NULL, FK → merchandise_products(id) ON DELETE CASCADE | Associated product |
| sku | varchar | UNIQUE | Stock keeping unit identifier |
| size | varchar | | Size (XS, S, M, L, XL, etc.) |
| color | varchar | | Color variant |
| price_adjustment_in_cents | integer | NOT NULL, default 0 | Price adjustment from base price |
| is_available | boolean | NOT NULL, default true | Whether variant is available |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `merchandise_inventory`
Tracks stock levels for product variants.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| variant_id | uuid | NOT NULL, FK → merchandise_variants(id) ON DELETE CASCADE, UNIQUE | Associated variant |
| quantity_on_hand | integer | NOT NULL, default 0 | Current stock quantity |
| quantity_reserved | integer | NOT NULL, default 0 | Quantity in active carts/pending orders |
| low_stock_threshold | integer | default 5 | Alert threshold for low stock |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `merchandise_orders`
Stores customer orders for merchandise.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| user_id | uuid | FK → profiles(id) | User who placed the order |
| order_number | varchar | NOT NULL, UNIQUE | Human-readable order number |
| customer_name | varchar | NOT NULL | Customer's full name |
| email | varchar | NOT NULL | Customer's email address |
| phone | varchar | | Customer's phone number |
| subtotal_in_cents | integer | NOT NULL | Subtotal before tax and shipping |
| tax_in_cents | integer | NOT NULL, default 0 | Tax amount |
| shipping_cost_in_cents | integer | NOT NULL, default 0 | Shipping cost |
| total_in_cents | integer | NOT NULL | Total order amount |
| payment_method | varchar | NOT NULL, default 'stripe' | Payment method used |
| payment_intent_id | varchar | | Stripe payment intent ID |
| payment_status | varchar | NOT NULL, default 'pending' | Payment status (pending, completed, failed, refunded) |
| fulfillment_method | varchar | NOT NULL | Fulfillment method (pickup, shipping) |
| shipping_address | jsonb | | Shipping address details |
| order_status | varchar | NOT NULL, default 'pending' | Order status (pending, processing, ready, completed, cancelled) |
| order_date | timestamp with timezone | NOT NULL, default now() | When the order was placed |
| notes | text | | Order notes |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

#### `merchandise_order_items`
Individual items within an order.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| order_id | uuid | NOT NULL, FK → merchandise_orders(id) ON DELETE CASCADE | Associated order |
| variant_id | uuid | NOT NULL, FK → merchandise_variants(id) | Product variant ordered |
| product_snapshot | jsonb | NOT NULL | Snapshot of product/variant details at time of order |
| quantity | integer | NOT NULL | Quantity ordered |
| unit_price_in_cents | integer | NOT NULL | Price per unit at time of order |
| total_price_in_cents | integer | NOT NULL | Total for this line item |
| created_at | timestamp with timezone | default now() | Creation timestamp |
| updated_at | timestamp with timezone | default now() | Last update timestamp |

## Key Relationships

### Product Structure
- A `merchandise_products` has multiple `merchandise_variants` (one-to-many)
- Each `merchandise_variants` belongs to one `merchandise_products` (many-to-one)
- Each `merchandise_variants` has one `merchandise_inventory` record (one-to-one)

### Order Structure
- A `merchandise_orders` belongs to one user via `profiles` (many-to-one)
- A `merchandise_orders` has multiple `merchandise_order_items` (one-to-many)
- Each `merchandise_order_items` references one `merchandise_variants` (many-to-one)

### Inventory Tracking
- Inventory is tracked at the variant level
- `quantity_reserved` tracks items in active shopping carts and pending orders
- `quantity_on_hand - quantity_reserved` gives available stock

## Indexes

The following indexes improve query performance:

- `idx_merchandise_products_category` on `merchandise_products(category)`
- `idx_merchandise_products_is_active` on `merchandise_products(is_active)`
- `idx_merchandise_variants_product_id` on `merchandise_variants(product_id)`
- `idx_merchandise_variants_sku` on `merchandise_variants(sku)` (UNIQUE)
- `idx_merchandise_orders_user_id` on `merchandise_orders(user_id)`
- `idx_merchandise_orders_order_number` on `merchandise_orders(order_number)` (UNIQUE)
- `idx_merchandise_orders_email` on `merchandise_orders(email)`
- `idx_merchandise_orders_payment_status` on `merchandise_orders(payment_status)`
- `idx_merchandise_orders_order_status` on `merchandise_orders(order_status)`
- `idx_merchandise_order_items_order_id` on `merchandise_order_items(order_id)`
- `idx_merchandise_order_items_variant_id` on `merchandise_order_items(variant_id)`

## Automatic Timestamps

Triggers are implemented to automatically update the `updated_at` timestamp when records are modified:

- `update_merchandise_products_updated_at` on `merchandise_products`
- `update_merchandise_variants_updated_at` on `merchandise_variants`
- `update_merchandise_inventory_updated_at` on `merchandise_inventory`
- `update_merchandise_orders_updated_at` on `merchandise_orders`
- `update_merchandise_order_items_updated_at` on `merchandise_order_items`

## SQL Migration Scripts

### Helper Function for Updated At Trigger

```sql
-- Create or replace the function that updates the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Create merchandise_products Table

```sql
CREATE TABLE IF NOT EXISTS public.merchandise_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR NOT NULL,
    base_price_in_cents INTEGER NOT NULL,
    image_url TEXT,
    additional_images JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchandise_products_category
ON public.merchandise_products(category);

CREATE INDEX IF NOT EXISTS idx_merchandise_products_is_active
ON public.merchandise_products(is_active);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_merchandise_products_updated_at ON public.merchandise_products;
CREATE TRIGGER update_merchandise_products_updated_at
BEFORE UPDATE ON public.merchandise_products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT ON public.merchandise_products TO authenticated;
GRANT SELECT ON public.merchandise_products TO anon;
GRANT INSERT, UPDATE, DELETE ON public.merchandise_products TO authenticated;
```

### Create merchandise_variants Table

```sql
CREATE TABLE IF NOT EXISTS public.merchandise_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.merchandise_products(id) ON DELETE CASCADE,
    sku VARCHAR UNIQUE,
    size VARCHAR,
    color VARCHAR,
    price_adjustment_in_cents INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchandise_variants_product_id
ON public.merchandise_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_merchandise_variants_sku
ON public.merchandise_variants(sku);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_merchandise_variants_updated_at ON public.merchandise_variants;
CREATE TRIGGER update_merchandise_variants_updated_at
BEFORE UPDATE ON public.merchandise_variants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT ON public.merchandise_variants TO authenticated;
GRANT SELECT ON public.merchandise_variants TO anon;
GRANT INSERT, UPDATE, DELETE ON public.merchandise_variants TO authenticated;
```

### Create merchandise_inventory Table

```sql
CREATE TABLE IF NOT EXISTS public.merchandise_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL UNIQUE REFERENCES public.merchandise_variants(id) ON DELETE CASCADE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_merchandise_inventory_updated_at ON public.merchandise_inventory;
CREATE TRIGGER update_merchandise_inventory_updated_at
BEFORE UPDATE ON public.merchandise_inventory
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT ON public.merchandise_inventory TO authenticated;
GRANT SELECT ON public.merchandise_inventory TO anon;
GRANT INSERT, UPDATE, DELETE ON public.merchandise_inventory TO authenticated;
```

### Create merchandise_orders Table

```sql
CREATE TABLE IF NOT EXISTS public.merchandise_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    order_number VARCHAR NOT NULL UNIQUE,
    customer_name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    phone VARCHAR,
    subtotal_in_cents INTEGER NOT NULL,
    tax_in_cents INTEGER NOT NULL DEFAULT 0,
    shipping_cost_in_cents INTEGER NOT NULL DEFAULT 0,
    total_in_cents INTEGER NOT NULL,
    payment_method VARCHAR NOT NULL DEFAULT 'stripe',
    payment_intent_id VARCHAR,
    payment_status VARCHAR NOT NULL DEFAULT 'pending',
    fulfillment_method VARCHAR NOT NULL,
    shipping_address JSONB,
    order_status VARCHAR NOT NULL DEFAULT 'pending',
    order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchandise_orders_user_id
ON public.merchandise_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_merchandise_orders_order_number
ON public.merchandise_orders(order_number);

CREATE INDEX IF NOT EXISTS idx_merchandise_orders_email
ON public.merchandise_orders(email);

CREATE INDEX IF NOT EXISTS idx_merchandise_orders_payment_status
ON public.merchandise_orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_merchandise_orders_order_status
ON public.merchandise_orders(order_status);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_merchandise_orders_updated_at ON public.merchandise_orders;
CREATE TRIGGER update_merchandise_orders_updated_at
BEFORE UPDATE ON public.merchandise_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT ON public.merchandise_orders TO authenticated;
GRANT INSERT, UPDATE ON public.merchandise_orders TO authenticated;
```

### Create merchandise_order_items Table

```sql
CREATE TABLE IF NOT EXISTS public.merchandise_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.merchandise_orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.merchandise_variants(id),
    product_snapshot JSONB NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_in_cents INTEGER NOT NULL,
    total_price_in_cents INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchandise_order_items_order_id
ON public.merchandise_order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_merchandise_order_items_variant_id
ON public.merchandise_order_items(variant_id);

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_merchandise_order_items_updated_at ON public.merchandise_order_items;
CREATE TRIGGER update_merchandise_order_items_updated_at
BEFORE UPDATE ON public.merchandise_order_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT ON public.merchandise_order_items TO authenticated;
GRANT INSERT ON public.merchandise_order_items TO authenticated;
```

### Generate Order Number Function

```sql
-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
    new_number VARCHAR;
    year_part VARCHAR;
    sequence_part VARCHAR;
    max_sequence INTEGER;
BEGIN
    -- Get current year
    year_part := TO_CHAR(NOW(), 'YY');

    -- Get the maximum sequence number for the current year
    SELECT COALESCE(MAX(
        CASE
            WHEN order_number ~ ('^MO' || year_part || '-[0-9]{4}$')
            THEN CAST(SUBSTRING(order_number FROM 6) AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_sequence
    FROM public.merchandise_orders
    WHERE order_number LIKE 'MO' || year_part || '-%';

    -- Increment and format
    sequence_part := LPAD((max_sequence + 1)::TEXT, 4, '0');

    -- Combine parts
    new_number := 'MO' || year_part || '-' || sequence_part;

    RETURN new_number;
END;
$$ LANGUAGE plpgsql;
```

## Security Considerations

- Permissions are granted to authenticated users for all operations
- Anonymous users can view products and variants (for public catalog browsing)
- Orders are associated with user profiles for access control
- Payment intent IDs are stored but actual payment details are handled by Stripe
- Product snapshots in order items preserve historical data even if products are modified

## Image Storage

The application uses Supabase Storage to store product images:

**Storage Bucket**: `merchandise-images`
- Organized by product ID: `{product_id}/{unique_id}.{extension}`
- Maximum file size: 5MB
- Supported formats: JPG, PNG, WEBP

## Future Enhancements

Potential future enhancements to the schema include:

1. Adding a `merchandise_categories` table for hierarchical category management
2. Implementing a `merchandise_reviews` table for customer reviews and ratings
3. Adding a `merchandise_discounts` table for promotional pricing
4. Creating a `merchandise_bundles` table for product bundles
5. Adding a `merchandise_returns` table for return/exchange tracking
6. Implementing wish lists or favorites functionality
7. Adding support for digital products (downloadable items)
8. Enhanced shipping integration with carrier tracking
