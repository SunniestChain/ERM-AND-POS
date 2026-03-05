-- ============================================================
-- Supabase Security Linter Fixes
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1) FIX: admin_stats SECURITY DEFINER view
--    Recreate without SECURITY DEFINER so it uses invoker's permissions
-- ============================================================

-- First drop the existing view
DROP VIEW IF EXISTS public.admin_stats;

-- Recreate as SECURITY INVOKER (safe default)
CREATE VIEW public.admin_stats
WITH (security_invoker = true)
AS
SELECT
  -- Total stock across all variants
  COALESCE(SUM(pv.stock_quantity), 0) AS total_stock,
  -- Total inventory value (stock × price)
  COALESCE(SUM(pv.stock_quantity * pv.price), 0) AS total_value,
  -- Sales today
  COALESCE((
    SELECT SUM(s.total_amount)
    FROM public.sales s
    WHERE s.created_at::date = CURRENT_DATE
  ), 0) AS sales_today,
  -- Sales this week
  COALESCE((
    SELECT SUM(s.total_amount)
    FROM public.sales s
    WHERE s.created_at >= date_trunc('week', CURRENT_DATE)
  ), 0) AS sales_week,
  -- Sales this month
  COALESCE((
    SELECT SUM(s.total_amount)
    FROM public.sales s
    WHERE s.created_at >= date_trunc('month', CURRENT_DATE)
  ), 0) AS sales_month,
  -- Sales this year
  COALESCE((
    SELECT SUM(s.total_amount)
    FROM public.sales s
    WHERE s.created_at >= date_trunc('year', CURRENT_DATE)
  ), 0) AS sales_year
FROM public.product_variants pv;

-- Grant access so the service role can still query it
GRANT SELECT ON public.admin_stats TO service_role;
GRANT SELECT ON public.admin_stats TO authenticated;


-- ============================================================
-- 2) ENABLE RLS on all 12 public tables
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3) RLS POLICIES: service_role gets full access (your Rust backend)
--    NOTE: service_role ALREADY bypasses RLS by default in Supabase,
--    so these policies are technically optional but good practice.
-- ============================================================

-- Users table
CREATE POLICY "service_role_full_access" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Manufacturers table
CREATE POLICY "service_role_full_access" ON public.manufacturers
  FOR ALL USING (auth.role() = 'service_role');

-- Allow anonymous read for catalog browsing
CREATE POLICY "anon_read_manufacturers" ON public.manufacturers
  FOR SELECT USING (true);

-- Engines table
CREATE POLICY "service_role_full_access" ON public.engines
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_read_engines" ON public.engines
  FOR SELECT USING (true);

-- Products table
CREATE POLICY "service_role_full_access" ON public.products
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_read_products" ON public.products
  FOR SELECT USING (true);

-- Categories table
CREATE POLICY "service_role_full_access" ON public.categories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_read_categories" ON public.categories
  FOR SELECT USING (true);

-- Product variants table
CREATE POLICY "service_role_full_access" ON public.product_variants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_read_product_variants" ON public.product_variants
  FOR SELECT USING (true);

-- Suppliers table
CREATE POLICY "service_role_full_access" ON public.suppliers
  FOR ALL USING (auth.role() = 'service_role');

-- Sale items table
CREATE POLICY "service_role_full_access" ON public.sale_items
  FOR ALL USING (auth.role() = 'service_role');

-- App users table (SENSITIVE - no anon access!)
CREATE POLICY "service_role_full_access" ON public.app_users
  FOR ALL USING (auth.role() = 'service_role');

-- Sales table
CREATE POLICY "service_role_full_access" ON public.sales
  FOR ALL USING (auth.role() = 'service_role');

-- Product engines table
CREATE POLICY "service_role_full_access" ON public.product_engines
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_read_product_engines" ON public.product_engines
  FOR SELECT USING (true);

-- Cart items table (private per user)
CREATE POLICY "service_role_full_access" ON public.cart_items
  FOR ALL USING (auth.role() = 'service_role');

-- Users table (legacy, SENSITIVE - no anon access!)
-- No anon policy = anon can't read passwords


-- ============================================================
-- DONE! Re-run the Supabase Linter to verify all 15 errors are resolved.
-- Your Rust backend uses service_role key and will NOT be affected.
-- ============================================================
