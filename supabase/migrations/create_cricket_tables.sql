-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Cricket detail tables (innings + deliveries)   ║
-- ║  Run AFTER create_match_core.sql                          ║
-- ╚══════════════════════════════════════════════════════════╝
--
-- Event-sourced scoring: `cricket_deliveries` is the source of truth.
-- `cricket_innings` holds running aggregates maintained transactionally by
-- the RPCs in cricket_scoring_engine.sql. Each delivery also stores a snapshot
-- of the pre-ball innings state so "undo last ball" is exact and O(1).

BEGIN;

-- ============================================================
-- 0. CLEAN SLATE (safe: new feature, no production data yet)
-- Deliveries first — they reference innings.
-- ============================================================
DROP TABLE IF EXISTS public.cricket_deliveries CASCADE;
DROP TABLE IF EXISTS public.cricket_innings CASCADE;

-- ============================================================
-- 1. CRICKET INNINGS
-- ============================================================
CREATE TABLE public.cricket_innings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id              UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings_number        SMALLINT NOT NULL CHECK (innings_number IN (1, 2)),
  batting_franchise_id  UUID NOT NULL REFERENCES public.franchises(id) ON DELETE RESTRICT,
  bowling_franchise_id  UUID NOT NULL REFERENCES public.franchises(id) ON DELETE RESTRICT,

  total_runs            INTEGER NOT NULL DEFAULT 0,
  wickets               INTEGER NOT NULL DEFAULT 0,
  legal_balls           INTEGER NOT NULL DEFAULT 0,

  extras_wide           INTEGER NOT NULL DEFAULT 0,
  extras_noball         INTEGER NOT NULL DEFAULT 0,
  extras_bye            INTEGER NOT NULL DEFAULT 0,
  extras_legbye         INTEGER NOT NULL DEFAULT 0,

  target                INTEGER,           -- set for innings 2
  is_closed             BOOLEAN NOT NULL DEFAULT FALSE,

  -- Current on-field pointers (reference match_players).
  striker_id            UUID REFERENCES public.match_players(id) ON DELETE SET NULL,
  non_striker_id        UUID REFERENCES public.match_players(id) ON DELETE SET NULL,
  current_bowler_id     UUID REFERENCES public.match_players(id) ON DELETE SET NULL,
  last_over_bowler_id   UUID REFERENCES public.match_players(id) ON DELETE SET NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cricket_innings_unique UNIQUE (match_id, innings_number)
);

CREATE INDEX IF NOT EXISTS cricket_innings_match_idx ON public.cricket_innings (match_id);

-- ============================================================
-- 2. CRICKET DELIVERIES  (one row per ball; the event log)
-- ============================================================
CREATE TABLE public.cricket_deliveries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id        UUID NOT NULL REFERENCES public.cricket_innings(id) ON DELETE CASCADE,

  global_seq        INTEGER NOT NULL,        -- monotonic per innings; drives Undo ordering
  over_number       INTEGER NOT NULL,        -- 0-based over index
  ball_in_over      INTEGER NOT NULL,        -- 1-based legal-ball position shown to users
  legal_ball_seq    INTEGER,                 -- NULL for wide/no-ball (not a legal ball)

  striker_id        UUID REFERENCES public.match_players(id) ON DELETE SET NULL,
  non_striker_id    UUID REFERENCES public.match_players(id) ON DELETE SET NULL,
  bowler_id         UUID REFERENCES public.match_players(id) ON DELETE SET NULL,

  ball_type         TEXT NOT NULL DEFAULT 'runs'
                      CHECK (ball_type IN ('runs','wide','noball','bye','legbye')),
  runs_batter       INTEGER NOT NULL DEFAULT 0,
  runs_extra        INTEGER NOT NULL DEFAULT 0,

  is_wicket         BOOLEAN NOT NULL DEFAULT FALSE,
  dismissal_type    TEXT CHECK (dismissal_type IN
                      ('bowled','caught','lbw','run_out','stumped','hit_wicket','retired')),
  out_player_id     UUID REFERENCES public.match_players(id) ON DELETE SET NULL,
  fielder_id        UUID REFERENCES public.match_players(id) ON DELETE SET NULL,

  -- Optional shot-tracking for the wagon wheel & pitch map.
  wagon_angle       SMALLINT CHECK (wagon_angle BETWEEN 0 AND 359),
  wagon_distance    SMALLINT CHECK (wagon_distance BETWEEN 0 AND 100),
  pitch_x           SMALLINT CHECK (pitch_x BETWEEN 0 AND 100),
  pitch_y           SMALLINT CHECK (pitch_y BETWEEN 0 AND 100),

  commentary        TEXT,

  -- Pre-ball snapshot of innings state for exact undo.
  prev_striker_id        UUID,
  prev_non_striker_id    UUID,
  prev_bowler_id         UUID,
  prev_last_over_bowler_id UUID,
  prev_total_runs        INTEGER,
  prev_wickets           INTEGER,
  prev_legal_balls       INTEGER,
  prev_extras_wide       INTEGER,
  prev_extras_noball     INTEGER,
  prev_extras_bye        INTEGER,
  prev_extras_legbye     INTEGER,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cricket_deliveries_seq_unique UNIQUE (innings_id, global_seq)
);

CREATE INDEX IF NOT EXISTS cricket_deliveries_innings_idx
  ON public.cricket_deliveries (innings_id, global_seq);

-- ============================================================
-- 3. ROW LEVEL SECURITY
--    Reads open to all authenticated users; NO direct writes
--    (all mutations go through the SECURITY DEFINER RPCs).
-- ============================================================
ALTER TABLE public.cricket_innings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cricket_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view innings" ON public.cricket_innings;
DROP POLICY IF EXISTS "Authenticated can view deliveries" ON public.cricket_deliveries;

CREATE POLICY "Authenticated can view innings"
  ON public.cricket_innings FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated can view deliveries"
  ON public.cricket_deliveries FOR SELECT TO authenticated USING (TRUE);

REVOKE ALL ON public.cricket_innings    FROM anon;
REVOKE ALL ON public.cricket_deliveries FROM anon;
REVOKE ALL ON public.cricket_innings    FROM authenticated;
REVOKE ALL ON public.cricket_deliveries FROM authenticated;

GRANT SELECT ON public.cricket_innings    TO authenticated;
GRANT SELECT ON public.cricket_deliveries TO authenticated;

GRANT ALL ON public.cricket_innings    TO service_role;
GRANT ALL ON public.cricket_deliveries TO service_role;

-- ============================================================
-- 4. REALTIME (Idempotent publication additions)
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cricket_innings;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cricket_deliveries;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
END $$;

COMMIT;
