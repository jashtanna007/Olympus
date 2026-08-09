-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Team sports v2: per-sport config, generic      ║
-- ║  event table, rules-correct scoring for all sports.       ║
-- ║  Run AFTER team_sports_scoring.sql. Idempotent.           ║
-- ╚══════════════════════════════════════════════════════════╝
--
-- Sports covered here: Badminton, Table Tennis, Kabaddi, Chess, Carrom,
-- Relay, Arm Wrestling (generic match_sport_events) plus rules fixes for
-- the existing three (Football shootout types, Volleyball config targets,
-- Basketball fouls + overtime gating).

BEGIN;

-- ============================================================
-- 1. PER-SPORT CONFIG COLUMN ON matches
-- ============================================================
-- JSONB knobs per sport:
--   Football:      { halves, half_minutes }
--   Volleyball:    { sets, points_per_set, final_set_points }
--   Basketball:    { quarters, quarter_minutes }
--   Badminton:     { games, points_per_game, deuce_cap }
--   Table Tennis:  { games, points_per_game, deuce_cap (null = none) }
--   Chess:         { time_control, armageddon }
--   Carrom:        { boards, queen_points }
--   Kabaddi:       { halves, half_minutes, allout_bonus }
--   Relay:         { legs, pool }
--   Arm Wrestling: { pulls, arms, weight_class }
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';

-- ============================================================
-- 2. GENERIC SPORT EVENT TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.match_sport_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id           UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  period             SMALLINT NOT NULL DEFAULT 1 CHECK (period BETWEEN 1 AND 50),
  kind               TEXT NOT NULL,
  team_franchise_id  UUID REFERENCES public.franchises(id) ON DELETE CASCADE,
  value              NUMERIC,
  label              TEXT,
  meta               JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS match_sport_events_match_idx ON public.match_sport_events (match_id);

-- ============================================================
-- 3. SHARED HELPERS
-- ============================================================

-- Load + guard + auto-flip scheduled → live. Returns the match row.
CREATE OR REPLACE FUNCTION public.sport_lock_match(p_match_id UUID)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status = 'completed' THEN RAISE EXCEPTION 'Match already completed'; END IF;
  IF v_match.status = 'scheduled' THEN
    UPDATE public.matches SET status = 'live' WHERE id = p_match_id;
    v_match.status := 'live';
  END IF;
  RETURN v_match;
END;
$$;

-- Squad setup for non-cricket sports: replace both sides' match_players.
-- p_players_* items: { full_name, role } (role doubles as position/leg/arm).
CREATE OR REPLACE FUNCTION public.team_sport_setup_match(
  p_match_id UUID,
  p_players_a JSONB,
  p_players_b JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status = 'completed' THEN RAISE EXCEPTION 'Match already completed'; END IF;

  DELETE FROM public.match_players WHERE match_id = p_match_id;

  INSERT INTO public.match_players (match_id, franchise_id, full_name, batting_order, role)
  SELECT p_match_id, v_match.franchise_a_id,
         p->>'full_name', (ord)::SMALLINT, NULLIF(p->>'role', '')
  FROM jsonb_array_elements(p_players_a) WITH ORDINALITY AS t(p, ord)
  WHERE length(trim(COALESCE(p->>'full_name', ''))) > 0;

  INSERT INTO public.match_players (match_id, franchise_id, full_name, batting_order, role)
  SELECT p_match_id, v_match.franchise_b_id,
         p->>'full_name', (ord)::SMALLINT, NULLIF(p->>'role', '')
  FROM jsonb_array_elements(p_players_b) WITH ORDINALITY AS t(p, ord)
  WHERE length(trim(COALESCE(p->>'full_name', ''))) > 0;
END;
$$;

-- Generic insert used for free-form events that need no derived state
-- (basketball fouls, football-style notes on generic sports, serve markers).
CREATE OR REPLACE FUNCTION public.sport_event_record(
  p_match_id UUID,
  p_period SMALLINT,
  p_kind TEXT,
  p_team_franchise_id UUID DEFAULT NULL,
  p_value NUMERIC DEFAULT NULL,
  p_label TEXT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'
)
RETURNS public.match_sport_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_row   public.match_sport_events%ROWTYPE;
BEGIN
  v_match := public.sport_lock_match(p_match_id);
  IF p_team_franchise_id IS NOT NULL
     AND p_team_franchise_id NOT IN (v_match.franchise_a_id, v_match.franchise_b_id) THEN
    RAISE EXCEPTION 'Team is not part of this match';
  END IF;
  INSERT INTO public.match_sport_events
    (match_id, period, kind, team_franchise_id, value, label, meta)
  VALUES (p_match_id, COALESCE(p_period, v_match.current_period, 1),
          p_kind, p_team_franchise_id, p_value, p_label, COALESCE(p_meta, '{}'::JSONB))
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Generic undo: delete the newest generic event, then roll current_period
-- back to one past the highest period that still has events.
CREATE OR REPLACE FUNCTION public.sport_event_undo_last(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id     UUID;
  v_max    SMALLINT;
  v_target INT;
  v_period SMALLINT;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT id INTO v_id FROM public.match_sport_events
    WHERE match_id = p_match_id ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Nothing to undo'; END IF;
  DELETE FROM public.match_sport_events WHERE id = v_id;

  SELECT COALESCE(MAX(period), 0) INTO v_max FROM public.match_sport_events
    WHERE match_id = p_match_id;
  SELECT current_period INTO v_period FROM public.matches WHERE id = p_match_id;

  v_target := CASE WHEN v_max = 0 THEN 1 ELSE v_max END;
  IF v_max > 0 THEN
    -- A finished period's events remain, so being on v_max + 1 is valid.
    v_target := GREATEST(v_max, LEAST(COALESCE(v_period, 1), v_max + 1));
  END IF;
  UPDATE public.matches SET current_period = v_target WHERE id = p_match_id;
END;
$$;

-- ============================================================
-- 4. RALLY SPORTS (Badminton / Table Tennis) config-driven RPCs
-- ============================================================

-- Record one rally point. Auto-advances current_period when the game is won:
-- win = reach target with 2-point lead, or hit the hard cap (badminton 30).
-- p_kind: 'point' | 'serve' (serve is a display marker only).
CREATE OR REPLACE FUNCTION public.rally_record_point(
  p_match_id UUID,
  p_team_franchise_id UUID,
  p_kind TEXT DEFAULT 'point'
)
RETURNS public.match_sport_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match  public.matches%ROWTYPE;
  v_row    public.match_sport_events%ROWTYPE;
  v_period SMALLINT;
  v_target INT;
  v_cap    INT;
  v_games  INT;
  v_a      INT;
  v_b      INT;
BEGIN
  v_match := public.sport_lock_match(p_match_id);
  IF v_match.sport NOT IN ('Badminton', 'Table Tennis') THEN
    RAISE EXCEPTION 'rally_record_point does not apply to sport %', v_match.sport;
  END IF;
  IF p_team_franchise_id NOT IN (v_match.franchise_a_id, v_match.franchise_b_id) THEN
    RAISE EXCEPTION 'Team is not part of this match';
  END IF;
  IF p_kind NOT IN ('point', 'serve') THEN RAISE EXCEPTION 'Invalid kind'; END IF;

  v_period := COALESCE(v_match.current_period, 1);
  v_games  := COALESCE(NULLIF(v_match.config->>'games', '')::INT, 3);

  IF p_kind = 'serve' THEN
    INSERT INTO public.match_sport_events (match_id, period, kind, team_franchise_id, label)
    VALUES (p_match_id, v_period, 'serve', p_team_franchise_id, 'Serve')
    RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  IF v_match.sport = 'Badminton' THEN
    v_target := COALESCE(NULLIF(v_match.config->>'points_per_game', '')::INT, 21);
    v_cap    := COALESCE(NULLIF(v_match.config->>'deuce_cap', '')::INT, 30);
  ELSE
    v_target := COALESCE(NULLIF(v_match.config->>'points_per_game', '')::INT, 11);
    v_cap    := NULLIF(v_match.config->>'deuce_cap', '')::INT; -- NULL = no cap
  END IF;

  INSERT INTO public.match_sport_events (match_id, period, kind, team_franchise_id, value)
  VALUES (p_match_id, v_period, 'point', p_team_franchise_id, 1)
  RETURNING * INTO v_row;

  SELECT
    COUNT(*) FILTER (WHERE team_franchise_id = v_match.franchise_a_id),
    COUNT(*) FILTER (WHERE team_franchise_id = v_match.franchise_b_id)
  INTO v_a, v_b
  FROM public.match_sport_events
  WHERE match_id = p_match_id AND period = v_period AND kind = 'point';

  IF (GREATEST(v_a, v_b) >= v_target AND ABS(v_a - v_b) >= 2)
     OR (v_cap IS NOT NULL AND GREATEST(v_a, v_b) >= v_cap) THEN
    IF v_period < v_games THEN
      UPDATE public.matches SET current_period = v_period + 1 WHERE id = p_match_id;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

-- Complete a rally-sport match: winner = most games/sets actually won, using
-- the same win rules as rally_record_point. Tie-blocked.
CREATE OR REPLACE FUNCTION public.rally_complete_match(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match  public.matches%ROWTYPE;
  v_target INT;
  v_cap    INT;
  v_wa     INT;
  v_wb     INT;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  IF v_match.sport = 'Badminton' THEN
    v_target := COALESCE(NULLIF(v_match.config->>'points_per_game', '')::INT, 21);
    v_cap    := COALESCE(NULLIF(v_match.config->>'deuce_cap', '')::INT, 30);
  ELSIF v_match.sport = 'Table Tennis' THEN
    v_target := COALESCE(NULLIF(v_match.config->>'points_per_game', '')::INT, 11);
    v_cap    := NULLIF(v_match.config->>'deuce_cap', '')::INT;
  ELSE
    RAISE EXCEPTION 'rally_complete_match does not apply to sport %', v_match.sport;
  END IF;

  WITH per_game AS (
    SELECT period,
      COUNT(*) FILTER (WHERE team_franchise_id = v_match.franchise_a_id) AS a,
      COUNT(*) FILTER (WHERE team_franchise_id = v_match.franchise_b_id) AS b
    FROM public.match_sport_events
    WHERE match_id = p_match_id AND kind = 'point'
    GROUP BY period
  ), winners AS (
    SELECT CASE
             WHEN (GREATEST(a, b) >= v_target AND ABS(a - b) >= 2)
                  OR (v_cap IS NOT NULL AND GREATEST(a, b) >= v_cap)
             THEN CASE WHEN a > b THEN v_match.franchise_a_id ELSE v_match.franchise_b_id END
           END AS winner
    FROM per_game
  )
  SELECT
    COUNT(*) FILTER (WHERE winner = v_match.franchise_a_id),
    COUNT(*) FILTER (WHERE winner = v_match.franchise_b_id)
  INTO v_wa, v_wb
  FROM winners;

  v_wa := COALESCE(v_wa, 0);
  v_wb := COALESCE(v_wb, 0);
  IF v_wa = v_wb THEN
    RAISE EXCEPTION 'Match level %-% — cannot complete until a side leads in games', v_wa, v_wb;
  END IF;

  UPDATE public.matches
  SET status = 'completed',
      winner_franchise_id = CASE WHEN v_wa > v_wb THEN v_match.franchise_a_id ELSE v_match.franchise_b_id END,
      is_tie = FALSE,
      result_summary = format('won %s - %s games', GREATEST(v_wa, v_wb), LEAST(v_wa, v_wb))
  WHERE id = p_match_id;
END;
$$;

-- ============================================================
-- 5. KABADDI
-- ============================================================
-- kind: 'raid' | 'tackle' (+1), 'allout' (+2 or config.allout_bonus),
--       'tiebreak' (+1 during 5-raid tiebreak / golden raid).
CREATE OR REPLACE FUNCTION public.kabaddi_record_event(
  p_match_id UUID,
  p_team_franchise_id UUID,
  p_kind TEXT
)
RETURNS public.match_sport_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_row   public.match_sport_events%ROWTYPE;
  v_value NUMERIC;
  v_label TEXT;
BEGIN
  v_match := public.sport_lock_match(p_match_id);
  IF v_match.sport <> 'Kabaddi' THEN
    RAISE EXCEPTION 'kabaddi_record_event requires a Kabaddi match, got %', v_match.sport;
  END IF;
  IF p_team_franchise_id NOT IN (v_match.franchise_a_id, v_match.franchise_b_id) THEN
    RAISE EXCEPTION 'Team is not part of this match';
  END IF;
  IF p_kind NOT IN ('raid', 'tackle', 'allout', 'tiebreak') THEN
    RAISE EXCEPTION 'Invalid kabaddi kind %', p_kind;
  END IF;

  v_value := CASE p_kind
               WHEN 'allout' THEN COALESCE(NULLIF(v_match.config->>'allout_bonus', '')::NUMERIC, 2)
               ELSE 1
             END;
  v_label := CASE p_kind
               WHEN 'raid' THEN 'Raid point'
               WHEN 'tackle' THEN 'Tackle point'
               WHEN 'allout' THEN 'All Out'
               ELSE 'Tiebreak raid'
             END;

  INSERT INTO public.match_sport_events (match_id, period, kind, team_franchise_id, value, label)
  VALUES (p_match_id, COALESCE(v_match.current_period, 1), p_kind, p_team_franchise_id, v_value, v_label)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- ============================================================
-- 6. CHESS
-- ============================================================
-- p_result: 'a' | 'b' | 'draw' — completes the match immediately.
CREATE OR REPLACE FUNCTION public.chess_record_result(
  p_match_id UUID,
  p_result TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.match_sport_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match  public.matches%ROWTYPE;
  v_row    public.match_sport_events%ROWTYPE;
  v_team   UUID;
  v_value  NUMERIC;
  v_label  TEXT;
BEGIN
  v_match := public.sport_lock_match(p_match_id);
  IF v_match.sport <> 'Chess' THEN
    RAISE EXCEPTION 'chess_record_result requires a Chess match, got %', v_match.sport;
  END IF;
  IF p_result NOT IN ('a', 'b', 'draw') THEN RAISE EXCEPTION 'Invalid result %', p_result; END IF;
  IF p_reason IS NOT NULL AND p_reason NOT IN ('mate', 'resign', 'timeout', 'agreement', 'armageddon', 'other') THEN
    RAISE EXCEPTION 'Invalid reason %', p_reason;
  END IF;

  v_team  := CASE p_result WHEN 'a' THEN v_match.franchise_a_id
                           WHEN 'b' THEN v_match.franchise_b_id END;
  v_value := CASE p_result WHEN 'draw' THEN 0.5 ELSE 1 END;
  v_label := CASE p_result
               WHEN 'a' THEN 'White wins'
               WHEN 'b' THEN 'Black wins'
               ELSE 'Draw'
             END;

  INSERT INTO public.match_sport_events (match_id, period, kind, team_franchise_id, value, label, meta)
  VALUES (p_match_id, COALESCE(v_match.current_period, 1), 'result', v_team, v_value, v_label,
          jsonb_build_object('reason', COALESCE(p_reason, 'other')))
  RETURNING * INTO v_row;

  UPDATE public.matches
  SET status = 'completed',
      winner_franchise_id = v_team,
      is_tie = (p_result = 'draw'),
      result_summary = CASE
        WHEN p_result = 'draw' THEN format('Draw (%s)', COALESCE(p_reason, 'agreement'))
        ELSE format('won by %s', COALESCE(p_reason, 'result'))
      END
  WHERE id = p_match_id;

  RETURN v_row;
END;
$$;

-- ============================================================
-- 7. CARROM
-- ============================================================
-- kinds: 'point' (coin, +1), 'queen' (+config.queen_points, requires cover —
--        enforced by scorer flow), 'foul' (-1), 'board_win' (+config bonus =
--        opponent's remaining coins, credited automatically).
CREATE OR REPLACE FUNCTION public.carrom_record_event(
  p_match_id UUID,
  p_team_franchise_id UUID,
  p_kind TEXT,
  p_player TEXT DEFAULT NULL
)
RETURNS public.match_sport_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match  public.matches%ROWTYPE;
  v_row    public.match_sport_events%ROWTYPE;
  v_board  SMALLINT;
  v_boards INT;
  v_value  NUMERIC;
  v_label  TEXT;
  v_opp    UUID;
  v_opp_rem INT;
BEGIN
  v_match := public.sport_lock_match(p_match_id);
  IF v_match.sport <> 'Carrom' THEN
    RAISE EXCEPTION 'carrom_record_event requires a Carrom match, got %', v_match.sport;
  END IF;
  IF p_team_franchise_id NOT IN (v_match.franchise_a_id, v_match.franchise_b_id) THEN
    RAISE EXCEPTION 'Team is not part of this match';
  END IF;
  IF p_kind NOT IN ('point', 'queen', 'foul', 'board_win') THEN
    RAISE EXCEPTION 'Invalid carrom kind %', p_kind;
  END IF;

  v_board  := COALESCE(v_match.current_period, 1);
  v_boards := COALESCE(NULLIF(v_match.config->>'boards', '')::INT, 1);

  IF p_kind = 'queen' THEN
    v_value := COALESCE(NULLIF(v_match.config->>'queen_points', '')::NUMERIC, 3);
    v_label := 'Queen covered';
  ELSIF p_kind = 'foul' THEN
    v_value := -1;
    v_label := 'Foul';
  ELSIF p_kind = 'board_win' THEN
    -- Winner also pockets the opponent's remaining coins on this board.
    v_opp := CASE WHEN p_team_franchise_id = v_match.franchise_a_id
                  THEN v_match.franchise_b_id ELSE v_match.franchise_a_id END;
    SELECT COALESCE(9 - COUNT(*) FILTER (WHERE kind = 'point'), 0)
    INTO v_opp_rem
    FROM public.match_sport_events
    WHERE match_id = p_match_id AND period = v_board AND team_franchise_id = v_opp;
    v_value := GREATEST(v_opp_rem, 0);
    v_label := 'Board won';
  ELSE
    v_value := 1;
    v_label := 'Coin';
  END IF;

  INSERT INTO public.match_sport_events
    (match_id, period, kind, team_franchise_id, value, label, meta)
  VALUES (p_match_id, v_board, p_kind, p_team_franchise_id, v_value, v_label,
          jsonb_build_object('board', v_board, 'player', p_player))
  RETURNING * INTO v_row;

  -- Auto-advance to next board after a board_win.
  IF p_kind = 'board_win' AND v_board < v_boards THEN
    UPDATE public.matches SET current_period = v_board + 1 WHERE id = p_match_id;
  END IF;

  RETURN v_row;
END;
$$;

-- Complete a carrom match: winner = most boards won; level boards → most
-- total points; fully level → tie allowed (fest rule: replay is a new match).
CREATE OR REPLACE FUNCTION public.carrom_complete_match(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_wa    INT;
  v_wb    INT;
  v_pa    NUMERIC;
  v_pb    NUMERIC;
  v_tie   BOOLEAN;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.sport <> 'Carrom' THEN
    RAISE EXCEPTION 'carrom_complete_match requires a Carrom match, got %', v_match.sport;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE team_franchise_id = v_match.franchise_a_id),
    COUNT(*) FILTER (WHERE team_franchise_id = v_match.franchise_b_id)
  INTO v_wa, v_wb
  FROM public.match_sport_events
  WHERE match_id = p_match_id AND kind = 'board_win';

  SELECT
    COALESCE(SUM(value) FILTER (WHERE team_franchise_id = v_match.franchise_a_id), 0),
    COALESCE(SUM(value) FILTER (WHERE team_franchise_id = v_match.franchise_b_id), 0)
  INTO v_pa, v_pb
  FROM public.match_sport_events
  WHERE match_id = p_match_id;

  v_tie := (v_wa = v_wb) AND (v_pa = v_pb);
  IF v_wa = v_wb AND v_pa <> v_pb THEN
    -- Level boards: points decide.
    IF v_pa > v_pb THEN v_wa := v_wa + 1; ELSE v_wb := v_wb + 1; END IF;
  END IF;

  UPDATE public.matches
  SET status = 'completed',
      winner_franchise_id = CASE WHEN v_tie THEN NULL
                                 WHEN v_wa > v_wb THEN v_match.franchise_a_id
                                 ELSE v_match.franchise_b_id END,
      is_tie = v_tie,
      result_summary = CASE WHEN v_tie THEN format('tied %s - %s', v_pa, v_pb)
                            ELSE format('won %s - %s pts', GREATEST(v_pa, v_pb), LEAST(v_pa, v_pb)) END
  WHERE id = p_match_id;
END;
$$;

-- ============================================================
-- 8. RELAY
-- ============================================================
-- p_seconds e.g. 45.37. Once both teams have posted a time the match
-- auto-completes; equal times = dead heat (tie).
CREATE OR REPLACE FUNCTION public.relay_record_time(
  p_match_id UUID,
  p_team_franchise_id UUID,
  p_seconds NUMERIC,
  p_legs JSONB DEFAULT '[]'
)
RETURNS public.match_sport_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_row   public.match_sport_events%ROWTYPE;
  v_teams INT;
  v_a_t   NUMERIC;
  v_b_t   NUMERIC;
BEGIN
  v_match := public.sport_lock_match(p_match_id);
  IF v_match.sport <> 'Relay' THEN
    RAISE EXCEPTION 'relay_record_time requires a Relay match, got %', v_match.sport;
  END IF;
  IF p_team_franchise_id NOT IN (v_match.franchise_a_id, v_match.franchise_b_id) THEN
    RAISE EXCEPTION 'Team is not part of this match';
  END IF;
  IF p_seconds IS NULL OR p_seconds <= 0 THEN RAISE EXCEPTION 'Invalid time'; END IF;

  DELETE FROM public.match_sport_events
  WHERE match_id = p_match_id AND kind = 'result_time' AND team_franchise_id = p_team_franchise_id;

  INSERT INTO public.match_sport_events (match_id, period, kind, team_franchise_id, value, label, meta)
  VALUES (p_match_id, 1, 'result_time', p_team_franchise_id, p_seconds, 'Finish time',
          jsonb_build_object('legs', COALESCE(p_legs, '[]'::JSONB)))
  RETURNING * INTO v_row;

  SELECT COUNT(DISTINCT team_franchise_id) INTO v_teams
  FROM public.match_sport_events
  WHERE match_id = p_match_id AND kind = 'result_time';

  IF v_teams >= 2 THEN
    SELECT
      MAX(value) FILTER (WHERE team_franchise_id = v_match.franchise_a_id),
      MAX(value) FILTER (WHERE team_franchise_id = v_match.franchise_b_id)
    INTO v_a_t, v_b_t
    FROM public.match_sport_events
    WHERE match_id = p_match_id AND kind = 'result_time';

    UPDATE public.matches
    SET status = 'completed',
        winner_franchise_id = CASE WHEN v_a_t = v_b_t THEN NULL
                                   WHEN v_a_t < v_b_t THEN v_match.franchise_a_id
                                   ELSE v_match.franchise_b_id END,
        is_tie = (v_a_t = v_b_t),
        result_summary = CASE WHEN v_a_t = v_b_t THEN format('dead heat %ss', v_a_t)
                              ELSE format('%ss vs %ss', LEAST(v_a_t, v_b_t), GREATEST(v_a_t, v_b_t)) END
    WHERE id = p_match_id;
  END IF;

  RETURN v_row;
END;
$$;

-- ============================================================
-- 9. ARM WRESTLING
-- ============================================================
-- kind: 'pull_win' | 'foul'. Auto-completes at majority of config.pulls.
-- p_meta optionally e.g. { "arm": "right", "strap": true }.
CREATE OR REPLACE FUNCTION public.armwrestling_record_pull(
  p_match_id UUID,
  p_team_franchise_id UUID,
  p_kind TEXT DEFAULT 'pull_win',
  p_meta JSONB DEFAULT '{}'
)
RETURNS public.match_sport_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match  public.matches%ROWTYPE;
  v_row    public.match_sport_events%ROWTYPE;
  v_pulls  INT;
  v_need   INT;
  v_wa     INT;
  v_wb     INT;
BEGIN
  v_match := public.sport_lock_match(p_match_id);
  IF v_match.sport <> 'Arm Wrestling' THEN
    RAISE EXCEPTION 'armwrestling_record_pull requires an Arm Wrestling match, got %', v_match.sport;
  END IF;
  IF p_team_franchise_id NOT IN (v_match.franchise_a_id, v_match.franchise_b_id) THEN
    RAISE EXCEPTION 'Team is not part of this match';
  END IF;
  IF p_kind NOT IN ('pull_win', 'foul') THEN RAISE EXCEPTION 'Invalid kind %', p_kind; END IF;

  INSERT INTO public.match_sport_events (match_id, period, kind, team_franchise_id, value, label, meta)
  VALUES (p_match_id, COALESCE(v_match.current_period, 1), p_kind, p_team_franchise_id,
          1, CASE WHEN p_kind = 'pull_win' THEN 'Pin' ELSE 'Foul' END, COALESCE(p_meta, '{}'::JSONB))
  RETURNING * INTO v_row;

  v_pulls := COALESCE(NULLIF(v_match.config->>'pulls', '')::INT, 3);
  v_need  := (v_pulls / 2) + 1;

  SELECT
    COUNT(*) FILTER (WHERE team_franchise_id = v_match.franchise_a_id),
    COUNT(*) FILTER (WHERE team_franchise_id = v_match.franchise_b_id)
  INTO v_wa, v_wb
  FROM public.match_sport_events
  WHERE match_id = p_match_id AND kind = 'pull_win';

  IF GREATEST(v_wa, v_wb) >= v_need THEN
    UPDATE public.matches
    SET status = 'completed',
        winner_franchise_id = CASE WHEN v_wa > v_wb THEN v_match.franchise_a_id ELSE v_match.franchise_b_id END,
        is_tie = FALSE,
        result_summary = format('won %s - %s pulls', GREATEST(v_wa, v_wb), LEAST(v_wa, v_wb))
    WHERE id = p_match_id;
  END IF;

  RETURN v_row;
END;
$$;

-- ============================================================
-- 10. REVISIONS TO EXISTING SPORTS
-- ============================================================

-- Football: allow proper shootout event types (no more minute>=121 hack).
ALTER TABLE public.football_events DROP CONSTRAINT IF EXISTS football_events_type_check;
ALTER TABLE public.football_events
  ADD CONSTRAINT football_events_type_check
  CHECK (type IN ('goal','own_goal','yellow','red','sub','pen_goal','pen_miss'));

-- Volleyball: read targets from config first (fallback to legacy columns).
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
  v_match      public.matches%ROWTYPE;
  v_row        public.volleyball_points%ROWTYPE;
  v_set        SMALLINT;
  v_sets       INT;
  v_target     SMALLINT;
  v_final_pts  INT;
  v_sa         INT;
  v_sb         INT;
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

  v_set       := COALESCE(v_match.current_period, 1);
  v_sets      := COALESCE(NULLIF(v_match.config->>'sets', '')::INT, v_match.players_per_side, 3);
  v_target    := COALESCE(NULLIF(v_match.config->>'points_per_set', '')::INT, v_match.overs_per_innings, 25)::SMALLINT;
  v_final_pts := COALESCE(NULLIF(v_match.config->>'final_set_points', '')::INT, 15);

  INSERT INTO public.volleyball_points (match_id, set_number, scoring_team_franchise_id, type)
  VALUES (p_match_id, v_set, p_scoring_team_franchise_id, p_type)
  RETURNING * INTO v_row;

  SELECT
    COUNT(*) FILTER (WHERE scoring_team_franchise_id = v_match.franchise_a_id),
    COUNT(*) FILTER (WHERE scoring_team_franchise_id = v_match.franchise_b_id)
  INTO v_sa, v_sb
  FROM public.volleyball_points
  WHERE match_id = p_match_id AND set_number = v_set;

  IF v_set >= v_sets THEN v_target := v_final_pts::SMALLINT; END IF;

  IF GREATEST(v_sa, v_sb) >= v_target AND ABS(v_sa - v_sb) >= 2 THEN
    UPDATE public.matches SET current_period = v_set + 1 WHERE id = p_match_id;
  END IF;

  RETURN v_row;
END;
$$;

-- Generic finish: config-aware volleyball, pens-aware football,
-- overtime-gated basketball, generic rally/games sports, kabaddi.
CREATE OR REPLACE FUNCTION public.team_sport_complete_match(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match      public.matches%ROWTYPE;
  v_sa         NUMERIC;
  v_sb         NUMERIC;
  v_winner     UUID;
  v_tie        BOOLEAN;
  v_quarters   INT;
  v_halves     INT;
  v_sets       INT;
  v_target     INT;
  v_final_pts  INT;
  v_tb_a       INT;
  v_tb_b       INT;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  IF v_match.sport = 'Football' THEN
    SELECT
      COUNT(*) FILTER (WHERE ((type = 'pen_goal' AND team_franchise_id = v_match.franchise_a_id)
                              OR (type = 'goal' AND minute >= 121 AND team_franchise_id = v_match.franchise_a_id))),
      COUNT(*) FILTER (WHERE ((type = 'pen_goal' AND team_franchise_id = v_match.franchise_b_id)
                              OR (type = 'goal' AND minute >= 121 AND team_franchise_id = v_match.franchise_b_id)))
    INTO v_tb_a, v_tb_b
    FROM public.football_events WHERE match_id = p_match_id;

    SELECT
      COUNT(*) FILTER (WHERE (type = 'goal' AND minute < 121 AND team_franchise_id = v_match.franchise_a_id)
                        OR (type = 'own_goal' AND team_franchise_id = v_match.franchise_b_id)),
      COUNT(*) FILTER (WHERE (type = 'goal' AND minute < 121 AND team_franchise_id = v_match.franchise_b_id)
                        OR (type = 'own_goal' AND team_franchise_id = v_match.franchise_a_id))
    INTO v_sa, v_sb
    FROM public.football_events WHERE match_id = p_match_id;

    -- Shootout decides the fixture when regular time is level.
    v_sa := v_sa + COALESCE(v_tb_a, 0);
    v_sb := v_sb + COALESCE(v_tb_b, 0);

  ELSIF v_match.sport = 'Volleyball' THEN
    v_sets      := COALESCE(NULLIF(v_match.config->>'sets', '')::INT, v_match.players_per_side, 3);
    v_target    := COALESCE(NULLIF(v_match.config->>'points_per_set', '')::INT, v_match.overs_per_innings, 25);
    v_final_pts := COALESCE(NULLIF(v_match.config->>'final_set_points', '')::INT, 15);
    WITH per_set AS (
      SELECT set_number,
        COUNT(*) FILTER (WHERE scoring_team_franchise_id = v_match.franchise_a_id) AS a,
        COUNT(*) FILTER (WHERE scoring_team_franchise_id = v_match.franchise_b_id) AS b
      FROM public.volleyball_points
      WHERE match_id = p_match_id
      GROUP BY set_number
    ), winners AS (
      SELECT CASE
               WHEN GREATEST(a, b) >= (CASE WHEN set_number >= v_sets THEN v_final_pts ELSE v_target END)
                    AND ABS(a - b) >= 2
               THEN CASE WHEN a > b THEN v_match.franchise_a_id ELSE v_match.franchise_b_id END
             END AS winner
      FROM per_set
    )
    SELECT
      COUNT(*) FILTER (WHERE winner = v_match.franchise_a_id),
      COUNT(*) FILTER (WHERE winner = v_match.franchise_b_id)
    INTO v_sa, v_sb
    FROM winners;

  ELSIF v_match.sport = 'Basketball' THEN
    v_quarters := COALESCE(NULLIF(v_match.config->>'quarters', '')::INT, v_match.players_per_side, 4);
    SELECT
      COALESCE(SUM(points) FILTER (WHERE team_franchise_id = v_match.franchise_a_id), 0),
      COALESCE(SUM(points) FILTER (WHERE team_franchise_id = v_match.franchise_b_id), 0)
    INTO v_sa, v_sb
    FROM public.basketball_points WHERE match_id = p_match_id;
    -- FIBA: a tied game cannot end — play overtime periods until decided.
    IF v_sa = v_sb THEN
      RAISE EXCEPTION 'Scores level %-% — play an overtime period before finishing', v_sa, v_sb;
    END IF;

  ELSIF v_match.sport = 'Kabaddi' THEN
    SELECT
      COALESCE(SUM(value) FILTER (WHERE team_franchise_id = v_match.franchise_a_id), 0),
      COALESCE(SUM(value) FILTER (WHERE team_franchise_id = v_match.franchise_b_id), 0)
    INTO v_sa, v_sb
    FROM public.match_sport_events WHERE match_id = p_match_id;
    v_halves := COALESCE(NULLIF(v_match.config->>'halves', '')::INT, 2);
    -- Level at the final whistle requires the 5-raid tiebreak / golden raid.
    IF v_sa = v_sb AND NOT EXISTS (
      SELECT 1 FROM public.match_sport_events
      WHERE match_id = p_match_id AND kind = 'tiebreak'
    ) THEN
      RAISE EXCEPTION 'Scores level %-% — run the tiebreak (5 raids, then golden raid) before finishing', v_sa, v_sb;
    END IF;
    IF v_sa = v_sb THEN
      RAISE EXCEPTION 'Scores still level %-% — continue the golden raid', v_sa, v_sb;
    END IF;

  ELSIF v_match.sport IN ('Badminton', 'Table Tennis') THEN
    PERFORM public.rally_complete_match(p_match_id);
    RETURN;

  ELSIF v_match.sport = 'Carrom' THEN
    PERFORM public.carrom_complete_match(p_match_id);
    RETURN;

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
-- 11. RLS / GRANTS / REALTIME
-- ============================================================
ALTER TABLE public.match_sport_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view match sport events" ON public.match_sport_events;
CREATE POLICY "Authenticated can view match sport events"
  ON public.match_sport_events FOR SELECT TO authenticated USING (TRUE);

REVOKE ALL ON public.match_sport_events FROM anon;
GRANT SELECT ON public.match_sport_events TO authenticated;
GRANT ALL ON public.match_sport_events TO service_role;

GRANT EXECUTE ON FUNCTION public.sport_lock_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_sport_setup_match(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sport_event_record(UUID, SMALLINT, TEXT, UUID, NUMERIC, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sport_event_undo_last(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rally_record_point(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rally_complete_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kabaddi_record_event(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chess_record_result(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.carrom_record_event(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.carrom_complete_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.relay_record_time(UUID, UUID, NUMERIC, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.armwrestling_record_pull(UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.volleyball_record_point(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_sport_complete_match(UUID) TO authenticated;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_sport_events;
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; WHEN OTHERS THEN NULL;
  END;
END $$;

COMMIT;
