-- ============================================================
-- Supabase Performance Linter Fixes (WARN level)
-- Run AFTER fix_security_linter.sql
-- Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1) DROP all existing policies (clean slate)
-- ============================================================

-- Tables with service_role + anon policies
DROP POLICY IF EXISTS "service_role_full_access" ON public.manufacturers;
DROP POLICY IF EXISTS "anon_read_manufacturers" ON public.manufacturers;

DROP POLICY IF EXISTS "service_role_full_access" ON public.engines;
DROP POLICY IF EXISTS "anon_read_engines" ON public.engines;

DROP POLICY IF EXISTS "service_role_full_access" ON public.products;
DROP POLICY IF EXISTS "anon_read_products" ON public.products;

DROP POLICY IF EXISTS "service_role_full_access" ON public.categories;
DROP POLICY IF EXISTS "anon_read_categories" ON public.categories;

DROP POLICY IF EXISTS "service_role_full_access" ON public.product_variants;
DROP POLICY IF EXISTS "anon_read_product_variants" ON public.product_variants;

DROP POLICY IF EXISTS "service_role_full_access" ON public.product_engines;
DROP POLICY IF EXISTS "anon_read_product_engines" ON public.product_engines;

-- Tables with only service_role policy
DROP POLICY IF EXISTS "service_role_full_access" ON public.users;
DROP POLICY IF EXISTS "service_role_full_access" ON public.suppliers;
DROP POLICY IF EXISTS "service_role_full_access" ON public.sale_items;
DROP POLICY IF EXISTS "service_role_full_access" ON public.app_users;
DROP POLICY IF EXISTS "service_role_full_access" ON public.sales;
DROP POLICY IF EXISTS "service_role_full_access" ON public.cart_items;


-- ============================================================
-- 2) RECREATE policies with TWO fixes:
--    a) (select auth.role()) instead of auth.role()  → fixes initplan warning
--    b) TO <specific_role>                           → fixes multiple_permissive warning
-- ============================================================

-- ── users (sensitive, no public access) ──
CREATE POLICY "service_role_all" ON public.users
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── app_users (sensitive, no public access) ──
CREATE POLICY "service_role_all" ON public.app_users
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── sales (private) ──
CREATE POLICY "service_role_all" ON public.sales
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── sale_items (private) ──
CREATE POLICY "service_role_all" ON public.sale_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── suppliers (private) ──
CREATE POLICY "service_role_all" ON public.suppliers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── cart_items (private) ──
CREATE POLICY "service_role_all" ON public.cart_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── manufacturers (public read) ──
CREATE POLICY "service_role_all" ON public.manufacturers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "public_read" ON public.manufacturers
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── engines (public read) ──
CREATE POLICY "service_role_all" ON public.engines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "public_read" ON public.engines
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── products (public read) ──
CREATE POLICY "service_role_all" ON public.products
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "public_read" ON public.products
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── categories (public read) ──
CREATE POLICY "service_role_all" ON public.categories
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "public_read" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── product_variants (public read) ──
CREATE POLICY "service_role_all" ON public.product_variants
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "public_read" ON public.product_variants
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── product_engines (public read) ──
CREATE POLICY "service_role_all" ON public.product_engines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "public_read" ON public.product_engines
  FOR SELECT TO anon, authenticated
  USING (true);


-- ============================================================
-- DONE! Both warning types resolved:
--   ✅ auth_rls_initplan  → eliminated auth.role() calls entirely
--   ✅ multiple_permissive → each role has exactly one policy per action
-- ============================================================
