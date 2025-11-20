-- Migration: Multi-Tenant Studios and Membership
-- Created: 2025-11-19
-- Description: Creates studios and studio_members tables for multi-tenant architecture
-- This is PHASE 1 of multi-tenant migration

-- ============================================
-- STUDIOS TABLE
-- ============================================
CREATE TABLE studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier (e.g., 'bella-dance-studio')
  tagline TEXT,
  description TEXT,

  -- Branding
  logo_url TEXT,
  primary_color TEXT, -- Hex color for branding

  -- Contact Info
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Address (Main/Primary Location)
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',

  -- Subscription & Status
  subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
  subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,

  -- Settings
  timezone TEXT DEFAULT 'America/New_York',
  locale TEXT DEFAULT 'en-US',
  currency TEXT DEFAULT 'USD',

  -- Features (JSON for flexible feature flags)
  features JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',

  -- Billing
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete support
);

COMMENT ON TABLE studios IS 'Multi-tenant studios table - each studio is a separate tenant';
COMMENT ON COLUMN studios.slug IS 'URL-friendly unique identifier for studio (used in subdomains/paths)';
COMMENT ON COLUMN studios.subscription_tier IS 'Studio subscription level (free, starter, professional, enterprise)';
COMMENT ON COLUMN studios.features IS 'JSON object of enabled features for this studio';
COMMENT ON COLUMN studios.settings IS 'JSON object of studio-specific settings';
COMMENT ON COLUMN studios.deleted_at IS 'Soft delete timestamp (NULL = active)';

-- Indexes
CREATE INDEX idx_studios_slug ON studios(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_studios_subscription_status ON studios(subscription_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_studios_stripe_customer ON studios(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_studios_deleted ON studios(deleted_at);

-- ============================================
-- STUDIO_MEMBERS TABLE
-- ============================================
CREATE TABLE studio_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role within this studio
  role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('admin', 'staff', 'teacher', 'parent', 'student')),

  -- Membership status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),

  -- Permissions override (optional - for custom permissions)
  custom_permissions JSONB,

  -- Invitation tracking
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One user can only have one membership per studio
  CONSTRAINT studio_members_unique_user_per_studio UNIQUE(studio_id, user_id)
);

COMMENT ON TABLE studio_members IS 'Junction table linking users to studios with roles';
COMMENT ON COLUMN studio_members.role IS 'User role within this specific studio';
COMMENT ON COLUMN studio_members.custom_permissions IS 'Optional JSON for custom permission overrides';
COMMENT ON COLUMN studio_members.status IS 'Membership status (active, inactive, pending, suspended)';

-- Indexes
CREATE INDEX idx_studio_members_studio ON studio_members(studio_id);
CREATE INDEX idx_studio_members_user ON studio_members(user_id);
CREATE INDEX idx_studio_members_role ON studio_members(studio_id, role);
CREATE INDEX idx_studio_members_active ON studio_members(studio_id, user_id) WHERE status = 'active';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Get all studio IDs a user has access to
CREATE OR REPLACE FUNCTION get_user_studio_ids(p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT studio_id
    FROM studio_members
    WHERE user_id = p_user_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_studio_ids IS 'Returns array of studio IDs the user has active membership in';

-- Function: Check if user has access to a specific studio
CREATE OR REPLACE FUNCTION user_has_studio_access(p_user_id UUID, p_studio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM studio_members
    WHERE user_id = p_user_id
    AND studio_id = p_studio_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_has_studio_access IS 'Check if user has active access to a specific studio';

-- Function: Get user role in a studio
CREATE OR REPLACE FUNCTION get_user_studio_role(p_user_id UUID, p_studio_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM studio_members
    WHERE user_id = p_user_id
    AND studio_id = p_studio_id
    AND status = 'active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_studio_role IS 'Get user role within a specific studio';

-- Function: Check if user has admin or staff role in studio
CREATE OR REPLACE FUNCTION user_is_studio_admin_or_staff(p_user_id UUID, p_studio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM studio_members
    WHERE user_id = p_user_id
    AND studio_id = p_studio_id
    AND status = 'active'
    AND role IN ('admin', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_is_studio_admin_or_staff IS 'Check if user is admin or staff in a specific studio';

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_studios_updated_at
  BEFORE UPDATE ON studios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_studio_members_updated_at
  BEFORE UPDATE ON studio_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_members ENABLE ROW LEVEL SECURITY;

-- Studios Policies
-- Users can view studios they are members of
CREATE POLICY "Users can view their studios"
  ON studios FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Public can view basic studio info (for public pages like ticket sales)
CREATE POLICY "Public can view active studios"
  ON studios FOR SELECT
  TO public
  USING (
    subscription_status = 'active'
    AND deleted_at IS NULL
  );

-- Only studio admins can update their studio
CREATE POLICY "Studio admins can update their studio"
  ON studios FOR UPDATE
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), id)
  );

-- Only super admins can create studios (handled at application level)
CREATE POLICY "Authenticated users can insert studios"
  ON studios FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only studio admins can soft delete (handled via update)
-- No explicit DELETE policy - soft delete via updated_at

-- Studio Members Policies
-- Users can view members of studios they belong to
CREATE POLICY "Users can view studio members"
  ON studio_members FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Studio admins can manage members
CREATE POLICY "Studio admins can insert members"
  ON studio_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

CREATE POLICY "Studio admins can update members"
  ON studio_members FOR UPDATE
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

CREATE POLICY "Studio admins can delete members"
  ON studio_members FOR DELETE
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON studios TO authenticated, anon;
GRANT INSERT, UPDATE ON studios TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON studio_members TO authenticated;

-- ============================================
-- MIGRATION COMPLETE - PHASE 1
-- ============================================
-- Next: Phase 2 - Add studio_id to all business tables
