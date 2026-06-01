-- ============================================================================
-- Phase 2: Supabase Realtime publication
--
-- Adds tables to the `supabase_realtime` publication so Supabase Realtime
-- emits INSERT/UPDATE/DELETE change events for them. Also sets
-- REPLICA IDENTITY FULL so that UPDATE/DELETE events carry the full row
-- payload (not just the primary key) - the RN admin app and the customer
-- status page need the full row to render diffs without an extra fetch.
--
-- Wrapped in DO blocks for idempotency: the migration is safe to re-run,
-- and it won't fail if the same table was already added to the publication
-- via the Supabase Studio UI.
-- ============================================================================

-- 1. Add tables to the realtime publication (idempotent)
DO $$
DECLARE
    tbl TEXT;
    realtime_tables TEXT[] := ARRAY[
        'Booking',
        'Comment',
        'Quotation',
        'QuotationItem',
        'BlockedDate',
        'MediaFile',
        'HeroSection',
        'GalleryItem',
        'ServiceItem',
        'HeroCarouselImage',
        'StatItem',
        'SiteSettings'
    ];
BEGIN
    FOREACH tbl IN ARRAY realtime_tables LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;

-- 2. Set REPLICA IDENTITY FULL on each table so UPDATE/DELETE realtime
--    payloads include all columns (default REPLICA IDENTITY only includes
--    the primary key, which is insufficient for client-side diffing).
ALTER TABLE public."Booking"           REPLICA IDENTITY FULL;
ALTER TABLE public."Comment"           REPLICA IDENTITY FULL;
ALTER TABLE public."Quotation"         REPLICA IDENTITY FULL;
ALTER TABLE public."QuotationItem"     REPLICA IDENTITY FULL;
ALTER TABLE public."BlockedDate"       REPLICA IDENTITY FULL;
ALTER TABLE public."MediaFile"         REPLICA IDENTITY FULL;
ALTER TABLE public."HeroSection"       REPLICA IDENTITY FULL;
ALTER TABLE public."GalleryItem"       REPLICA IDENTITY FULL;
ALTER TABLE public."ServiceItem"       REPLICA IDENTITY FULL;
ALTER TABLE public."HeroCarouselImage" REPLICA IDENTITY FULL;
ALTER TABLE public."StatItem"          REPLICA IDENTITY FULL;
ALTER TABLE public."SiteSettings"      REPLICA IDENTITY FULL;
