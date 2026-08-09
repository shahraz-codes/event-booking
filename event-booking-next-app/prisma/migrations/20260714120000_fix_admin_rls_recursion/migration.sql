-- Fix 1: resolve the recursive RLS policy on public.admin_users that made the
-- RN admin app's checkAdmin() (a direct supabase-js read under the user's
-- session) fail with "infinite recursion detected in policy for relation
-- admin_users". The web app is unaffected because it uses the service-role
-- client / Prisma (BYPASSRLS) and never reads admin_users under RLS.
--
-- Strategy:
--   1. Add a SECURITY DEFINER helper is_admin() whose inner SELECT runs as the
--      function owner and is therefore NOT re-gated by admin_users RLS.
--   2. Replace the recursive admin_users policy with a non-recursive self-read.
--   3. Rewrite every other "Admin all X" policy to call is_admin(), which also
--      removes the identical recursive subquery those policies currently embed.
--
-- NOTE ON POLICY NAMES: the original migration (20260520180000_admin_users_and_rls)
-- named the admin policies "Admin all <Table>". The DROP ... IF EXISTS statements
-- below assume that convention. If any policy was named differently, adjust the
-- DROP name to match before running, otherwise the CREATE will fail on a duplicate.
--
-- NOTE ON RUNNING: if `prisma migrate` cannot execute this DDL against Supabase,
-- run it via the Supabase SQL editor and then mark this migration as applied
-- (`prisma migrate resolve --applied 20260714120000_fix_admin_rls_recursion`)
-- so migration history stays consistent. RLS policies are not modelled in
-- schema.prisma, so no schema.prisma change is required for this migration.

-- 1. Non-recursive membership check ------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 2. admin_users: drop the recursive policy; allow a signed-in user to read
--    ONLY their own membership row. Writes to admin_users are performed
--    server-side with the service role, so no client write policy is needed.
DROP POLICY IF EXISTS "Admin all admin_users" ON public.admin_users;

DROP POLICY IF EXISTS "read own admin row" ON public.admin_users;
CREATE POLICY "read own admin row" ON public.admin_users
  FOR SELECT
  USING (user_id = auth.uid());

-- 3. Rewrite every other admin-all policy to use the non-recursive function ---

DROP POLICY IF EXISTS "Admin all Booking" ON public."Booking";
CREATE POLICY "Admin all Booking" ON public."Booking"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin all Quotation" ON public."Quotation";
CREATE POLICY "Admin all Quotation" ON public."Quotation"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin all QuotationItem" ON public."QuotationItem";
CREATE POLICY "Admin all QuotationItem" ON public."QuotationItem"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin all Comment" ON public."Comment";
CREATE POLICY "Admin all Comment" ON public."Comment"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin all BlockedDate" ON public."BlockedDate";
CREATE POLICY "Admin all BlockedDate" ON public."BlockedDate"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin all MediaFile" ON public."MediaFile";
CREATE POLICY "Admin all MediaFile" ON public."MediaFile"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin all HeroSection" ON public."HeroSection";
CREATE POLICY "Admin all HeroSection" ON public."HeroSection"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin all GalleryItem" ON public."GalleryItem";
CREATE POLICY "Admin all GalleryItem" ON public."GalleryItem"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin all ServiceItem" ON public."ServiceItem";
CREATE POLICY "Admin all ServiceItem" ON public."ServiceItem"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin all HeroCarouselImage" ON public."HeroCarouselImage";
CREATE POLICY "Admin all HeroCarouselImage" ON public."HeroCarouselImage"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin all StatItem" ON public."StatItem";
CREATE POLICY "Admin all StatItem" ON public."StatItem"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin all SiteSettings" ON public."SiteSettings";
CREATE POLICY "Admin all SiteSettings" ON public."SiteSettings"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Public-read policies (HeroSection / SiteSettings / BlockedDate / visible
-- Gallery / Service / Carousel / Stat) from the original migration are left
-- untouched.
