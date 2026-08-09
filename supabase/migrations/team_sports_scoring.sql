-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Team-sport scoring (Football / Volleyball /    ║
-- ║  Basketball). Run AFTER create_match_core.sql.            ║
-- ╚══════════════════════════════════════════════════════════╝
--
-- These sports reuse the generic `public.matches` shell. Scoring mutations
-- flow through SECURITY DEFINER RPCs guarded by is_match_scorer() — the same
-- contract used by cricket_scoring_engine.sql. Direct table writes are
-- revoked from authenticated.

BEGIN;

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Football: timeline events (goals, cards, substitutions).
CREATE TABLE IF NOT EXISTS public.football_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  minute            SMALLINT NOT NULL DEFAULT 0 CHECK (minute BETWEEN 0 AND 200),
  type              TEXT NOT NULL CHECK (type IN ('goal','own_goal','yellow','red','sub')),
  team_franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  player_name       TEXT,
  assist_name       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Volleyball: one point row per rally won; current set tracked on matches.
CREATE TABLE IF NOT EXISTS public.volleyball_points (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  set_number        SMALLINT NOT NULL DEFAULT 1 CHECK (set_number BETWEEN 1 AND 7),
  scoring_team_franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  type              TEXT NOT NULL DEFAULT 'rally'
                      CHECK (type IN ('spike','block','ace','opponent_error','rally')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Basketball: one row per made basket; current quarter tracked on matches.
CREATE TABLE IF NOT EXISTS public.basketball_points (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  quarter           SMALLINT NOT NULL DEFAULT 1 CHECK (quarter BETWEEN 1 AND 10),
  team_franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  player_name       TEXT,
  points            SMALLINT NOT NULL CHECK (points IN (1,2,3)),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS football_events_match_idx ON public.football_events (match_id);
CREATE INDEX IF NOT EXISTS volleyball_points_match_idx ON public.volleyball_points (match_id);
CREATE INDEX IF NOT EXISTS basketball_points_match_idx ON public.basketball_points (match_id);

-- Defensive: current period columns on matches.
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS current_period SMALLINT NOT NULL DEFAULT 1;

-- ============================================================
-- 2. SCORING RPCs
-- ============================================================

-- Football: record an event (goal/card/sub etc).
CREATE OR REPLACE FUNCTION public.football_record_event(
  p_match_id UUID,
  p_type TEXT,
  p_team_franchise_id UUID,
  p_minute SMALLINT DEFAULT 0,
  p_player_name TEXT DEFAULT NULL,
  p_assist_name TEXT DEFAULT NULL
)
RETURNS public.football_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_row   public.football_events%ROWTYPE;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status = 'completed' THEN RAISE EXCEPTION 'Match already completed'; END IF;
  IF v_match.status = 'scheduled' THEN
    UPDATE public.matches SET status = 'live' WHERE id = p_match_id;
  END IF;
  IF p_team_franchise_id NOT IN (v_match.franchise_a_id, v_match.franchise_b_id) THEN
    RAISE EXCEPTION 'Team is not part of this match';
  END IF;

  INSERT INTO public.football_events (match_id, minute, type, team_franchise_id, player_name, assist_name)
  VALUES (p_match_id, p_minute, p_type, p_team_franchise_id, p_player_name, p_assist_name)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Football: undo the most recent event.
CREATE OR REPLACE FUNCTION public.football_undo_last_event(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT id INTO v_id FROM public.football_events
    WHERE match_id = p_match_id ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Nothing to undo'; END IF;
  DELETE FROM public.football_events WHERE id = v_id;
END;
$$;

-- Volleyball: record a rally point. Auto-advances the current set when a side
-- reaches 25 with a 2-point lead (fifth/deciding set: 15).
CREATE OR REPLACE FUNCTION public.volleyball_record_point(
  p_match_id UUID,
  p_scoring_team_franchise_id UUID,
  p_type TEXT DEFAULT 'rally'
)
RETURNS public.volleyball_points
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match  public.matches%ROWTYPE;
  v_row    public.volleyball_points%ROWTYPE;
  v_set    SMALLINT;
  v_target SMALLINT;
  v_sa     INT;
  v_sb     INT;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status = 'completed' THEN RAISE EXCEPTION 'Match already completed'; END IF;
  IF v_match.status = 'scheduled' THEN
    UPDATE public.matches SET status = 'live' WHERE id = p_match_id;
  END IF;
  IF p_scoring_team_franchise_id NOT IN (v_match.franchise_a_id, v_match.franchise_b_id) THEN
    RAISE EXCEPTION 'Team is not part of this match';
  END IF;

  v_set := COALESCE(v_match.current_period, 1);

  INSERT INTO public.volleyball_points (match_id, set_number, scoring_team_franchise_id, type)
  VALUES (p_match_id, v_set, p_scoring_team_franchise_id, p_type)
  RETURNING * INTO v_row;

  SELECT
    COUNT(*) FILTER (WHERE scoring_team_franchise_id = v_match.franchise_a_id),
    COUNT(*) FILTER (WHERE scoring_team_franchise_id = v_match.franchise_b_id)
  INTO v_sa, v_sb
  FROM public.volleyball_points
  WHERE match_id = p_match_id AND set_number = v_set;

  v_target := CASE WHEN v_set >= 5 THEN 15 ELSE 25 END;
  IF GREATEST(v_sa, v_sb) >= v_target AND ABS(v_sa - v_sb) >= 2 THEN
    UPDATE public.matches SET current_period = v_set + 1 WHERE id = p_match_id;
  END IF;

  RETURN v_row;
END;
$$;

-- Volleyball: undo the most recent point.
CREATE OR REPLACE FUNCTION public.volleyball_undo_last_point(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.volleyball_points%ROWTYPE;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT * INTO v_row FROM public.volleyball_points
    WHERE match_id = p_match_id ORDER BY created_at DESC LIMIT 1;
  IF v_row IS NULL THEN RAISE EXCEPTION 'Nothing to undo'; END IF;
  DELETE FROM public.volleyball_points WHERE id = v_row.id;

  -- If the set was auto-advanced but now has no points, step back a set.
  IF NOT EXISTS (
    SELECT 1 FROM public.volleyball_points
    WHERE match_id = p_match_id AND set_number = (
      SELECT current_period FROM public.matches WHERE id = p_match_id)
  ) THEN
    UPDATE public.matches
      SET current_period = GREATEST(1, current_period - 1)
      WHERE id = p_match_id AND current_period > 1;
  END IF;
END;
$$;

-- Basketball: record a made basket (1/2/3 points).
CREATE OR REPLACE FUNCTION public.basketball_record_point(
  p_match_id UUID,
  p_team_franchise_id UUID,
  p_points SMALLINT,
  p_player_name TEXT DEFAULT NULL
)
RETURNS public.basketball_points
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_row   public.basketball_points%ROWTYPE;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status = 'completed' THEN RAISE EXCEPTION 'Match already completed'; END IF;
  IF v_match.status = 'scheduled' THEN
    UPDATE public.matches SET status = 'live' WHERE id = p_match_id;
  END IF;
  IF p_team_franchise_id NOT IN (v_match.franchise_a_id, v_match.franchise_b_id) THEN
    RAISE EXCEPTION 'Team is not part of this match';
  END IF;

  INSERT INTO public.basketball_points (match_id, quarter, team_franchise_id, player_name, points)
  VALUES (p_match_id, COALESCE(v_match.current_period, 1), p_team_franchise_id, p_player_name, p_points)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Basketball: undo the most recent basket.
CREATE OR REPLACE FUNCTION public.basketball_undo_last_point(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT id INTO v_id FROM public.basketball_points
    WHERE match_id = p_match_id ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Nothing to undo'; END IF;
  DELETE FROM public.basketball_points WHERE id = v_id;
END;
$$;

-- Generic period control shared by volleyball & basketball consoles.
CREATE OR REPLACE FUNCTION public.team_sport_set_period(p_match_id UUID, p_period SMALLINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  IF p_period < 1 OR p_period > 10 THEN RAISE EXCEPTION 'Invalid period'; END IF;
  UPDATE public.matches SET current_period = p_period WHERE id = p_match_id;
END;
$$;

-- Generic finish: status -> completed, winner from current score, result summary.
CREATE OR REPLACE FUNCTION public.team_sport_complete_match(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match  public.matches%ROWTYPE;
  v_sa     INT;
  v_sb     INT;
  v_winner UUID;
  v_tie    BOOLEAN;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  IF v_match.sport = 'Football' THEN
    SELECT
      COUNT(*) FILTER (WHERE (type IN ('goal') AND team_franchise_id = v_match.franchise_a_id)
                        OR (type = 'own_goal' AND team_franchise_id = v_match.franchise_b_id)),
      COUNT(*) FILTER (WHERE (type IN ('goal') AND team_franchise_id = v_match.franchise_b_id)
                        OR (type = 'own_goal' AND team_franchise_id = v_match.franchise_a_id))
    INTO v_sa, v_sb
    FROM public.football_events WHERE match_id = p_match_id;
  ELSIF v_match.sport = 'Volleyball' THEN
    WITH set_winners AS (
      SELECT DISTINCT ON (set_number)
        set_number,
        CASE
          WHEN COUNT(*) FILTER (WHERE scoring_team_franchise_id = v_match.franchise_a_id)
             > COUNT(*) FILTER (WHERE scoring_team_franchise_id = v_match.franchise_b_id)
          THEN v_match.franchise_a_id ELSE v_match.franchise_b_id
        END AS winner
      FROM public.volleyball_points
      WHERE match_id = p_match_id
      GROUP BY set_number
      ORDER BY set_number
    )
    SELECT
      COUNT(*) FILTER (WHERE winner = v_match.franchise_a_id),
      COUNT(*) FILTER (WHERE winner = v_match.franchise_b_id)
    INTO v_sa, v_sb
    FROM set_winners;
  ELSIF v_match.sport = 'Basketball' THEN
    SELECT
      COALESCE(SUM(points) FILTER (WHERE team_franchise_id = v_match.franchise_a_id), 0),
      COALESCE(SUM(points) FILTER (WHERE team_franchise_id = v_match.franchise_b_id), 0)
    INTO v_sa, v_sb
    FROM public.basketball_points WHERE match_id = p_match_id;
  ELSE
    RAISE EXCEPTION 'Unsupported sport %', v_match.sport;
  END IF;

  v_sa := COALESCE(v_sa, 0);
  v_sb := COALESCE(v_sb, 0);
  v_tie := v_sa = v_sb;
  v_winner := CASE WHEN v_tie THEN NULL
                   WHEN v_sa > v_sb THEN v_match.franchise_a_id
                   ELSE v_match.franchise_b_id END;

  UPDATE public.matches
  SET status = 'completed',
      winner_franchise_id = v_winner,
      is_tie = v_tie,
      result_summary = CASE WHEN v_tie THEN format('%s - %s', v_sa, v_sb)
                            ELSE format('won %s - %s', GREATEST(v_sa, v_sb), LEAST(v_sa, v_sb)) END
  WHERE id = p_match_id;
END;
$$;

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.football_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volleyball_points    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.basketball_points    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view football events"  ON public.football_events;
DROP POLICY IF EXISTS "Authenticated can view volleyball points" ON public.volleyball_points;
DROP POLICY IF EXISTS "Authenticated can view basketball points" ON public.basketball_points;

CREATE POLICY "Authenticated can view football events"
  ON public.football_events FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated can view volleyball points"
  ON public.volleyball_points FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated can view basketball points"
  ON public.basketball_points FOR SELECT TO authenticated USING (TRUE);

-- No direct writes: everything goes through the RPCs above.
REVOKE ALL ON public.football_events   FROM anon;
REVOKE ALL ON public.volleyball_points FROM anon;
REVOKE ALL ON public.basketball_points FROM anon;

GRANT SELECT ON public.football_events   TO authenticated;
GRANT SELECT ON public.volleyball_points TO authenticated;
GRANT SELECT ON public.basketball_points TO authenticated;

GRANT ALL ON public.football_events   TO service_role;
GRANT ALL ON public.volleyball_points TO service_role;
GRANT ALL ON public.basketball_points TO service_role;

GRANT EXECUTE ON FUNCTION public.football_record_event(UUID, TEXT, UUID, SMALLINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.football_undo_last_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.volleyball_record_point(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.volleyball_undo_last_point(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.basketball_record_point(UUID, UUID, SMALLINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.basketball_undo_last_point(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_sport_set_period(UUID, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_sport_complete_match(UUID) TO authenticated;

-- ============================================================
-- 4. REALTIME (Idempotent publication additions)
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.football_events;
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.volleyball_points;
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.basketball_points;
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; WHEN OTHERS THEN NULL;
  END;
END $$;

COMMIT;
