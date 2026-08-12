-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Cricket scoring integrity corrections                    ║
-- ║  Safe corrective migration; no match data is deleted. ║
-- ╚══════════════════════════════════════════════════════════╝
--
-- All state mutations go through SECURITY DEFINER functions with FOR UPDATE
-- row locks (atomic, safe for concurrent scorer taps). Direct table writes
-- are revoked from authenticated. Each delivery stores a pre-ball snapshot
-- so Undo is exact and O(1).

BEGIN;

-- ============================================================
-- GUARD: Require authorized scorer (assigned scorer OR admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_require_scorer(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_match_scorer(p_match_id) THEN
    RAISE EXCEPTION 'Only the assigned scorer or an admin can operate this match'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ============================================================
-- 1. SETUP MATCH — Initialize playing XIs from squad
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_setup_match(
  p_match_id UUID,
  p_players_a JSONB,  -- [{registration_id?, full_name, batting_order, role?}...]
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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.status <> 'scheduled' THEN
    RAISE EXCEPTION
      'Match has already started; cannot modify squads';
  END IF;

  IF v_match.sport <> 'Cricket' THEN
    RAISE EXCEPTION
      'cricket_setup_match requires a Cricket match';
  END IF;

  IF
    jsonb_typeof(p_players_a) <> 'array'
    OR jsonb_typeof(p_players_b) <> 'array'
  THEN
    RAISE EXCEPTION
      'Both cricket squads must be JSON arrays';
  END IF;

  IF
    jsonb_array_length(p_players_a) <>
      v_match.players_per_side
    OR
    jsonb_array_length(p_players_b) <>
      v_match.players_per_side
  THEN
    RAISE EXCEPTION
      'Each side must contain exactly % players',
      v_match.players_per_side;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      p_players_a || p_players_b
    ) AS p
    WHERE
      length(
        trim(
          COALESCE(
            p->>'full_name',
            ''
          )
        )
      ) = 0
      OR
      COALESCE(
        (p->>'batting_order')::INT,
        0
      ) NOT BETWEEN
        1 AND v_match.players_per_side
  ) THEN
    RAISE EXCEPTION
      'Every cricket player needs a name and valid batting order';
  END IF;

  IF EXISTS (
    SELECT registration_id
    FROM (
      SELECT
        NULLIF(
          p->>'registration_id',
          ''
        )::UUID AS registration_id
      FROM jsonb_array_elements(
        p_players_a || p_players_b
      ) AS p
    ) registrations
    WHERE registration_id IS NOT NULL
    GROUP BY registration_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'The same registered player cannot appear twice in a match';
  END IF;

  -- Clear any existing players and insert fresh XIs.
  DELETE FROM public.match_players WHERE match_id = p_match_id;

  INSERT INTO public.match_players (match_id, franchise_id, registration_id, full_name, batting_order, role)
  SELECT
    p_match_id,
    v_match.franchise_a_id,
    (p->>'registration_id')::UUID,
    p->>'full_name',
    (p->>'batting_order')::SMALLINT,
    p->>'role'
  FROM jsonb_array_elements(p_players_a) AS p;

  INSERT INTO public.match_players (match_id, franchise_id, registration_id, full_name, batting_order, role)
  SELECT
    p_match_id,
    v_match.franchise_b_id,
    (p->>'registration_id')::UUID,
    p->>'full_name',
    (p->>'batting_order')::SMALLINT,
    p->>'role'
  FROM jsonb_array_elements(p_players_b) AS p;
END;
$$;

-- ============================================================
-- 2. RECORD TOSS — Set toss winner + decision; create innings 1
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_record_toss(
  p_match_id UUID,
  p_toss_winner_franchise_id UUID,
  p_decision TEXT  -- 'bat' | 'bowl'
)
RETURNS public.cricket_innings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_batting_fid UUID;
  v_bowling_fid UUID;
  v_innings public.cricket_innings%ROWTYPE;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);

  IF p_decision NOT IN ('bat','bowl') THEN
    RAISE EXCEPTION 'Decision must be bat or bowl';
  END IF;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Toss already recorded';
  END IF;

  IF v_match.sport <> 'Cricket' THEN
    RAISE EXCEPTION
      'cricket_record_toss requires a Cricket match';
  END IF;

  IF p_toss_winner_franchise_id NOT IN (
    v_match.franchise_a_id,
    v_match.franchise_b_id
  ) THEN
    RAISE EXCEPTION
      'Toss winner must be one of the two match franchises';
  END IF;

  IF
    (
      SELECT COUNT(*)
      FROM public.match_players
      WHERE
        match_id = p_match_id
        AND franchise_id =
          v_match.franchise_a_id
        AND is_playing
    ) <> v_match.players_per_side
    OR
    (
      SELECT COUNT(*)
      FROM public.match_players
      WHERE
        match_id = p_match_id
        AND franchise_id =
          v_match.franchise_b_id
        AND is_playing
    ) <> v_match.players_per_side
  THEN
    RAISE EXCEPTION
      'Both playing squads must be complete before the toss';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cricket_innings
    WHERE match_id = p_match_id
  ) THEN
    RAISE EXCEPTION
      'Cricket innings already exist for this match';
  END IF;

  IF p_decision = 'bat' THEN
    v_batting_fid := p_toss_winner_franchise_id;
    v_bowling_fid := CASE
      WHEN p_toss_winner_franchise_id = v_match.franchise_a_id THEN v_match.franchise_b_id
      ELSE v_match.franchise_a_id
    END;
  ELSE
    v_bowling_fid := p_toss_winner_franchise_id;
    v_batting_fid := CASE
      WHEN p_toss_winner_franchise_id = v_match.franchise_a_id THEN v_match.franchise_b_id
      ELSE v_match.franchise_a_id
    END;
  END IF;

  UPDATE public.matches
  SET toss_winner_franchise_id = p_toss_winner_franchise_id,
      toss_decision = p_decision
  WHERE id = p_match_id;

  INSERT INTO public.cricket_innings (match_id, innings_number, batting_franchise_id, bowling_franchise_id)
  VALUES (p_match_id, 1, v_batting_fid, v_bowling_fid)
  RETURNING * INTO v_innings;

  RETURN v_innings;
END;
$$;

-- ============================================================
-- 3. SET OPENERS — Pick striker, non-striker, opening bowler
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_set_openers(
  p_innings_id UUID,
  p_striker_id UUID,
  p_non_striker_id UUID,
  p_bowler_id UUID
)
RETURNS public.cricket_innings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_innings public.cricket_innings%ROWTYPE;
  v_match_id UUID;
BEGIN
  SELECT * INTO v_innings FROM public.cricket_innings WHERE id = p_innings_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Innings not found';
  END IF;

  v_match_id := v_innings.match_id;
  PERFORM public.cricket_require_scorer(v_match_id);

  IF v_innings.legal_balls > 0 THEN
    RAISE EXCEPTION
      'Cannot set openers after scoring has started';
  END IF;

  IF v_innings.is_closed THEN
    RAISE EXCEPTION
      'Innings is already closed';
  END IF;

  IF p_striker_id = p_non_striker_id THEN
    RAISE EXCEPTION
      'Striker and non-striker must be different players';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.match_players
    WHERE
      id = p_striker_id
      AND match_id = v_match_id
      AND franchise_id =
        v_innings.batting_franchise_id
      AND is_playing
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.match_players
    WHERE
      id = p_non_striker_id
      AND match_id = v_match_id
      AND franchise_id =
        v_innings.batting_franchise_id
      AND is_playing
  ) THEN
    RAISE EXCEPTION
      'Both opening batters must belong to the batting side';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.match_players
    WHERE
      id = p_bowler_id
      AND match_id = v_match_id
      AND franchise_id =
        v_innings.bowling_franchise_id
      AND is_playing
  ) THEN
    RAISE EXCEPTION
      'Opening bowler must belong to the bowling side';
  END IF;

  UPDATE public.cricket_innings
  SET striker_id = p_striker_id,
      non_striker_id = p_non_striker_id,
      current_bowler_id = p_bowler_id
  WHERE id = p_innings_id
  RETURNING * INTO v_innings;

  UPDATE public.matches SET status = 'live' WHERE id = v_match_id;

  RETURN v_innings;
END;
$$;

-- ============================================================
-- 4. RECORD BALL — Core delivery engine
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_record_ball(
  p_innings_id UUID,
  p_ball_type TEXT,        -- 'runs','wide','noball','bye','legbye'
  p_runs_batter INTEGER DEFAULT 0,
  p_runs_extra INTEGER DEFAULT 0,
  p_wagon_angle SMALLINT DEFAULT NULL,
  p_wagon_distance SMALLINT DEFAULT NULL,
  p_pitch_x SMALLINT DEFAULT NULL,
  p_pitch_y SMALLINT DEFAULT NULL
)
RETURNS public.cricket_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_innings public.cricket_innings%ROWTYPE;
  v_match public.matches%ROWTYPE;
  v_delivery public.cricket_deliveries%ROWTYPE;
  v_over_number INTEGER;
  v_ball_in_over INTEGER;
  v_legal_ball_seq INTEGER;
  v_global_seq INTEGER;
  v_is_legal BOOLEAN;
  v_total_runs_this_ball INTEGER;
  v_running_runs INTEGER;
  v_penalty INTEGER;
  v_commentary TEXT;
  v_new_striker UUID;
  v_new_non_striker UUID;
BEGIN
  SELECT * INTO v_innings FROM public.cricket_innings WHERE id = p_innings_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Innings not found';
  END IF;

  SELECT * INTO v_match FROM public.matches WHERE id = v_innings.match_id FOR UPDATE;
  PERFORM public.cricket_require_scorer(v_match.id);

  IF v_innings.is_closed THEN
    RAISE EXCEPTION 'Innings is already closed';
  END IF;

  IF v_innings.striker_id IS NULL OR v_innings.non_striker_id IS NULL THEN
    RAISE EXCEPTION 'A new batsman must be selected before the next ball';
  END IF;

  IF v_innings.current_bowler_id IS NULL THEN
    RAISE EXCEPTION 'A new bowler must be selected before the next ball';
  END IF;

  -- Terminal-state guards: once an innings is decided, no further balls are
  -- allowed. The console surfaces "End innings" / "Complete match" instead.
  IF v_innings.legal_balls >= v_match.overs_per_innings * v_match.balls_per_over THEN
    RAISE EXCEPTION 'All overs have been bowled; end the innings';
  END IF;

  IF v_innings.wickets >= v_match.players_per_side - 1 THEN
    RAISE EXCEPTION 'The batting side is all out; end the innings';
  END IF;

  IF v_innings.innings_number = 2
     AND v_innings.target IS NOT NULL
     AND v_innings.total_runs >= v_innings.target THEN
    RAISE EXCEPTION 'The target has been chased; complete the match';
  END IF;

  -- Determine if this ball is legal (counts toward the over).
  v_is_legal := (p_ball_type NOT IN ('wide','noball'));

  IF v_is_legal THEN
    v_over_number := v_innings.legal_balls / v_match.balls_per_over;
    v_ball_in_over := (v_innings.legal_balls % v_match.balls_per_over) + 1;
    v_legal_ball_seq := v_innings.legal_balls + 1;
  ELSE
    v_over_number := v_innings.legal_balls / v_match.balls_per_over;
    v_ball_in_over := (v_innings.legal_balls % v_match.balls_per_over) + 1;
    v_legal_ball_seq := NULL;
  END IF;

  v_global_seq := COALESCE((SELECT MAX(global_seq) FROM public.cricket_deliveries WHERE innings_id = p_innings_id), 0) + 1;

  v_penalty :=
    v_match.wide_noball_penalty;

  IF p_runs_batter < 0 OR p_runs_extra < 0 THEN
    RAISE EXCEPTION
      'Runs cannot be negative';
  END IF;

  IF
    p_ball_type = 'runs'
    AND p_runs_extra <> 0
  THEN
    RAISE EXCEPTION
      'Normal deliveries cannot contain extras';

  ELSIF
    p_ball_type = 'wide'
    AND (
      p_runs_batter <> 0
      OR p_runs_extra < v_penalty
    )
  THEN
    RAISE EXCEPTION
      'A Wide must contain the configured Wide penalty and no batter runs';

  ELSIF
    p_ball_type = 'noball'
    AND p_runs_extra < v_penalty
  THEN
    RAISE EXCEPTION
      'A No ball must contain the configured No-ball penalty';

  ELSIF
    p_ball_type IN ('bye','legbye')
    AND p_runs_batter <> 0
  THEN
    RAISE EXCEPTION
      'Byes and leg byes cannot be credited as batter runs';
  END IF;

  v_total_runs_this_ball :=
    p_runs_batter + p_runs_extra;

  -- Automatic Wide/No-ball penalty runs do not themselves
  -- cause the batters to change ends.
  v_running_runs :=
    CASE
      WHEN p_ball_type = 'wide'
        THEN GREATEST(
          p_runs_extra - v_penalty,
          0
        )
      WHEN p_ball_type = 'noball'
        THEN p_runs_batter
      WHEN p_ball_type IN (
        'bye',
        'legbye'
      )
        THEN p_runs_extra
      ELSE p_runs_batter
    END;

  -- Auto-generate commentary.
  v_commentary := CASE
    WHEN p_ball_type = 'wide' THEN 'Wide, ' || p_runs_extra || ' extra'
    WHEN p_ball_type = 'noball' THEN 'No ball, ' || (p_runs_batter + p_runs_extra) || ' runs'
    WHEN p_ball_type = 'bye' THEN p_runs_extra || ' bye(s)'
    WHEN p_ball_type = 'legbye' THEN p_runs_extra || ' leg bye(s)'
    WHEN p_runs_batter = 0 THEN 'Dot ball'
    WHEN p_runs_batter = 4 THEN 'FOUR!'
    WHEN p_runs_batter = 6 THEN 'SIX!'
    ELSE p_runs_batter || ' run(s)'
  END;

  -- Insert the delivery with pre-ball snapshot.
  INSERT INTO public.cricket_deliveries (
    innings_id, global_seq, over_number, ball_in_over, legal_ball_seq,
    striker_id, non_striker_id, bowler_id,
    ball_type, runs_batter, runs_extra,
    wagon_angle, wagon_distance, pitch_x, pitch_y, commentary,
    prev_striker_id, prev_non_striker_id, prev_bowler_id, prev_last_over_bowler_id,
    prev_total_runs, prev_wickets, prev_legal_balls,
    prev_extras_wide, prev_extras_noball, prev_extras_bye, prev_extras_legbye
  ) VALUES (
    p_innings_id, v_global_seq, v_over_number, v_ball_in_over, v_legal_ball_seq,
    v_innings.striker_id, v_innings.non_striker_id, v_innings.current_bowler_id,
    p_ball_type, p_runs_batter, p_runs_extra,
    p_wagon_angle, p_wagon_distance, p_pitch_x, p_pitch_y, v_commentary,
    v_innings.striker_id, v_innings.non_striker_id, v_innings.current_bowler_id, v_innings.last_over_bowler_id,
    v_innings.total_runs, v_innings.wickets, v_innings.legal_balls,
    v_innings.extras_wide, v_innings.extras_noball, v_innings.extras_bye, v_innings.extras_legbye
  ) RETURNING * INTO v_delivery;

  -- Update innings aggregates.
  UPDATE public.cricket_innings
  SET total_runs = total_runs + v_total_runs_this_ball,
      legal_balls = CASE WHEN v_is_legal THEN legal_balls + 1 ELSE legal_balls END,
      extras_wide = CASE WHEN p_ball_type = 'wide' THEN extras_wide + p_runs_extra ELSE extras_wide END,
      extras_noball = CASE WHEN p_ball_type = 'noball' THEN extras_noball + p_runs_extra ELSE extras_noball END,
      extras_bye = CASE WHEN p_ball_type = 'bye' THEN extras_bye + p_runs_extra ELSE extras_bye END,
      extras_legbye = CASE WHEN p_ball_type = 'legbye' THEN extras_legbye + p_runs_extra ELSE extras_legbye END
  WHERE id = p_innings_id;

  -- Auto strike rotation: odd runs swap, end of over swaps + clears bowler.
  v_new_striker := v_innings.striker_id;
  v_new_non_striker := v_innings.non_striker_id;

  IF v_running_runs % 2 = 1 THEN
    v_new_striker := v_innings.non_striker_id;
    v_new_non_striker := v_innings.striker_id;
  END IF;

  -- Over complete: swap ends and force new bowler selection.
  IF v_is_legal AND ((v_innings.legal_balls + 1) % v_match.balls_per_over = 0) THEN
    UPDATE public.cricket_innings
    SET striker_id = v_new_non_striker,
        non_striker_id = v_new_striker,
        last_over_bowler_id = current_bowler_id,
        current_bowler_id = NULL
    WHERE id = p_innings_id;
  ELSE
    UPDATE public.cricket_innings
    SET striker_id = v_new_striker,
        non_striker_id = v_new_non_striker
    WHERE id = p_innings_id;
  END IF;

  RETURN v_delivery;
END;
$$;

-- ============================================================
-- 5. RECORD WICKET — Variant of record_ball with dismissal
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_record_wicket(
  p_innings_id UUID,
  p_dismissal_type TEXT,  -- bowled,caught,lbw,run_out,stumped,hit_wicket,retired
  p_out_player_id UUID,
  p_fielder_id UUID DEFAULT NULL,
  p_runs_batter INTEGER DEFAULT 0,
  p_wagon_angle SMALLINT DEFAULT NULL,
  p_wagon_distance SMALLINT DEFAULT NULL,
  p_pitch_x SMALLINT DEFAULT NULL,
  p_pitch_y SMALLINT DEFAULT NULL
)
RETURNS public.cricket_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.cricket_deliveries%ROWTYPE;
  v_innings public.cricket_innings%ROWTYPE;
BEGIN
  SELECT *
  INTO v_innings
  FROM public.cricket_innings
  WHERE id = p_innings_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Innings not found';
  END IF;

  PERFORM
    public.cricket_require_scorer(
      v_innings.match_id
    );

  IF p_dismissal_type NOT IN (
    'bowled',
    'caught',
    'lbw',
    'run_out',
    'stumped',
    'hit_wicket'
  ) THEN
    RAISE EXCEPTION
      'Unsupported dismissal type %',
      p_dismissal_type;
  END IF;

  IF p_out_player_id NOT IN (
    v_innings.striker_id,
    v_innings.non_striker_id
  ) THEN
    RAISE EXCEPTION
      'Dismissed player must be one of the two current batters';
  END IF;

  IF
    p_dismissal_type <> 'run_out'
    AND p_out_player_id <>
      v_innings.striker_id
  THEN
    RAISE EXCEPTION
      '% can only dismiss the striker in this scoring flow',
      p_dismissal_type;
  END IF;

  IF
    p_dismissal_type <> 'run_out'
    AND p_runs_batter <> 0
  THEN
    RAISE EXCEPTION
      'Batter runs can only accompany a Run out in this wicket flow';
  END IF;

  IF
    p_dismissal_type IN (
      'caught',
      'stumped'
    )
    AND p_fielder_id IS NULL
  THEN
    RAISE EXCEPTION
      'A fielder must be selected for %',
      p_dismissal_type;
  END IF;

  IF
    p_fielder_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.match_players
      WHERE
        id = p_fielder_id
        AND match_id =
          v_innings.match_id
        AND franchise_id =
          v_innings.bowling_franchise_id
        AND is_playing
    )
  THEN
    RAISE EXCEPTION
      'Selected fielder does not belong to the bowling side';
  END IF;

  -- Record as a normal legal delivery first.
  v_delivery := public.cricket_record_ball(
    p_innings_id, 'runs', p_runs_batter, 0,
    p_wagon_angle, p_wagon_distance, p_pitch_x, p_pitch_y
  );

  -- Mark it as a wicket and update aggregates.
  UPDATE public.cricket_deliveries
  SET is_wicket = TRUE,
      dismissal_type = p_dismissal_type,
      out_player_id = p_out_player_id,
      fielder_id = p_fielder_id,
      commentary = p_dismissal_type || '! Wicket falls'
  WHERE id = v_delivery.id
  RETURNING * INTO v_delivery;

  -- Increment wickets and vacate the dismissed batsman's current slot so the
  -- record_ball guard forces the console to send a replacement batsman.
  UPDATE public.cricket_innings
  SET wickets = wickets + 1,
      striker_id = CASE WHEN striker_id = p_out_player_id THEN NULL ELSE striker_id END,
      non_striker_id = CASE WHEN non_striker_id = p_out_player_id THEN NULL ELSE non_striker_id END
  WHERE id = p_innings_id;

  RETURN v_delivery;
END;
$$;

-- ============================================================
-- 6. SET NEW BATSMAN — After a wicket
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_set_new_batsman(
  p_innings_id UUID,
  p_batsman_id UUID,
  p_end TEXT DEFAULT NULL
)
RETURNS public.cricket_innings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_innings public.cricket_innings%ROWTYPE;
  v_match public.matches%ROWTYPE;
  v_end TEXT;
BEGIN
  SELECT *
  INTO v_innings
  FROM public.cricket_innings
  WHERE id = p_innings_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Innings not found';
  END IF;

  PERFORM
    public.cricket_require_scorer(
      v_innings.match_id
    );

  SELECT *
  INTO v_match
  FROM public.matches
  WHERE id = v_innings.match_id;

  IF v_innings.is_closed THEN
    RAISE EXCEPTION
      'Innings is already closed';
  END IF;

  IF
    v_innings.wickets >=
      v_match.players_per_side - 1
  THEN
    RAISE EXCEPTION
      'Batting side is already all out';
  END IF;

  IF
    p_end IS NOT NULL
    AND p_end NOT IN (
      'striker',
      'non_striker'
    )
  THEN
    RAISE EXCEPTION
      'End must be striker or non_striker';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.match_players
    WHERE
      id = p_batsman_id
      AND match_id =
        v_innings.match_id
      AND franchise_id =
        v_innings.batting_franchise_id
      AND is_playing
  ) THEN
    RAISE EXCEPTION
      'New batter must belong to the batting side';
  END IF;

  IF p_batsman_id IN (
    v_innings.striker_id,
    v_innings.non_striker_id
  ) THEN
    RAISE EXCEPTION
      'That batter is already at the crease';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cricket_deliveries
    WHERE
      innings_id = p_innings_id
      AND is_wicket
      AND out_player_id =
        p_batsman_id
  ) THEN
    RAISE EXCEPTION
      'A dismissed batter cannot bat again';
  END IF;

  IF
    v_innings.striker_id IS NOT NULL
    AND v_innings.non_striker_id IS NOT NULL
  THEN
    RAISE EXCEPTION
      'There is no vacant batting end';
  END IF;

  v_end :=
    COALESCE(
      p_end,
      CASE
        WHEN
          v_innings.striker_id IS NULL
        THEN 'striker'
        ELSE 'non_striker'
      END
    );

  IF
    v_end = 'striker'
    AND v_innings.striker_id IS NOT NULL
  THEN
    RAISE EXCEPTION
      'Striker end is not vacant';
  END IF;

  IF
    v_end = 'non_striker'
    AND v_innings.non_striker_id IS NOT NULL
  THEN
    RAISE EXCEPTION
      'Non-striker end is not vacant';
  END IF;

  UPDATE public.cricket_innings
  SET
    striker_id =
      CASE
        WHEN v_end = 'striker'
          THEN p_batsman_id
        ELSE striker_id
      END,
    non_striker_id =
      CASE
        WHEN v_end = 'non_striker'
          THEN p_batsman_id
        ELSE non_striker_id
      END
  WHERE id = p_innings_id
  RETURNING *
  INTO v_innings;

  RETURN v_innings;
END;
$$;

-- ============================================================
-- 7. SET NEW BOWLER — After over completes
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_set_new_bowler(
  p_innings_id UUID,
  p_bowler_id UUID
)
RETURNS public.cricket_innings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_innings public.cricket_innings%ROWTYPE;
BEGIN
  SELECT *
  INTO v_innings
  FROM public.cricket_innings
  WHERE id = p_innings_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Innings not found';
  END IF;

  PERFORM
    public.cricket_require_scorer(
      v_innings.match_id
    );

  IF v_innings.is_closed THEN
    RAISE EXCEPTION
      'Innings is already closed';
  END IF;

  IF v_innings.current_bowler_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Current over already has a bowler';
  END IF;

  IF
    v_innings.last_over_bowler_id =
      p_bowler_id
  THEN
    RAISE EXCEPTION
      'A bowler cannot bowl consecutive overs';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.match_players
    WHERE
      id = p_bowler_id
      AND match_id =
        v_innings.match_id
      AND franchise_id =
        v_innings.bowling_franchise_id
      AND is_playing
  ) THEN
    RAISE EXCEPTION
      'New bowler must belong to the bowling side';
  END IF;

  UPDATE public.cricket_innings
  SET current_bowler_id =
    p_bowler_id
  WHERE id = p_innings_id
  RETURNING *
  INTO v_innings;

  RETURN v_innings;
END;
$$;

-- ============================================================
-- 8. SWAP STRIKE — Manual override
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_swap_strike(p_innings_id UUID)
RETURNS public.cricket_innings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_innings public.cricket_innings%ROWTYPE;
BEGIN
  SELECT * INTO v_innings FROM public.cricket_innings WHERE id = p_innings_id FOR UPDATE;
  PERFORM public.cricket_require_scorer(v_innings.match_id);

  UPDATE public.cricket_innings
  SET striker_id = non_striker_id,
      non_striker_id = striker_id
  WHERE id = p_innings_id
  RETURNING * INTO v_innings;

  RETURN v_innings;
END;
$$;

-- ============================================================
-- 9. UNDO LAST BALL — Delete + restore pre-ball snapshot
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_undo_last_ball(p_innings_id UUID)
RETURNS public.cricket_innings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_innings public.cricket_innings%ROWTYPE;
  v_last public.cricket_deliveries%ROWTYPE;
BEGIN
  SELECT * INTO v_innings FROM public.cricket_innings WHERE id = p_innings_id FOR UPDATE;
  PERFORM public.cricket_require_scorer(v_innings.match_id);

  SELECT * INTO v_last
  FROM public.cricket_deliveries
  WHERE innings_id = p_innings_id
  ORDER BY global_seq DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No deliveries to undo';
  END IF;

  -- Restore pre-ball state.
  UPDATE public.cricket_innings
  SET striker_id = v_last.prev_striker_id,
      non_striker_id = v_last.prev_non_striker_id,
      current_bowler_id = v_last.prev_bowler_id,
      last_over_bowler_id = v_last.prev_last_over_bowler_id,
      total_runs = v_last.prev_total_runs,
      wickets = v_last.prev_wickets,
      legal_balls = v_last.prev_legal_balls,
      extras_wide = v_last.prev_extras_wide,
      extras_noball = v_last.prev_extras_noball,
      extras_bye = v_last.prev_extras_bye,
      extras_legbye = v_last.prev_extras_legbye
  WHERE id = p_innings_id
  RETURNING * INTO v_innings;

  DELETE FROM public.cricket_deliveries WHERE id = v_last.id;

  RETURN v_innings;
END;
$$;

-- ============================================================
-- 10. CLOSE INNINGS — Guarded end (all out / overs done / chase achieved)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_close_innings(
  p_innings_id UUID
)
RETURNS public.cricket_innings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_innings public.cricket_innings%ROWTYPE;
  v_match public.matches%ROWTYPE;
  v_innings2 public.cricket_innings%ROWTYPE;
  v_terminal BOOLEAN;
BEGIN
  SELECT *
  INTO v_innings
  FROM public.cricket_innings
  WHERE id = p_innings_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Innings not found';
  END IF;

  PERFORM
    public.cricket_require_scorer(
      v_innings.match_id
    );

  SELECT *
  INTO v_match
  FROM public.matches
  WHERE id = v_innings.match_id
  FOR UPDATE;

  IF v_innings.is_closed THEN
    RAISE EXCEPTION
      'Innings is already closed';
  END IF;

  v_terminal :=
    v_innings.legal_balls >=
      v_match.overs_per_innings *
      v_match.balls_per_over
    OR
    v_innings.wickets >=
      v_match.players_per_side - 1
    OR (
      v_innings.innings_number = 2
      AND v_innings.target IS NOT NULL
      AND v_innings.total_runs >=
        v_innings.target
    );

  IF NOT v_terminal THEN
    RAISE EXCEPTION
      'Innings cannot end yet: overs remain, wickets remain, and the chase is unfinished';
  END IF;

  UPDATE public.cricket_innings
  SET is_closed = TRUE
  WHERE id = p_innings_id
  RETURNING *
  INTO v_innings;

  IF v_innings.innings_number = 1 THEN

    IF EXISTS (
      SELECT 1
      FROM public.cricket_innings
      WHERE
        match_id = v_match.id
        AND innings_number = 2
    ) THEN
      RAISE EXCEPTION
        'Second innings already exists';
    END IF;

    INSERT INTO public.cricket_innings (
      match_id,
      innings_number,
      batting_franchise_id,
      bowling_franchise_id,
      target
    )
    VALUES (
      v_match.id,
      2,
      v_innings.bowling_franchise_id,
      v_innings.batting_franchise_id,
      v_innings.total_runs + 1
    )
    RETURNING *
    INTO v_innings2;

    UPDATE public.matches
    SET status = 'innings_break'
    WHERE id = v_match.id;
  END IF;

  RETURN v_innings;
END;
$$;

-- ============================================================
-- 11. COMPLETE MATCH — Compute result and set status
-- ============================================================
CREATE OR REPLACE FUNCTION public.cricket_complete_match(
  p_match_id UUID
)
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

  v_second_terminal BOOLEAN;
  v_wickets_remaining INTEGER;
BEGIN
  PERFORM
    public.cricket_require_scorer(
      p_match_id
    );

  SELECT *
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.status = 'completed' THEN
    RAISE EXCEPTION
      'Match is already completed';
  END IF;

  SELECT *
  INTO v_innings1
  FROM public.cricket_innings
  WHERE
    match_id = p_match_id
    AND innings_number = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'First innings does not exist';
  END IF;

  SELECT *
  INTO v_innings2
  FROM public.cricket_innings
  WHERE
    match_id = p_match_id
    AND innings_number = 2
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Second innings does not exist';
  END IF;

  IF NOT v_innings1.is_closed THEN
    RAISE EXCEPTION
      'First innings must be closed before the match can complete';
  END IF;

  v_second_terminal :=
    v_innings2.total_runs >=
      COALESCE(
        v_innings2.target,
        v_innings1.total_runs + 1
      )
    OR
    v_innings2.legal_balls >=
      v_match.overs_per_innings *
      v_match.balls_per_over
    OR
    v_innings2.wickets >=
      v_match.players_per_side - 1;

  IF NOT v_second_terminal THEN
    RAISE EXCEPTION
      'Second innings is not finished yet';
  END IF;

  IF
    v_innings2.total_runs >
      v_innings1.total_runs
  THEN
    v_winner :=
      v_innings2.batting_franchise_id;

    v_wickets_remaining :=
      GREATEST(
        v_match.players_per_side
          - 1
          - v_innings2.wickets,
        0
      );

    v_result :=
      'won by '
      || v_wickets_remaining
      || ' wickets';

  ELSIF
    v_innings2.total_runs <
      v_innings1.total_runs
  THEN
    v_winner :=
      v_innings1.batting_franchise_id;

    v_result :=
      'won by '
      || (
        v_innings1.total_runs
        - v_innings2.total_runs
      )
      || ' runs';

  ELSE
    v_is_tie := TRUE;
    v_result := 'Match tied';
  END IF;

  UPDATE public.cricket_innings
  SET is_closed = TRUE
  WHERE id = v_innings2.id;

  UPDATE public.matches
  SET
    status = 'completed',
    result_summary = v_result,
    winner_franchise_id = v_winner,
    is_tie = v_is_tie
  WHERE id = p_match_id
  RETURNING *
  INTO v_match;

  RETURN v_match;
END;
$$;

-- ============================================================
-- 12. GRANTS
-- ============================================================
REVOKE INSERT, UPDATE, DELETE ON public.cricket_innings    FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cricket_deliveries FROM authenticated;

GRANT EXECUTE ON FUNCTION public.cricket_require_scorer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_setup_match(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_record_toss(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_set_openers(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_record_ball(UUID, TEXT, INTEGER, INTEGER, SMALLINT, SMALLINT, SMALLINT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_record_wicket(UUID, TEXT, UUID, UUID, INTEGER, SMALLINT, SMALLINT, SMALLINT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_set_new_batsman(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_set_new_bowler(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_swap_strike(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_undo_last_ball(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_close_innings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cricket_complete_match(UUID) TO authenticated;

-- Force PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';

COMMIT;
