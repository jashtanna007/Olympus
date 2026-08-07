-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Generic Match Core (multi-sport foundation)    ║
-- ║  Run AFTER create_franchises.sql, create_auction_tables. ║
-- ╚══════════════════════════════════════════════════════════╝
--
-- Cricket is the first detail implementation built on this shell.
-- Other sports later add their own `<sport>_*` tables referencing `matches`.

BEGIN;

-- ============================================================
-- 0. CLEAN SLATE
-- These tables are introduced by this feature and hold no production data yet.
-- Dropping any earlier/partial version guarantees the schema below is applied
-- even if an incompatible `matches` table already exists.
-- Cricket detail tables are dropped first because they reference these.
-- ============================================================
DROP TABLE IF EXISTS public.cricket_deliveries CASCADE;
DROP TABLE IF EXISTS public.cricket_innings CASCADE;
DROP TABLE IF EXISTS public.match_players CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;

-- ============================================================
-- 1. MATCHES  (generic shell shared by every sport)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport                  TEXT NOT NULL DEFAULT 'Cricket'
                           CHECK (sport IN (
                             'Cricket','Football','Basketball','Volleyball',
                             'Badminton','Table Tennis','Chess','Carrom',
                             'Kabaddi','Relay','Arm Wrestling'
                           )),
  franchise_a_id         UUID NOT NULL REFERENCES public.franchises(id) ON DELETE RESTRICT,
  franchise_b_id         UUID NOT NULL REFERENCES public.franchises(id) ON DELETE RESTRICT,
  status                 TEXT NOT NULL DEFAULT 'scheduled'
                           CHECK (status IN ('scheduled','live','innings_break','completed','abandoned')),
  scheduled_at           TIMESTAMPTZ,
  venue                  TEXT,
  assigned_scorer_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Format config (T20 rules; overs default to 10 for the fest).
  overs_per_innings      INTEGER NOT NULL DEFAULT 10 CHECK (overs_per_innings BETWEEN 1 AND 90),
  players_per_side       INTEGER NOT NULL DEFAULT 11 CHECK (players_per_side BETWEEN 2 AND 11),
  balls_per_over         INTEGER NOT NULL DEFAULT 6  CHECK (balls_per_over BETWEEN 1 AND 12),
  wide_noball_penalty    INTEGER NOT NULL DEFAULT 1  CHECK (wide_noball_penalty BETWEEN 0 AND 5),

  -- Toss (set by the scorer console before innings 1).
  toss_winner_franchise_id UUID REFERENCES public.franchises(id) ON DELETE SET NULL,
  toss_decision          TEXT CHECK (toss_decision IN ('bat','bowl')),

  -- Result (set on completion).
  result_summary         TEXT,
  winner_franchise_id    UUID REFERENCES public.franchises(id) ON DELETE SET NULL,
  is_tie                 BOOLEAN NOT NULL DEFAULT FALSE,

  created_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT matches_distinct_franchises CHECK (franchise_a_id <> franchise_b_id)
);

-- Defensive column additions in case matches existed without all columns
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS sport TEXT NOT NULL DEFAULT 'Cricket';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS overs_per_innings INTEGER NOT NULL DEFAULT 10;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS players_per_side INTEGER NOT NULL DEFAULT 11;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS balls_per_over INTEGER NOT NULL DEFAULT 6;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS wide_noball_penalty INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS toss_winner_franchise_id UUID REFERENCES public.franchises(id) ON DELETE SET NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS toss_decision TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS result_summary TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS winner_franchise_id UUID REFERENCES public.franchises(id) ON DELETE SET NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS is_tie BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS matches_sport_idx  ON public.matches (sport);
CREATE INDEX IF NOT EXISTS matches_status_idx ON public.matches (status);
CREATE INDEX IF NOT EXISTS matches_scorer_idx ON public.matches (assigned_scorer_id);

-- ============================================================
-- 2. MATCH PLAYERS  (per-match playing XI snapshot)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.match_players (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  franchise_id     UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  registration_id  UUID REFERENCES public.player_registrations(id) ON DELETE SET NULL,
  full_name        TEXT NOT NULL CHECK (length(trim(full_name)) > 0),
  batting_order    SMALLINT NOT NULL DEFAULT 0,
  is_playing       BOOLEAN NOT NULL DEFAULT TRUE,
  role             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS match_players_match_idx     ON public.match_players (match_id);
CREATE INDEX IF NOT EXISTS match_players_franchise_idx ON public.match_players (franchise_id);

-- A registered player may appear only once per match.
CREATE UNIQUE INDEX IF NOT EXISTS match_players_unique_registration
  ON public.match_players (match_id, registration_id)
  WHERE registration_id IS NOT NULL;

-- ============================================================
-- 3. UPDATED_AT TRIGGER (reuse the franchise helper)
-- ============================================================
DROP TRIGGER IF EXISTS matches_set_updated_at ON public.matches;
CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_franchise_updated_at();

-- ============================================================
-- 4. ACCESS HELPER — is the current user allowed to score this match?
--    (assigned scorer OR any admin/auctioneer administrator)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_match_scorer(p_match_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_assigned UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','scorer','auctioneer')
  ) INTO v_is_admin;

  -- Admins may operate any match.
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  SELECT assigned_scorer_id INTO v_assigned
  FROM public.matches WHERE id = p_match_id;

  -- A scorer may operate only the match they are assigned to.
  RETURN v_assigned IS NOT NULL AND v_assigned = auth.uid();
END;
$$;

-- Admin/auctioneer check reused for match creation & squad edits.
-- (public.is_auction_admin() already exists from auction_admin_policies.sql)

-- List assignable scorers (admin-only; profiles aren't broadly readable).
CREATE OR REPLACE FUNCTION public.list_match_scorers()
RETURNS TABLE (id UUID, email TEXT, role TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.email, p.role
  FROM public.profiles p
  WHERE public.is_auction_admin()
    AND p.role IN ('scorer', 'admin', 'auctioneer')
  ORDER BY p.email;
$$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view matches" ON public.matches;
DROP POLICY IF EXISTS "Authenticated can view match players" ON public.match_players;
DROP POLICY IF EXISTS "Admins can insert matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can update matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can manage match players" ON public.match_players;

-- Everyone authenticated can watch.
CREATE POLICY "Authenticated can view matches"
  ON public.matches FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated can view match players"
  ON public.match_players FOR SELECT TO authenticated USING (TRUE);

-- Admins create & edit matches directly (scoring itself flows through RPCs).
CREATE POLICY "Admins can insert matches"
  ON public.matches FOR INSERT TO authenticated
  WITH CHECK (public.is_auction_admin());

CREATE POLICY "Admins can update matches"
  ON public.matches FOR UPDATE TO authenticated
  USING (public.is_auction_admin())
  WITH CHECK (public.is_auction_admin());

DROP POLICY IF EXISTS "Admins can delete matches" ON public.matches;
CREATE POLICY "Admins can delete matches"
  ON public.matches FOR DELETE TO authenticated
  USING (public.is_auction_admin());

CREATE POLICY "Admins can manage match players"
  ON public.match_players FOR ALL TO authenticated
  USING (public.is_auction_admin())
  WITH CHECK (public.is_auction_admin());

REVOKE ALL ON public.matches       FROM anon;
REVOKE ALL ON public.match_players FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_players TO authenticated;

GRANT ALL ON public.matches       TO service_role;
GRANT ALL ON public.match_players TO service_role;

GRANT EXECUTE ON FUNCTION public.is_match_scorer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_match_scorers() TO authenticated;

-- ============================================================
-- 6. REALTIME (Idempotent publication additions)
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_players;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
END $$;

COMMIT;
