-- =====================================================
-- Sample Vendor Data for Costume Catalog
-- =====================================================
-- This file contains sample vendor data for testing
-- the costume catalog system. These are real costume
-- vendors commonly used by dance studios.
-- =====================================================

-- Insert sample vendors
INSERT INTO vendors (name, slug, website_url, contact_email, contact_phone, is_active, is_global, sync_enabled, notes)
VALUES
  (
    'Revolution Dancewear',
    'revolution',
    'https://www.revolutiondancewear.com',
    'orders@revolutiondancewear.com',
    '1-800-555-0100',
    true,
    true,
    false,
    'Major dancewear supplier with extensive costume catalog. Known for quality costumes and competitive pricing.'
  ),
  (
    'Curtain Call Costumes',
    'curtain-call',
    'https://www.curtaincallcostumes.com',
    'info@curtaincallcostumes.com',
    '1-800-555-0200',
    true,
    true,
    false,
    'Specializes in performance costumes for dance recitals. Wide selection of styles and sizes.'
  ),
  (
    'Weissman',
    'weissman',
    'https://www.weissman.com',
    'customerservice@weissman.com',
    '1-800-555-0300',
    true,
    true,
    false,
    'Premium costume manufacturer with high-quality designs. Popular for competition and recital costumes.'
  ),
  (
    'Cicci Dance',
    'cicci',
    'https://www.ciccidance.com',
    'sales@ciccidance.com',
    '1-800-555-0400',
    true,
    true,
    false,
    'Full-service dancewear company offering both ready-made and custom costumes.'
  ),
  (
    'A Wish Come True',
    'wish-come-true',
    'https://www.awishcometrue.com',
    'info@awishcometrue.com',
    '1-800-555-0500',
    true,
    true,
    false,
    'Specializes in children''s performance costumes. Wide range of sizes from toddler to adult.'
  )
ON CONFLICT (slug) DO NOTHING;

-- Display inserted vendors
SELECT 
  id,
  name,
  slug,
  website_url,
  is_active
FROM vendors
ORDER BY name;
