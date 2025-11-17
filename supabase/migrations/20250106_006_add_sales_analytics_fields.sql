-- Migration: Add Sales Analytics Fields
-- Story 2.1.3: Enhanced Ticket Sales Dashboard
-- Adds fields for tracking sales channels and analytics

-- Add sales tracking fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'online', -- 'online', 'box_office', 'phone'
  ADD COLUMN IF NOT EXISTS referred_by VARCHAR(255), -- referral source
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_show_id ON orders(show_id);

-- Create view for daily sales analytics
CREATE OR REPLACE VIEW daily_sales_stats AS
SELECT
  show_id,
  DATE(created_at) as sale_date,
  channel,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue,
  SUM(discount_amount) as total_discounts,
  AVG(total_amount) as avg_order_value,
  COUNT(DISTINCT customer_email) as unique_customers
FROM orders
WHERE status IN ('completed', 'paid')
GROUP BY show_id, DATE(created_at), channel;

-- Create view for show sales summary
CREATE OR REPLACE VIEW show_sales_summary AS
SELECT
  rs.id as show_id,
  rs.recital_id,
  rs.show_date,
  rs.show_time,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(t.id) as tickets_sold,
  SUM(o.total_amount) as total_revenue,
  SUM(o.discount_amount) as total_discounts,
  AVG(o.total_amount) as avg_order_value,
  COUNT(DISTINCT o.customer_email) as unique_customers,
  -- Tickets by status
  COUNT(t.id) FILTER (WHERE t.status = 'active') as active_tickets,
  COUNT(t.id) FILTER (WHERE t.status = 'used') as used_tickets,
  COUNT(t.id) FILTER (WHERE t.status = 'refunded') as refunded_tickets,
  -- Sales by channel
  COUNT(o.id) FILTER (WHERE o.channel = 'online') as online_orders,
  COUNT(o.id) FILTER (WHERE o.channel = 'box_office') as box_office_orders,
  COUNT(o.id) FILTER (WHERE o.channel = 'phone') as phone_orders
FROM recital_shows rs
LEFT JOIN orders o ON rs.id = o.show_id AND o.status IN ('completed', 'paid')
LEFT JOIN tickets t ON o.id = t.order_id
GROUP BY rs.id, rs.recital_id, rs.show_date, rs.show_time;

-- Create view for recital overall sales summary
CREATE OR REPLACE VIEW recital_sales_summary AS
SELECT
  r.id as recital_id,
  r.name as recital_name,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(t.id) as total_tickets_sold,
  SUM(o.total_amount) as total_revenue,
  SUM(o.discount_amount) as total_discounts,
  AVG(o.total_amount) as avg_order_value,
  COUNT(DISTINCT o.customer_email) as unique_customers,
  MIN(o.created_at) as first_sale,
  MAX(o.created_at) as last_sale,
  -- Sales velocity (tickets per day since first sale)
  CASE
    WHEN MIN(o.created_at) IS NOT NULL THEN
      COUNT(t.id)::DECIMAL / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - MIN(o.created_at))) / 86400)
    ELSE 0
  END as tickets_per_day
FROM recitals r
LEFT JOIN recital_shows rs ON r.id = rs.recital_id
LEFT JOIN orders o ON rs.id = o.show_id AND o.status IN ('completed', 'paid')
LEFT JOIN tickets t ON o.id = t.order_id
GROUP BY r.id, r.name;

-- Grant access to views
GRANT SELECT ON daily_sales_stats TO authenticated;
GRANT SELECT ON show_sales_summary TO authenticated;
GRANT SELECT ON recital_sales_summary TO authenticated;

-- Create function to calculate sales projections
CREATE OR REPLACE FUNCTION calculate_sales_projection(recital_uuid UUID)
RETURNS TABLE (
  projected_tickets INTEGER,
  projected_revenue DECIMAL,
  days_until_show INTEGER,
  current_velocity DECIMAL
) AS $$
  WITH recital_stats AS (
    SELECT
      r.id,
      MIN(rs.show_date) as first_show_date,
      COUNT(t.id) as tickets_sold,
      SUM(o.total_amount) as revenue,
      MIN(o.created_at) as first_sale_date,
      EXTRACT(EPOCH FROM (NOW() - MIN(o.created_at))) / 86400 as days_selling
    FROM recitals r
    INNER JOIN recital_shows rs ON r.id = rs.recital_id
    LEFT JOIN orders o ON rs.id = o.show_id AND o.status IN ('completed', 'paid')
    LEFT JOIN tickets t ON o.id = t.order_id
    WHERE r.id = recital_uuid
    GROUP BY r.id
  )
  SELECT
    CASE
      WHEN days_selling > 0 THEN
        (tickets_sold::DECIMAL / days_selling * (EXTRACT(EPOCH FROM (first_show_date - NOW())) / 86400 + days_selling))::INTEGER
      ELSE tickets_sold
    END as projected_tickets,
    CASE
      WHEN days_selling > 0 THEN
        (revenue::DECIMAL / days_selling * (EXTRACT(EPOCH FROM (first_show_date - NOW())) / 86400 + days_selling))
      ELSE revenue
    END as projected_revenue,
    EXTRACT(EPOCH FROM (first_show_date - NOW())) / 86400 as days_until_show,
    CASE
      WHEN days_selling > 0 THEN tickets_sold::DECIMAL / days_selling
      ELSE 0
    END as current_velocity
  FROM recital_stats;
$$ LANGUAGE SQL STABLE;

-- Create function to get peak sales times (for optimizing email sends)
CREATE OR REPLACE FUNCTION get_peak_sales_hours(recital_uuid UUID)
RETURNS TABLE (
  hour_of_day INTEGER,
  order_count BIGINT,
  total_revenue DECIMAL
) AS $$
  SELECT
    EXTRACT(HOUR FROM o.created_at)::INTEGER as hour_of_day,
    COUNT(*) as order_count,
    SUM(o.total_amount) as total_revenue
  FROM orders o
  INNER JOIN recital_shows rs ON o.show_id = rs.id
  WHERE rs.recital_id = recital_uuid
    AND o.status IN ('completed', 'paid')
  GROUP BY EXTRACT(HOUR FROM o.created_at)
  ORDER BY order_count DESC;
$$ LANGUAGE SQL STABLE;

-- Create materialized view for discount code effectiveness (if discount codes exist)
-- This can be refreshed periodically for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS discount_code_analytics AS
SELECT
  o.show_id,
  rs.recital_id,
  -- Assuming discount codes might be tracked in notes or a future field
  o.channel,
  COUNT(o.id) FILTER (WHERE o.discount_amount > 0) as orders_with_discount,
  COUNT(o.id) as total_orders,
  SUM(o.discount_amount) as total_discounts_given,
  AVG(o.discount_amount) as avg_discount_amount,
  (COUNT(o.id) FILTER (WHERE o.discount_amount > 0)::DECIMAL / NULLIF(COUNT(o.id), 0) * 100) as discount_usage_rate
FROM orders o
INNER JOIN recital_shows rs ON o.show_id = rs.id
WHERE o.status IN ('completed', 'paid')
GROUP BY o.show_id, rs.recital_id, o.channel;

CREATE UNIQUE INDEX idx_discount_analytics ON discount_code_analytics(show_id, channel);
GRANT SELECT ON discount_code_analytics TO authenticated;

-- Create function to refresh discount analytics
CREATE OR REPLACE FUNCTION refresh_discount_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY discount_code_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
