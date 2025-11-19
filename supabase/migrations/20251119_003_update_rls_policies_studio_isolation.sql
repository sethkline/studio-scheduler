-- Migration: Update RLS Policies for Studio Isolation
-- Created: 2025-11-19
-- Description: Updates all RLS policies to enforce studio-level data isolation
-- This is PHASE 3 of multi-tenant migration

-- ============================================
-- STRATEGY:
-- - Replace role-based checks with studio membership checks
-- - Users can only see data from studios they are members of
-- - Public access policies (for ticket sales) remain but are scoped to active studios
-- - Admin/staff roles are checked within the context of their studio membership
-- ============================================

-- ============================================
-- TICKETING TABLES - UPDATE POLICIES
-- ============================================

-- VENUES: Drop old policies, create new studio-scoped policies
DROP POLICY IF EXISTS "Public can view venues" ON venues;
DROP POLICY IF EXISTS "Admin and staff can manage venues" ON venues;

CREATE POLICY "Public can view active studio venues"
  ON venues FOR SELECT
  TO public
  USING (
    studio_id IN (
      SELECT id FROM studios
      WHERE subscription_status = 'active' AND deleted_at IS NULL
    )
  );

CREATE POLICY "Studio members can view their venues"
  ON venues FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage venues"
  ON venues FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- VENUE_SECTIONS: Update policies
DROP POLICY IF EXISTS "Public can view venue sections" ON venue_sections;
DROP POLICY IF EXISTS "Admin and staff can manage venue sections" ON venue_sections;

CREATE POLICY "Public can view active studio venue sections"
  ON venue_sections FOR SELECT
  TO public
  USING (
    studio_id IN (
      SELECT id FROM studios
      WHERE subscription_status = 'active' AND deleted_at IS NULL
    )
  );

CREATE POLICY "Studio members can view their venue sections"
  ON venue_sections FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage venue sections"
  ON venue_sections FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- PRICE_ZONES: Update policies
DROP POLICY IF EXISTS "Public can view price zones" ON price_zones;
DROP POLICY IF EXISTS "Admin and staff can manage price zones" ON price_zones;

CREATE POLICY "Public can view active studio price zones"
  ON price_zones FOR SELECT
  TO public
  USING (
    studio_id IN (
      SELECT id FROM studios
      WHERE subscription_status = 'active' AND deleted_at IS NULL
    )
  );

CREATE POLICY "Studio members can view their price zones"
  ON price_zones FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage price zones"
  ON price_zones FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- SEATS: Update policies
DROP POLICY IF EXISTS "Public can view seats" ON seats;
DROP POLICY IF EXISTS "Admin and staff can manage seats" ON seats;

CREATE POLICY "Public can view active studio seats"
  ON seats FOR SELECT
  TO public
  USING (
    studio_id IN (
      SELECT id FROM studios
      WHERE subscription_status = 'active' AND deleted_at IS NULL
    )
  );

CREATE POLICY "Studio members can view their seats"
  ON seats FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage seats"
  ON seats FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- SHOW_SEATS: Update policies
DROP POLICY IF EXISTS "Anyone can view show seats" ON show_seats;
DROP POLICY IF EXISTS "Admin and staff can insert show seats" ON show_seats;
DROP POLICY IF EXISTS "Admin and staff can update show seats" ON show_seats;
DROP POLICY IF EXISTS "Admin and staff can delete show seats" ON show_seats;

CREATE POLICY "Public can view active studio show seats"
  ON show_seats FOR SELECT
  TO public
  USING (
    studio_id IN (
      SELECT id FROM studios
      WHERE subscription_status = 'active' AND deleted_at IS NULL
    )
  );

CREATE POLICY "Studio members can view their show seats"
  ON show_seats FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage show seats"
  ON show_seats FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- TICKET_ORDERS: Update policies
-- Keep existing customer email-based access but add studio isolation
DROP POLICY IF EXISTS "Customers can view their own orders" ON ticket_orders;
DROP POLICY IF EXISTS "Admin and staff can view all orders" ON ticket_orders;
DROP POLICY IF EXISTS "Admin and staff can insert orders" ON ticket_orders;
DROP POLICY IF EXISTS "Admin and staff can update orders" ON ticket_orders;
DROP POLICY IF EXISTS "Admin and staff can delete orders" ON ticket_orders;

CREATE POLICY "Customers can view their orders"
  ON ticket_orders FOR SELECT
  TO authenticated
  USING (
    customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

CREATE POLICY "Studio admins can manage orders"
  ON ticket_orders FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- TICKETS: Update policies
DROP POLICY IF EXISTS "Customers can view their own tickets" ON tickets;
DROP POLICY IF EXISTS "Admin and staff can insert tickets" ON tickets;
DROP POLICY IF EXISTS "Admin and staff can update tickets" ON tickets;
DROP POLICY IF EXISTS "Admin and staff can delete tickets" ON tickets;

CREATE POLICY "Customers can view their tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ticket_orders
      WHERE ticket_orders.id = tickets.ticket_order_id
      AND (
        ticket_orders.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR user_is_studio_admin_or_staff(auth.uid(), ticket_orders.studio_id)
      )
    )
  );

CREATE POLICY "Studio admins can manage tickets"
  ON tickets FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- TICKET_ORDER_ITEMS: Update policies
DROP POLICY IF EXISTS "Customers can view their own order items" ON ticket_order_items;
DROP POLICY IF EXISTS "Admin and staff can insert order items" ON ticket_order_items;
DROP POLICY IF EXISTS "Admin and staff can update order items" ON ticket_order_items;
DROP POLICY IF EXISTS "Admin and staff can delete order items" ON ticket_order_items;

CREATE POLICY "Customers can view their order items"
  ON ticket_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ticket_orders
      WHERE ticket_orders.id = ticket_order_items.ticket_order_id
      AND (
        ticket_orders.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR user_is_studio_admin_or_staff(auth.uid(), ticket_orders.studio_id)
      )
    )
  );

CREATE POLICY "Studio admins can manage order items"
  ON ticket_order_items FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- ============================================
-- PAYMENT TABLES - UPDATE POLICIES
-- ============================================

-- PAYMENT_METHODS: Update policies
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can manage their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Staff can view all payment methods" ON payment_methods;

CREATE POLICY "Users can view their payment methods in their studios"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() AND status = 'active'))
    OR user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

CREATE POLICY "Users can manage their payment methods in their studios"
  ON payment_methods FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() AND studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() AND status = 'active')
  )
  WITH CHECK (
    user_id = auth.uid() AND studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() AND status = 'active')
  );

-- REFUNDS: Update policies
DROP POLICY IF EXISTS "Staff can manage refunds" ON refunds;
DROP POLICY IF EXISTS "Users can view their refunds" ON refunds;

CREATE POLICY "Studio admins can manage refunds"
  ON refunds FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

CREATE POLICY "Users can view their studio refunds"
  ON refunds FOR SELECT
  TO authenticated
  USING (
    studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() AND status = 'active')
    AND (
      requested_by = auth.uid()
      OR user_is_studio_admin_or_staff(auth.uid(), studio_id)
    )
  );

-- STUDIO_CREDITS: Update policies
DROP POLICY IF EXISTS "Users can view their own credits" ON studio_credits;
DROP POLICY IF EXISTS "Staff can view all credits" ON studio_credits;
DROP POLICY IF EXISTS "Staff can manage credits" ON studio_credits;

CREATE POLICY "Users can view their studio credits"
  ON studio_credits FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() AND status = 'active'))
    OR user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

CREATE POLICY "Studio admins can manage credits"
  ON studio_credits FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- STUDIO_CREDIT_TRANSACTIONS: Update policies
DROP POLICY IF EXISTS "Users can view their own credit transactions" ON studio_credit_transactions;
DROP POLICY IF EXISTS "Staff can view all credit transactions" ON studio_credit_transactions;
DROP POLICY IF EXISTS "System can insert credit transactions" ON studio_credit_transactions;

CREATE POLICY "Users can view their studio credit transactions"
  ON studio_credit_transactions FOR SELECT
  TO authenticated
  USING (
    studio_credit_id IN (
      SELECT id FROM studio_credits
      WHERE (user_id = auth.uid() OR user_is_studio_admin_or_staff(auth.uid(), studio_id))
      AND studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() AND status = 'active')
    )
  );

CREATE POLICY "System can insert credit transactions"
  ON studio_credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- CORE DATA TABLES - CREATE NEW POLICIES
-- ============================================

-- STUDENTS: Create studio-scoped policies
CREATE POLICY "Studio members can view their studio students"
  ON students FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage students"
  ON students FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- TEACHERS: Create studio-scoped policies
CREATE POLICY "Studio members can view their studio teachers"
  ON teachers FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage teachers"
  ON teachers FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- DANCE_STYLES: Create studio-scoped policies
CREATE POLICY "Studio members can view their dance styles"
  ON dance_styles FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage dance styles"
  ON dance_styles FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- CLASS_LEVELS: Create studio-scoped policies
CREATE POLICY "Studio members can view their class levels"
  ON class_levels FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage class levels"
  ON class_levels FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- CLASS_DEFINITIONS: Create studio-scoped policies
CREATE POLICY "Studio members can view their class definitions"
  ON class_definitions FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage class definitions"
  ON class_definitions FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- CLASS_INSTANCES: Create studio-scoped policies
CREATE POLICY "Studio members can view their class instances"
  ON class_instances FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage class instances"
  ON class_instances FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- ENROLLMENTS: Create studio-scoped policies
CREATE POLICY "Studio members can view their enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage enrollments"
  ON enrollments FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- SCHEDULES: Create studio-scoped policies
CREATE POLICY "Studio members can view their schedules"
  ON schedules FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage schedules"
  ON schedules FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- SCHEDULE_CLASSES: Create studio-scoped policies
CREATE POLICY "Studio members can view their schedule classes"
  ON schedule_classes FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage schedule classes"
  ON schedule_classes FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- TEACHER_AVAILABILITY: Create studio-scoped policies
CREATE POLICY "Studio members can view teacher availability"
  ON teacher_availability FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage teacher availability"
  ON teacher_availability FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- TEACHER_AVAILABILITY_EXCEPTIONS: Create studio-scoped policies
CREATE POLICY "Studio members can view availability exceptions"
  ON teacher_availability_exceptions FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage availability exceptions"
  ON teacher_availability_exceptions FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- RECITALS: Create studio-scoped policies
CREATE POLICY "Studio members can view their recitals"
  ON recitals FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Public can view active studio recitals"
  ON recitals FOR SELECT
  TO public
  USING (
    studio_id IN (
      SELECT id FROM studios
      WHERE subscription_status = 'active' AND deleted_at IS NULL
    )
  );

CREATE POLICY "Studio admins can manage recitals"
  ON recitals FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- RECITAL_SHOWS: Create studio-scoped policies
CREATE POLICY "Studio members can view their recital shows"
  ON recital_shows FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Public can view active studio recital shows"
  ON recital_shows FOR SELECT
  TO public
  USING (
    studio_id IN (
      SELECT id FROM studios
      WHERE subscription_status = 'active' AND deleted_at IS NULL
    )
  );

CREATE POLICY "Studio admins can manage recital shows"
  ON recital_shows FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- RECITAL_PROGRAMS: Create studio-scoped policies
CREATE POLICY "Studio members can view their recital programs"
  ON recital_programs FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage recital programs"
  ON recital_programs FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- RECITAL_PERFORMANCES: Create studio-scoped policies
CREATE POLICY "Studio members can view their recital performances"
  ON recital_performances FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage recital performances"
  ON recital_performances FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- ATTENDANCE_RECORDS: Create studio-scoped policies
CREATE POLICY "Studio members can view their attendance records"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage attendance records"
  ON attendance_records FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- ============================================
-- PAYMENT TRANSACTIONS: Create studio-scoped policies
-- ============================================

CREATE POLICY "Studio members can view their payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage payment transactions"
  ON payment_transactions FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- PAYMENT_PLANS: Create studio-scoped policies
CREATE POLICY "Studio members can view their payment plans"
  ON payment_plans FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage payment plans"
  ON payment_plans FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- PAYMENT_PLAN_INSTALLMENTS: Create studio-scoped policies
CREATE POLICY "Studio members can view their installments"
  ON payment_plan_installments FOR SELECT
  TO authenticated
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Studio admins can manage installments"
  ON payment_plan_installments FOR ALL
  TO authenticated
  USING (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  )
  WITH CHECK (
    user_is_studio_admin_or_staff(auth.uid(), studio_id)
  );

-- ============================================
-- MIGRATION COMPLETE - PHASE 3
-- ============================================
-- Next: Phase 4 - Data migration script
-- Next: Phase 5 - Application layer updates (middleware, stores, API handlers)
