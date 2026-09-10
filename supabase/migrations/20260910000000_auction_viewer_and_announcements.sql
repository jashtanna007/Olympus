-- ╔══════════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Auction viewer access + announcement feed         ║
-- ║  SAFE: additive only, no existing tables modified            ║
-- ╚══════════════════════════════════════════════════════════════╝

BEGIN;

-- ============================================================
-- 1. Site setting: viewer auction visibility (default OFF)
-- ============================================================
INSERT INTO public.site_settings (key, value)
VALUES ('auction_visible_to_viewers', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. RPC: toggle viewer access (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.toggle_auction_viewer_access(p_visible BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.auction_require_admin();
  INSERT INTO public.site_settings (key, value, updated_at)
  VALUES ('auction_visible_to_viewers', to_jsonb(p_visible), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_auction_viewer_access(BOOLEAN) TO authenticated;

-- ============================================================
-- 3. auction_announcements table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auction_announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message    TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auction_announcements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read announcements
DROP POLICY IF EXISTS "Authenticated can read announcements" ON public.auction_announcements;
CREATE POLICY "Authenticated can read announcements"
  ON public.auction_announcements FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.auction_announcements;
CREATE POLICY "Admins can insert announcements"
  ON public.auction_announcements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_auction_admin());

-- ============================================================
-- 4. RPC: send announcement (admin guard)
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_auction_announcement(p_message TEXT)
RETURNS public.auction_announcements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.auction_announcements%ROWTYPE;
  v_uid UUID;
BEGIN
  PERFORM public.auction_require_admin();
  v_uid := auth.uid();
  INSERT INTO public.auction_announcements (message, created_by)
  VALUES (trim(p_message), v_uid)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_auction_announcement(TEXT) TO authenticated;

-- ============================================================
-- 5. Grant table access
-- ============================================================
GRANT SELECT ON public.auction_announcements TO authenticated;
GRANT INSERT ON public.auction_announcements TO authenticated;
GRANT ALL   ON public.auction_announcements TO service_role;

-- ============================================================
-- 6. Enable realtime on announcements table
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_announcements;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

COMMIT;
