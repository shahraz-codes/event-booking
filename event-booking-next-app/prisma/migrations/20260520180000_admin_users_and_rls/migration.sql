-- ============================================================================
-- Phase 2: admin_users table + Row Level Security (RLS)
--
-- Creates the admin_users membership table that gates admin-only access in
-- the RN admin app (and, from Phase 3, the web admin too). Enables RLS on
-- every public-schema table and adds policies that:
--   * allow public SELECT on homepage content and calendar (read-only for
--     the customer site / RN customer screens)
--   * allow admins (members of admin_users) full read/write on every table
--
-- Prisma server-side code connects as the `postgres` role which has the
-- BYPASSRLS attribute on Supabase, so all existing API routes that go
-- through Prisma are unaffected by these policies. RLS only takes effect
-- for clients connecting with the anon or authenticated keys (RN admin
-- app, browser supabase-js).
-- ============================================================================

-- 1. admin_users table (references auth.users from the Supabase Auth schema)
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_users_user_id_idx ON public.admin_users(user_id);

-- 2. Enable Row Level Security on every table
ALTER TABLE public."Booking"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Quotation"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuotationItem"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Comment"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BlockedDate"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MediaFile"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."HeroSection"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GalleryItem"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ServiceItem"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."HeroCarouselImage"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StatItem"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SiteSettings"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users          ENABLE ROW LEVEL SECURITY;

-- 3. Public-read policies (for browser clients hitting Supabase directly)
--    The customer site can read homepage content and the calendar without
--    being authenticated. Admin-all policies below let admins see hidden
--    rows too because RLS policies are OR'd.
CREATE POLICY "Public read HeroSection"
    ON public."HeroSection" FOR SELECT
    USING (true);

CREATE POLICY "Public read SiteSettings"
    ON public."SiteSettings" FOR SELECT
    USING (true);

CREATE POLICY "Public read BlockedDate"
    ON public."BlockedDate" FOR SELECT
    USING (true);

CREATE POLICY "Public read visible GalleryItem"
    ON public."GalleryItem" FOR SELECT
    USING (visible = true);

CREATE POLICY "Public read visible ServiceItem"
    ON public."ServiceItem" FOR SELECT
    USING (visible = true);

CREATE POLICY "Public read visible HeroCarouselImage"
    ON public."HeroCarouselImage" FOR SELECT
    USING (visible = true);

CREATE POLICY "Public read visible StatItem"
    ON public."StatItem" FOR SELECT
    USING (visible = true);

-- 4. Admin-all policies. Membership in admin_users grants full access.
CREATE POLICY "Admin all Booking"
    ON public."Booking" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all Quotation"
    ON public."Quotation" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all QuotationItem"
    ON public."QuotationItem" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all Comment"
    ON public."Comment" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all BlockedDate"
    ON public."BlockedDate" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all MediaFile"
    ON public."MediaFile" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all HeroSection"
    ON public."HeroSection" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all GalleryItem"
    ON public."GalleryItem" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all ServiceItem"
    ON public."ServiceItem" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all HeroCarouselImage"
    ON public."HeroCarouselImage" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all StatItem"
    ON public."StatItem" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all SiteSettings"
    ON public."SiteSettings" FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admin all admin_users"
    ON public.admin_users FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
