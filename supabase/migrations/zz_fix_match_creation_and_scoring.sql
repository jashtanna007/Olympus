-- Corrective match/scoring migration. Run after cricket_scoring_engine.sql and
-- team_sports_v2.sql.

BEGIN;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE public.cricket_deliveries
  DROP CONSTRAINT IF EXISTS cricket_deliveries_nonnegative_runs;
ALTER TABLE public.cricket_deliveries
  ADD CONSTRAINT cricket_deliveries_nonnegative_runs
  CHECK (runs_batter >= 0 AND runs_extra >= 0) NOT VALID;

-- A rally match is only complete after one side wins the configured majority.
CREATE OR REPLACE FUNCTION public.rally_complete_match(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_target INT;
  v_cap INT;
  v_games INT;
  v_needed INT;
  v_wa INT;
  v_wb INT;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  IF v_match.sport = 'Badminton' THEN
    v_target := COALESCE(NULLIF(v_match.config->>'points_per_game', '')::INT, 21);
    v_cap := COALESCE(NULLIF(v_match.config->>'deuce_cap', '')::INT, 30);
  ELSIF v_match.sport = 'Table Tennis' THEN
    v_target := COALESCE(NULLIF(v_match.config->>'points_per_game', '')::INT, 11);
    v_cap := NULLIF(v_match.config->>'deuce_cap', '')::INT;
  ELSE
    RAISE EXCEPTION 'rally_complete_match does not apply to sport %', v_match.sport;
  END IF;

  v_games := COALESCE(NULLIF(v_match.config->>'games', '')::INT, 3);
  v_needed := (v_games / 2) + 1;

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
  IF GREATEST(v_wa, v_wb) < v_needed THEN
    RAISE EXCEPTION 'A side must win % games before the match can finish', v_needed;
  END IF;

  UPDATE public.matches
  SET status = 'completed',
      winner_franchise_id = CASE WHEN v_wa > v_wb THEN franchise_a_id ELSE franchise_b_id END,
      is_tie = FALSE,
      result_summary = format('won %s - %s games', GREATEST(v_wa, v_wb), LEAST(v_wa, v_wb))
  WHERE id = p_match_id;
END;
$$;

-- Validate best-of formats and timed periods before allowing completion.
CREATE OR REPLACE FUNCTION public.team_sport_complete_match(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_sa NUMERIC := 0;
  v_sb NUMERIC := 0;
  v_tb_a INT := 0;
  v_tb_b INT := 0;
  v_sets INT;
  v_needed INT;
  v_target INT;
  v_final_pts INT;
  v_quarters INT;
  v_winner UUID;
  v_tie BOOLEAN;
  v_summary TEXT;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status = 'completed' THEN RAISE EXCEPTION 'Match already completed'; END IF;

  IF v_match.sport = 'Football' THEN
    SELECT
      COUNT(*) FILTER (WHERE (type = 'goal' AND minute < 121 AND team_franchise_id = v_match.franchise_a_id)
        OR (type = 'own_goal' AND team_franchise_id = v_match.franchise_b_id)),
      COUNT(*) FILTER (WHERE (type = 'goal' AND minute < 121 AND team_franchise_id = v_match.franchise_b_id)
        OR (type = 'own_goal' AND team_franchise_id = v_match.franchise_a_id)),
      COUNT(*) FILTER (WHERE (type = 'pen_goal' OR (type = 'goal' AND minute >= 121))
        AND team_franchise_id = v_match.franchise_a_id),
      COUNT(*) FILTER (WHERE (type = 'pen_goal' OR (type = 'goal' AND minute >= 121))
        AND team_franchise_id = v_match.franchise_b_id)
    INTO v_sa, v_sb, v_tb_a, v_tb_b
    FROM public.football_events WHERE match_id = p_match_id;

    IF v_sa = v_sb AND (v_tb_a > 0 OR v_tb_b > 0) THEN
      IF v_tb_a = v_tb_b THEN RAISE EXCEPTION 'Penalty shootout is still level'; END IF;
      v_winner := CASE WHEN v_tb_a > v_tb_b THEN v_match.franchise_a_id ELSE v_match.franchise_b_id END;
      v_tie := FALSE;
      v_summary := format('won %s - %s on penalties', GREATEST(v_tb_a, v_tb_b), LEAST(v_tb_a, v_tb_b));
    ELSE
      v_tie := v_sa = v_sb;
      v_winner := CASE WHEN v_tie THEN NULL WHEN v_sa > v_sb THEN v_match.franchise_a_id ELSE v_match.franchise_b_id END;
      v_summary := CASE WHEN v_tie THEN format('drew %s - %s', v_sa, v_sb)
        ELSE format('won %s - %s', GREATEST(v_sa, v_sb), LEAST(v_sa, v_sb)) END;
    END IF;

  ELSIF v_match.sport = 'Volleyball' THEN
    v_sets := COALESCE(NULLIF(v_match.config->>'sets', '')::INT, 3);
    v_needed := (v_sets / 2) + 1;
    v_target := COALESCE(NULLIF(v_match.config->>'points_per_set', '')::INT, 25);
    v_final_pts := COALESCE(NULLIF(v_match.config->>'final_set_points', '')::INT, 15);
    WITH per_set AS (
      SELECT set_number,
        COUNT(*) FILTER (WHERE scoring_team_franchise_id = v_match.franchise_a_id) AS a,
        COUNT(*) FILTER (WHERE scoring_team_franchise_id = v_match.franchise_b_id) AS b
      FROM public.volleyball_points WHERE match_id = p_match_id GROUP BY set_number
    ), winners AS (
      SELECT CASE
        WHEN GREATEST(a, b) >= CASE WHEN set_number = v_sets THEN v_final_pts ELSE v_target END
          AND ABS(a - b) >= 2
        THEN CASE WHEN a > b THEN v_match.franchise_a_id ELSE v_match.franchise_b_id END
      END AS winner
      FROM per_set
    )
    SELECT COUNT(*) FILTER (WHERE winner = v_match.franchise_a_id),
           COUNT(*) FILTER (WHERE winner = v_match.franchise_b_id)
    INTO v_sa, v_sb FROM winners;
    IF GREATEST(v_sa, v_sb) < v_needed THEN
      RAISE EXCEPTION 'A side must win % sets before the match can finish', v_needed;
    END IF;
    v_tie := FALSE;
    v_winner := CASE WHEN v_sa > v_sb THEN v_match.franchise_a_id ELSE v_match.franchise_b_id END;
    v_summary := format('won %s - %s sets', GREATEST(v_sa, v_sb), LEAST(v_sa, v_sb));

  ELSIF v_match.sport = 'Basketball' THEN
    v_quarters := COALESCE(NULLIF(v_match.config->>'quarters', '')::INT, 4);
    IF v_match.current_period < v_quarters THEN
      RAISE EXCEPTION 'Complete all % regulation periods before finishing', v_quarters;
    END IF;
    SELECT COALESCE(SUM(points) FILTER (WHERE team_franchise_id = v_match.franchise_a_id), 0),
           COALESCE(SUM(points) FILTER (WHERE team_franchise_id = v_match.franchise_b_id), 0)
    INTO v_sa, v_sb FROM public.basketball_points WHERE match_id = p_match_id;
    IF v_sa = v_sb THEN RAISE EXCEPTION 'Scores level %-% - play overtime before finishing', v_sa, v_sb; END IF;
    v_tie := FALSE;
    v_winner := CASE WHEN v_sa > v_sb THEN v_match.franchise_a_id ELSE v_match.franchise_b_id END;
    v_summary := format('won %s - %s', GREATEST(v_sa, v_sb), LEAST(v_sa, v_sb));

  ELSIF v_match.sport = 'Kabaddi' THEN
    SELECT COALESCE(SUM(value) FILTER (WHERE team_franchise_id = v_match.franchise_a_id), 0),
           COALESCE(SUM(value) FILTER (WHERE team_franchise_id = v_match.franchise_b_id), 0)
    INTO v_sa, v_sb FROM public.match_sport_events WHERE match_id = p_match_id;
    IF v_sa = v_sb THEN RAISE EXCEPTION 'Scores level %-% - complete the tiebreak or Golden Raid', v_sa, v_sb; END IF;
    v_tie := FALSE;
    v_winner := CASE WHEN v_sa > v_sb THEN v_match.franchise_a_id ELSE v_match.franchise_b_id END;
    v_summary := format('won %s - %s', GREATEST(v_sa, v_sb), LEAST(v_sa, v_sb));

  ELSIF v_match.sport IN ('Badminton', 'Table Tennis') THEN
    PERFORM public.rally_complete_match(p_match_id);
    RETURN;
  ELSIF v_match.sport = 'Carrom' THEN
    PERFORM public.carrom_complete_match(p_match_id);
    RETURN;
  ELSE
    RAISE EXCEPTION 'This sport completes automatically or uses its dedicated result action';
  END IF;

  UPDATE public.matches SET status = 'completed', winner_franchise_id = v_winner,
    is_tie = v_tie, result_summary = v_summary WHERE id = p_match_id;
END;
$$;

-- Count one board at most once and require the configured majority.
CREATE OR REPLACE FUNCTION public.carrom_complete_match(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_boards INT;
  v_needed INT;
  v_wa INT;
  v_wb INT;
  v_pa NUMERIC;
  v_pb NUMERIC;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND OR v_match.sport <> 'Carrom' THEN RAISE EXCEPTION 'Carrom match not found'; END IF;
  v_boards := COALESCE(NULLIF(v_match.config->>'boards', '')::INT, 1);
  v_needed := (v_boards / 2) + 1;

  WITH board_winners AS (
    SELECT DISTINCT ON (period) period, team_franchise_id
    FROM public.match_sport_events
    WHERE match_id = p_match_id AND kind = 'board_win'
    ORDER BY period, created_at
  )
  SELECT COUNT(*) FILTER (WHERE team_franchise_id = v_match.franchise_a_id),
         COUNT(*) FILTER (WHERE team_franchise_id = v_match.franchise_b_id)
  INTO v_wa, v_wb FROM board_winners;
  IF GREATEST(v_wa, v_wb) < v_needed THEN
    RAISE EXCEPTION 'A side must win % boards before the match can finish', v_needed;
  END IF;
  SELECT COALESCE(SUM(value) FILTER (WHERE team_franchise_id = v_match.franchise_a_id), 0),
         COALESCE(SUM(value) FILTER (WHERE team_franchise_id = v_match.franchise_b_id), 0)
  INTO v_pa, v_pb FROM public.match_sport_events WHERE match_id = p_match_id;

  UPDATE public.matches SET status = 'completed',
    winner_franchise_id = CASE WHEN v_wa > v_wb THEN franchise_a_id ELSE franchise_b_id END,
    is_tie = FALSE,
    result_summary = format('won %s - %s boards (%s - %s pts)', GREATEST(v_wa, v_wb), LEAST(v_wa, v_wb), v_pa, v_pb)
  WHERE id = p_match_id;
END;
$$;

-- Cricket completion must have a finished chase and must use the configured
-- number of players when reporting wickets remaining.
CREATE OR REPLACE FUNCTION public.cricket_complete_match(p_match_id UUID)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_innings1 public.cricket_innings%ROWTYPE;
  v_innings2 public.cricket_innings%ROWTYPE;
  v_result TEXT;
  v_winner UUID;
  v_is_tie BOOLEAN := FALSE;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND OR v_match.sport <> 'Cricket' THEN RAISE EXCEPTION 'Cricket match not found'; END IF;
  SELECT * INTO v_innings1 FROM public.cricket_innings WHERE match_id = p_match_id AND innings_number = 1;
  SELECT * INTO v_innings2 FROM public.cricket_innings WHERE match_id = p_match_id AND innings_number = 2;
  IF v_innings1.id IS NULL OR v_innings2.id IS NULL THEN RAISE EXCEPTION 'Both innings must exist before completing the match'; END IF;
  IF NOT v_innings2.is_closed
     AND v_innings2.total_runs < v_innings2.target
     AND v_innings2.wickets < v_match.players_per_side - 1
     AND v_innings2.legal_balls < v_match.overs_per_innings * v_match.balls_per_over THEN
    RAISE EXCEPTION 'The second innings is still in progress';
  END IF;

  IF v_innings2.total_runs > v_innings1.total_runs THEN
    v_winner := v_innings2.batting_franchise_id;
    v_result := 'won by ' || (v_match.players_per_side - v_innings2.wickets) || ' wickets';
  ELSIF v_innings2.total_runs < v_innings1.total_runs THEN
    v_winner := v_innings1.batting_franchise_id;
    v_result := 'won by ' || (v_innings1.total_runs - v_innings2.total_runs) || ' runs';
  ELSE
    v_is_tie := TRUE;
    v_result := 'Match tied';
  END IF;
  UPDATE public.matches SET status = 'completed', result_summary = v_result,
    winner_franchise_id = v_winner, is_tie = v_is_tie WHERE id = p_match_id RETURNING * INTO v_match;
  RETURN v_match;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rally_complete_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_sport_complete_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.carrom_complete_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_complete_match(UUID) TO authenticated;

COMMIT;
