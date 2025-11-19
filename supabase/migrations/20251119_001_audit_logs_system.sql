-- Migration: Audit Logs System
-- Created: 2025-11-19
-- Description: Creates audit_logs table for tracking sensitive operations and user actions

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Multi-tenant support
  studio_id UUID REFERENCES studio_profile(id) ON DELETE CASCADE,

  -- Who performed the action
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,

  -- What action was performed
  action TEXT NOT NULL,  -- e.g., 'order.refund', 'seat.override', 'user.role_change'
  resource_type TEXT NOT NULL,  -- e.g., 'order', 'ticket', 'user', 'seat'
  resource_id UUID,  -- ID of the affected resource

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,  -- Flexible field for action-specific data

  -- Request metadata
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,  -- Correlates with application logs

  -- Outcome
  status TEXT DEFAULT 'success',  -- 'success', 'failure', 'partial'
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookup indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_studio_id ON audit_logs(studio_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);

-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_studio_user ON audit_logs(studio_id, user_id, created_at DESC);
CREATE INDEX idx_audit_logs_studio_action ON audit_logs(studio_id, action, created_at DESC);
CREATE INDEX idx_audit_logs_resource_created ON audit_logs(resource_type, resource_id, created_at DESC);

-- JSONB index for metadata queries
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING gin(metadata);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin users can view all audit logs for their studio
CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.studio_id = audit_logs.studio_id
      AND profiles.user_role = 'admin'
    )
  );

-- Service role can insert audit logs (server-side only)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- No updates or deletes allowed (audit logs are immutable)
-- Only database admins can delete via migrations

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to clean up old audit logs (for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit trail for a resource
CREATE OR REPLACE FUNCTION get_resource_audit_trail(
  p_resource_type TEXT,
  p_resource_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  action TEXT,
  user_email TEXT,
  user_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    audit_logs.id,
    audit_logs.action,
    audit_logs.user_email,
    audit_logs.user_name,
    audit_logs.metadata,
    audit_logs.created_at
  FROM audit_logs
  WHERE audit_logs.resource_type = p_resource_type
    AND audit_logs.resource_id = p_resource_id
  ORDER BY audit_logs.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE audit_logs IS 'Audit trail for sensitive operations and user actions';
COMMENT ON COLUMN audit_logs.action IS 'Action performed, format: resource.action (e.g., order.refund, user.role_change)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (e.g., order, ticket, user)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the affected resource';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context specific to the action';
COMMENT ON COLUMN audit_logs.request_id IS 'Request ID for correlation with application logs';
COMMENT ON COLUMN audit_logs.status IS 'Outcome of the action: success, failure, or partial';

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant SELECT to authenticated users (RLS will filter)
GRANT SELECT ON audit_logs TO authenticated;

-- Service role needs full access
GRANT ALL ON audit_logs TO service_role;
