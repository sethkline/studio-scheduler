-- Migration: Ticket PDFs Storage Setup
-- Created: 2025-11-17
-- Description: Creates Supabase Storage bucket for ticket PDFs with RLS policies

-- ============================================
-- CREATE STORAGE BUCKET
-- ============================================

-- Create bucket for ticket PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-pdfs', 'ticket-pdfs', true)
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN storage.buckets.public IS 'Public access for ticket PDFs allows customers to download via URL';

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Policy: Anyone can download ticket PDFs (public read access)
CREATE POLICY "Public ticket PDF download access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ticket-pdfs');

-- Policy: Only authenticated admin/staff can upload ticket PDFs
CREATE POLICY "Admin and staff can upload ticket PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-pdfs' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);

-- Policy: Only authenticated admin/staff can update ticket PDFs
CREATE POLICY "Admin and staff can update ticket PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ticket-pdfs' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role IN ('admin', 'staff')
  )
);

-- Policy: Only authenticated admin can delete ticket PDFs
CREATE POLICY "Admin can delete ticket PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-pdfs' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);

-- ============================================
-- NOTES
-- ============================================

-- Ticket PDFs are public to allow customers to download via URL
-- without authentication (sent via email)
--
-- Security considerations:
-- 1. PDF filenames are UUIDs (not guessable)
-- 2. QR codes contain unique tokens for validation
-- 3. Tickets can only be scanned once
-- 4. Only admin/staff can upload/manage PDFs
-- 5. Customers receive URLs via email after purchase
