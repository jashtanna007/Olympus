-- ╔══════════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Site settings & eligible roll numbers             ║
-- ╚══════════════════════════════════════════════════════════════╝

BEGIN;

-- ============================================================
-- 1. site_settings — key-value store for admin toggles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT 'true'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
DROP POLICY IF EXISTS "Anyone can read site_settings" ON public.site_settings;
CREATE POLICY "Anyone can read site_settings"
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update settings
DROP POLICY IF EXISTS "Admins can update site_settings" ON public.site_settings;
CREATE POLICY "Admins can update site_settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.is_auction_admin())
  WITH CHECK (public.is_auction_admin());

-- Seed default: registration open
INSERT INTO public.site_settings (key, value)
VALUES ('registration_open', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. eligible_roll_numbers — campus whitelist
-- ============================================================
CREATE TABLE IF NOT EXISTS public.eligible_roll_numbers (
  roll_number TEXT PRIMARY KEY,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.eligible_roll_numbers ENABLE ROW LEVEL SECURITY;

-- No direct client access; only RPC reads this
DROP POLICY IF EXISTS "No direct access to eligible_roll_numbers" ON public.eligible_roll_numbers;
CREATE POLICY "No direct access to eligible_roll_numbers"
  ON public.eligible_roll_numbers FOR SELECT
  TO authenticated
  USING (false);

-- ============================================================
-- 3. RPC: check if a roll number is eligible
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_roll_eligible(p_roll TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- If table is empty, allow all (whitelist not yet populated)
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.eligible_roll_numbers LIMIT 1)
    THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.eligible_roll_numbers
      WHERE roll_number = p_roll AND active = true
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.check_roll_eligible(TEXT) TO authenticated;

-- ============================================================
-- 4. RPC: toggle registration (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.toggle_registration(p_open BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.auction_require_admin();
  UPDATE public.site_settings
  SET value = to_jsonb(p_open), updated_at = now()
  WHERE key = 'registration_open';
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_registration(BOOLEAN) TO authenticated;

COMMIT;
