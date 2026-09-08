-- Add sport-specific config JSONB column to matches table.
-- This is referenced by createMatch() in cricket.js for non-cricket sports
-- (football halves, volleyball sets, basketball quarters, etc.).

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Also allow admins to read all player_registrations so that match creation
-- can show which players are registered for each sport.
-- (Existing policy only lets users see their own row.)
DROP POLICY IF EXISTS "Admins can view all registrations for match setup" ON public.player_registrations;
CREATE POLICY "Admins can view all registrations for match setup"
  ON public.player_registrations FOR SELECT TO authenticated
  USING (public.is_auction_admin());
