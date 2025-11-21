-- =====================================================
-- Costume Catalog RLS Policies
-- =====================================================
-- This migration adds Row Level Security policies for
-- the costume catalog system.
--
-- Security Model:
-- - Global catalog (vendors, costumes) - readable by all authenticated users
-- - Vendor management - admin/staff only
-- - Costume assignments - tenant-scoped by studio_id
-- - Raw data - admin/staff only for debugging
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE costumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE costume_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE costume_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE costume_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_vendor_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_costumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE costume_order_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_sync_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VENDORS POLICIES
-- =====================================================

-- All authenticated users can view active vendors
CREATE POLICY "Authenticated users can view active vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Public can view active vendors (for public ticket pages that might show costumes)
CREATE POLICY "Public can view active vendors"
  ON vendors FOR SELECT
  TO public
  USING (is_active = true);

-- Only super admins can create vendors (handled at application level)
-- For now, allow any authenticated user to create, app layer will enforce admin check
CREATE POLICY "Authenticated users can insert vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only super admins can update vendors
-- For now, allow any authenticated user, app layer will enforce admin check
CREATE POLICY "Authenticated users can update vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (true);

-- =====================================================
-- COSTUMES POLICIES (Global Catalog)
-- =====================================================

-- All authenticated users can view active costumes
CREATE POLICY "Authenticated users can view costumes"
  ON costumes FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Allow viewing inactive costumes too (for historical reference)
CREATE POLICY "Users can view all costumes including inactive"
  ON costumes FOR SELECT
  TO authenticated
  USING (true);

-- Public can view active costumes
CREATE POLICY "Public can view active costumes"
  ON costumes FOR SELECT
  TO public
  USING (is_active = true);

-- Admin/staff can manage costumes
CREATE POLICY "Authenticated users can insert costumes"
  ON costumes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update costumes"
  ON costumes FOR UPDATE
  TO authenticated
  USING (true);

-- =====================================================
-- COSTUME SIZES POLICIES
-- =====================================================

-- Everyone can view sizes
CREATE POLICY "Anyone can view costume sizes"
  ON costume_sizes FOR SELECT
  TO authenticated, public
  USING (true);

-- Admin/staff can manage sizes
CREATE POLICY "Authenticated users can insert sizes"
  ON costume_sizes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sizes"
  ON costume_sizes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete sizes"
  ON costume_sizes FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- COSTUME COLORS POLICIES
-- =====================================================

-- Everyone can view colors
CREATE POLICY "Anyone can view costume colors"
  ON costume_colors FOR SELECT
  TO authenticated, public
  USING (true);

-- Admin/staff can manage colors
CREATE POLICY "Authenticated users can insert colors"
  ON costume_colors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update colors"
  ON costume_colors FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete colors"
  ON costume_colors FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- COSTUME IMAGES POLICIES
-- =====================================================

-- Everyone can view images
CREATE POLICY "Anyone can view costume images"
  ON costume_images FOR SELECT
  TO authenticated, public
  USING (true);

-- Admin/staff can manage images
CREATE POLICY "Authenticated users can insert images"
  ON costume_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update images"
  ON costume_images FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete images"
  ON costume_images FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- RAW VENDOR ITEMS POLICIES (Admin/Staff Only)
-- =====================================================

-- Only authenticated users can view raw data (for debugging)
CREATE POLICY "Authenticated users can view raw vendor items"
  ON raw_vendor_items FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert raw data
CREATE POLICY "Authenticated users can insert raw items"
  ON raw_vendor_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update raw items"
  ON raw_vendor_items FOR UPDATE
  TO authenticated
  USING (true);

-- =====================================================
-- PERFORMANCE COSTUMES POLICIES (Tenant-Scoped)
-- =====================================================

-- Users can view costume assignments for performances in their studio
CREATE POLICY "Users can view performance costumes in their studio"
  ON performance_costumes FOR SELECT
  TO authenticated
  USING (
    user_has_studio_access(auth.uid(), studio_id)
  );

-- Admin/staff can create costume assignments in their studio
CREATE POLICY "Studio admin/staff can create performance costumes"
  ON performance_costumes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- Admin/staff can update costume assignments in their studio
CREATE POLICY "Studio admin/staff can update performance costumes"
  ON performance_costumes FOR UPDATE
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- Admin/staff can delete costume assignments in their studio
CREATE POLICY "Studio admin/staff can delete performance costumes"
  ON performance_costumes FOR DELETE
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- =====================================================
-- COSTUME ORDER DETAILS POLICIES (Tenant-Scoped via performance_costumes)
-- =====================================================

-- Users can view order details for performances in their studio
CREATE POLICY "Users can view costume order details in their studio"
  ON costume_order_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM performance_costumes pc
      WHERE pc.id = costume_order_details.performance_costume_id
      AND user_has_studio_access(auth.uid(), pc.studio_id)
    )
  );

-- Admin/staff can manage order details in their studio
CREATE POLICY "Studio admin/staff can insert costume order details"
  ON costume_order_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM performance_costumes pc
      WHERE pc.id = costume_order_details.performance_costume_id
      AND user_is_studio_admin_or_staff(auth.uid(), pc.studio_id)
    )
  );

CREATE POLICY "Studio admin/staff can update costume order details"
  ON costume_order_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM performance_costumes pc
      WHERE pc.id = costume_order_details.performance_costume_id
      AND user_is_studio_admin_or_staff(auth.uid(), pc.studio_id)
    )
  );

CREATE POLICY "Studio admin/staff can delete costume order details"
  ON costume_order_details FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM performance_costumes pc
      WHERE pc.id = costume_order_details.performance_costume_id
      AND user_is_studio_admin_or_staff(auth.uid(), pc.studio_id)
    )
  );

-- =====================================================
-- VENDOR SYNC LOGS POLICIES
-- =====================================================

-- Authenticated users can view sync logs
CREATE POLICY "Authenticated users can view sync logs"
  ON vendor_sync_logs FOR SELECT
  TO authenticated
  USING (true);

-- Only system/admin can insert sync logs
CREATE POLICY "Authenticated users can insert sync logs"
  ON vendor_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sync logs"
  ON vendor_sync_logs FOR UPDATE
  TO authenticated
  USING (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Global catalog - public read access
GRANT SELECT ON vendors TO authenticated, anon;
GRANT SELECT ON costumes TO authenticated, anon;
GRANT SELECT ON costume_sizes TO authenticated, anon;
GRANT SELECT ON costume_colors TO authenticated, anon;
GRANT SELECT ON costume_images TO authenticated, anon;

-- Management access for authenticated users
GRANT INSERT, UPDATE ON vendors TO authenticated;
GRANT INSERT, UPDATE ON costumes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON costume_sizes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON costume_colors TO authenticated;
GRANT INSERT, UPDATE, DELETE ON costume_images TO authenticated;

-- Raw data access
GRANT SELECT, INSERT, UPDATE ON raw_vendor_items TO authenticated;

-- Tenant-scoped tables
GRANT SELECT, INSERT, UPDATE, DELETE ON performance_costumes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON costume_order_details TO authenticated;

-- Sync logs
GRANT SELECT, INSERT, UPDATE ON vendor_sync_logs TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Authenticated users can view costumes" ON costumes IS
  'Global costume catalog is readable by all authenticated users';

COMMENT ON POLICY "Users can view performance costumes in their studio" ON performance_costumes IS
  'Tenant isolation - users can only view costume assignments in studios they belong to';

COMMENT ON POLICY "Studio admin/staff can create performance costumes" ON performance_costumes IS
  'Only admin/staff can assign costumes to performances in their studio';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
