-- Migration: Newsletter Integration with Email Campaign System
-- Description: Extends Tier 1 email campaigns to support blog newsletters (instead of separate newsletter_subscribers table)
-- Date: 2025-11-16
-- Dependencies: Requires tier1_email_campaigns_fixed migration

-- ============================================================================
-- 1. EXTEND email_campaign_unsubscribes FOR NEWSLETTER TRACKING
-- ============================================================================

-- Add category-based unsubscribe tracking
ALTER TABLE email_campaign_unsubscribes
  ADD COLUMN IF NOT EXISTS unsubscribe_categories TEXT[] DEFAULT ARRAY['all'],
  ADD COLUMN IF NOT EXISTS blog_subscriber_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blog_subscription_source VARCHAR(50),
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Create index for blog subscribers
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_blog_subscribers
  ON email_campaign_unsubscribes(blog_subscriber_since)
  WHERE blog_subscriber_since IS NOT NULL;

-- ============================================================================
-- 2. EXTEND email_campaigns FOR BLOG NEWSLETTERS
-- ============================================================================

-- Add campaign category
ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS campaign_category VARCHAR(50) DEFAULT 'studio_update'
    CHECK (campaign_category IN ('studio_update', 'blog_newsletter', 'marketing', 'recital_announcement', 'emergency', 'class_notification'));

-- Add blog post reference
ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS blog_post_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_email_campaigns_category ON email_campaigns(campaign_category);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_blog_post ON email_campaigns(blog_post_id) WHERE blog_post_id IS NOT NULL;

-- ============================================================================
-- 3. CREATE BLOG POSTS TABLE (from PR #15)
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  featured_image_url TEXT,
  author_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,

  -- Newsletter integration
  send_newsletter BOOLEAN DEFAULT false,
  newsletter_sent_at TIMESTAMPTZ,
  newsletter_campaign_id UUID REFERENCES email_campaigns(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  view_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id) WHERE author_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_newsletter ON blog_posts(send_newsletter, newsletter_sent_at)
  WHERE send_newsletter = true;

-- ============================================================================
-- 4. ADD THEME COLORS TO STUDIO PROFILE (from PR #15)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'studio_profile'
    AND column_name = 'theme_primary_color'
  ) THEN
    ALTER TABLE studio_profile
      ADD COLUMN theme_primary_color TEXT,
      ADD COLUMN theme_secondary_color TEXT,
      ADD COLUMN theme_accent_color TEXT;
  END IF;
END $$;

-- ============================================================================
-- 5. FUNCTIONS FOR NEWSLETTER MANAGEMENT
-- ============================================================================

-- Function to get blog newsletter subscribers
CREATE OR REPLACE FUNCTION get_blog_newsletter_subscribers()
RETURNS TABLE (
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  subscribed_since TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    eu.email,
    COALESCE(p.first_name, '') as first_name,
    COALESCE(p.last_name, '') as last_name,
    eu.blog_subscriber_since as subscribed_since
  FROM email_campaign_unsubscribes eu
  LEFT JOIN profiles p ON eu.email = p.email
  WHERE eu.blog_subscriber_since IS NOT NULL
    AND eu.unsubscribed_at IS NULL
    AND NOT ('blog_newsletter' = ANY(eu.unsubscribe_categories))
    AND NOT ('all' = ANY(eu.unsubscribe_categories));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to subscribe to blog newsletter
CREATE OR REPLACE FUNCTION subscribe_to_blog_newsletter(
  p_email TEXT,
  p_name TEXT DEFAULT NULL,
  p_source VARCHAR(50) DEFAULT 'website_form'
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Insert or update subscription
  INSERT INTO email_campaign_unsubscribes (
    email,
    unsubscribed_at,
    unsubscribe_categories,
    blog_subscriber_since,
    blog_subscription_source
  ) VALUES (
    p_email,
    NULL,
    ARRAY[]::TEXT[], -- Empty array = subscribed to all
    NOW(),
    p_source
  )
  ON CONFLICT (email)
  DO UPDATE SET
    unsubscribed_at = NULL,
    unsubscribe_categories = ARRAY[]::TEXT[],
    blog_subscriber_since = COALESCE(email_campaign_unsubscribes.blog_subscriber_since, NOW()),
    blog_subscription_source = COALESCE(email_campaign_unsubscribes.blog_subscription_source, p_source);

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Successfully subscribed to blog newsletter',
    'email', p_email
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsubscribe from blog newsletter
CREATE OR REPLACE FUNCTION unsubscribe_from_blog_newsletter(
  p_email TEXT,
  p_unsubscribe_all BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_categories TEXT[];
BEGIN
  IF p_unsubscribe_all THEN
    v_categories := ARRAY['all'];
  ELSE
    v_categories := ARRAY['blog_newsletter'];
  END IF;

  UPDATE email_campaign_unsubscribes
  SET
    unsubscribed_at = NOW(),
    unsubscribe_categories = v_categories
  WHERE email = p_email;

  IF FOUND THEN
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Successfully unsubscribed from blog newsletter'
    );
  ELSE
    -- Create unsubscribe record if doesn't exist
    INSERT INTO email_campaign_unsubscribes (
      email,
      unsubscribed_at,
      unsubscribe_categories
    ) VALUES (
      p_email,
      NOW(),
      v_categories
    );

    v_result := jsonb_build_object(
      'success', true,
      'message', 'Successfully unsubscribed from blog newsletter'
    );
  END IF;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically send newsletter when blog post is published
CREATE OR REPLACE FUNCTION auto_send_blog_newsletter()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id UUID;
  v_subscriber_count INTEGER;
BEGIN
  -- Only process when status changes to 'published' and send_newsletter is true
  IF NEW.status = 'published' AND NEW.send_newsletter = true
     AND (OLD.status != 'published' OR NEW.newsletter_sent_at IS NULL) THEN

    -- Count subscribers
    SELECT COUNT(*) INTO v_subscriber_count
    FROM email_campaign_unsubscribes
    WHERE blog_subscriber_since IS NOT NULL
      AND unsubscribed_at IS NULL
      AND NOT ('blog_newsletter' = ANY(unsubscribe_categories))
      AND NOT ('all' = ANY(unsubscribe_categories));

    -- Create email campaign
    INSERT INTO email_campaigns (
      campaign_name,
      subject_line,
      email_body_html,
      campaign_category,
      blog_post_id,
      target_audience,
      status,
      total_recipients
    ) VALUES (
      'Blog Newsletter: ' || NEW.title,
      NEW.title,
      NEW.content,
      'blog_newsletter',
      NEW.id,
      'blog-subscribers',
      'draft', -- Start as draft, staff can review and send
      v_subscriber_count
    )
    RETURNING id INTO v_campaign_id;

    -- Link campaign to blog post
    NEW.newsletter_campaign_id = v_campaign_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_send_blog_newsletter ON blog_posts;
CREATE TRIGGER trigger_auto_send_blog_newsletter
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION auto_send_blog_newsletter();

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_blog_posts_updated_at_trigger ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at_trigger
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on blog_posts
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Blog posts policies
CREATE POLICY "Published blog posts are viewable by everyone"
  ON blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage blog posts"
  ON blog_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'staff')
    )
  );

-- ============================================================================
-- 8. VIEWS FOR NEWSLETTER MANAGEMENT
-- ============================================================================

-- View for newsletter subscriber statistics
CREATE OR REPLACE VIEW newsletter_subscriber_stats AS
SELECT
  COUNT(*) FILTER (WHERE blog_subscriber_since IS NOT NULL AND unsubscribed_at IS NULL) as active_subscribers,
  COUNT(*) FILTER (WHERE blog_subscriber_since IS NOT NULL AND unsubscribed_at IS NOT NULL) as unsubscribed,
  COUNT(*) FILTER (WHERE blog_subscriber_since IS NOT NULL AND 'blog_newsletter' = ANY(unsubscribe_categories)) as blog_only_unsubscribed,
  COUNT(*) FILTER (WHERE blog_subscriber_since >= NOW() - INTERVAL '30 days') as new_subscribers_30d,
  COUNT(*) FILTER (WHERE blog_subscriber_since >= NOW() - INTERVAL '7 days') as new_subscribers_7d
FROM email_campaign_unsubscribes;

-- Grant SELECT permission on view
GRANT SELECT ON newsletter_subscriber_stats TO authenticated;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Blog posts
GRANT SELECT ON blog_posts TO authenticated;
GRANT SELECT ON blog_posts TO anon;
GRANT ALL ON blog_posts TO service_role;

-- Newsletter functions
GRANT EXECUTE ON FUNCTION get_blog_newsletter_subscribers() TO authenticated;
GRANT EXECUTE ON FUNCTION subscribe_to_blog_newsletter(TEXT, TEXT, VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION unsubscribe_from_blog_newsletter(TEXT, BOOLEAN) TO anon, authenticated;

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE blog_posts IS 'Blog posts for studio website with integrated newsletter functionality';
COMMENT ON COLUMN email_campaign_unsubscribes.unsubscribe_categories IS 'Array of categories user has unsubscribed from: all, studio_updates, blog_newsletter, marketing, etc.';
COMMENT ON COLUMN email_campaign_unsubscribes.blog_subscriber_since IS 'Timestamp when user subscribed to blog newsletter';
COMMENT ON COLUMN email_campaigns.campaign_category IS 'Category of email campaign for better organization and filtering';
COMMENT ON FUNCTION subscribe_to_blog_newsletter IS 'Subscribes an email address to the blog newsletter';
COMMENT ON FUNCTION unsubscribe_from_blog_newsletter IS 'Unsubscribes an email from blog newsletter or all emails';
COMMENT ON FUNCTION get_blog_newsletter_subscribers IS 'Returns list of active blog newsletter subscribers';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Benefits of this approach:
-- 1. Single unsubscribe management system
-- 2. Newsletter campaigns tracked with other email campaigns
-- 3. Consistent delivery tracking (opens, clicks, bounces)
-- 4. No duplicate subscriber records
-- 5. Better compliance with email regulations (CAN-SPAM, GDPR)
-- 6. Unified parent communication dashboard
