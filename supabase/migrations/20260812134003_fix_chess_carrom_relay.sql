-- OLYMPUS
-- Chess, Carrom and Relay scoring corrections.
--
-- Kabaddi and Arm Wrestling are intentionally untouched.
--
-- No tables are dropped.
-- No existing match history is deleted.

BEGIN;


-- ============================================================
-- CHESS
-- ============================================================

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
  v_match public.matches%ROWTYPE;
  v_row public.match_sport_events%ROWTYPE;

  v_team UUID;
  v_value NUMERIC;

  v_reason TEXT;
  v_reason_label TEXT;
  v_label TEXT;
BEGIN
  v_match :=
    public.sport_lock_match(
      p_match_id
    );

  IF v_match.sport <> 'Chess' THEN
    RAISE EXCEPTION
      'chess_record_result requires a Chess match, got %',
      v_match.sport;
  END IF;

  IF p_result NOT IN (
    'a',
    'b',
    'draw'
  ) THEN
    RAISE EXCEPTION
      'Invalid result %',
      p_result;
  END IF;

  v_reason :=
    NULLIF(
      trim(
        COALESCE(
          p_reason,
          ''
        )
      ),
      ''
    );

  IF v_reason IS NULL THEN
    v_reason :=
      CASE
        WHEN p_result = 'draw'
          THEN 'agreement'
        ELSE 'other'
      END;
  END IF;

  IF v_reason NOT IN (
    'mate',
    'resign',
    'timeout',
    'agreement',
    'stalemate',
    'insufficient_material',
    'fifty_move',
    'armageddon',
    'other'
  ) THEN
    RAISE EXCEPTION
      'Invalid reason %',
      v_reason;
  END IF;


  IF
    p_result = 'draw'
    AND v_reason NOT IN (
      'agreement',
      'stalemate',
      'insufficient_material',
      'fifty_move',
      'other'
    )
  THEN
    RAISE EXCEPTION
      'Reason % is not a draw reason',
      v_reason;
  END IF;


  IF
    p_result IN ('a', 'b')
    AND v_reason NOT IN (
      'mate',
      'resign',
      'timeout',
      'armageddon',
      'other'
    )
  THEN
    RAISE EXCEPTION
      'Reason % is not a winning reason',
      v_reason;
  END IF;


  v_reason_label :=
    CASE v_reason
      WHEN 'mate'
        THEN 'Checkmate'
      WHEN 'resign'
        THEN 'Resignation'
      WHEN 'timeout'
        THEN 'Time forfeit'
      WHEN 'agreement'
        THEN 'Mutual agreement'
      WHEN 'stalemate'
        THEN 'Stalemate'
      WHEN 'insufficient_material'
        THEN 'Insufficient material'
      WHEN 'fifty_move'
        THEN '50-move rule'
      WHEN 'armageddon'
        THEN 'Armageddon'
      ELSE 'Other'
    END;


  v_team :=
    CASE p_result
      WHEN 'a'
        THEN v_match.franchise_a_id
      WHEN 'b'
        THEN v_match.franchise_b_id
      ELSE NULL
    END;

  v_value :=
    CASE
      WHEN p_result = 'draw'
        THEN 0.5
      ELSE 1
    END;

  v_label :=
    CASE
      WHEN p_result = 'draw'
        THEN 'Draw'
      ELSE 'Win'
    END;


  INSERT INTO public.match_sport_events (
    match_id,
    period,
    kind,
    team_franchise_id,
    value,
    label,
    meta
  )
  VALUES (
    p_match_id,
    COALESCE(
      v_match.current_period,
      1
    ),
    'result',
    v_team,
    v_value,
    v_label,
    jsonb_build_object(
      'reason',
      v_reason,
      'reason_label',
      v_reason_label
    )
  )
  RETURNING *
  INTO v_row;


  UPDATE public.matches
  SET
    status = 'completed',
    winner_franchise_id = v_team,
    is_tie =
      p_result = 'draw',
    result_summary =
      CASE
        WHEN p_result = 'draw'
          THEN format(
            'Draw (%s)',
            v_reason_label
          )
        ELSE format(
          'won by %s',
          v_reason_label
        )
      END
  WHERE id = p_match_id;


  RETURN v_row;
END;
$$;


-- ============================================================
-- CARROM
-- ============================================================

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
  v_match public.matches%ROWTYPE;
  v_row public.match_sport_events%ROWTYPE;

  v_board SMALLINT;
  v_boards INT;
  v_needed INT;

  v_value NUMERIC;
  v_label TEXT;

  v_team_points INT;
  v_opp UUID;
  v_opp_points INT;
  v_opp_remaining INT;

  v_wins_a INT;
  v_wins_b INT;
BEGIN
  v_match :=
    public.sport_lock_match(
      p_match_id
    );

  IF v_match.sport <> 'Carrom' THEN
    RAISE EXCEPTION
      'carrom_record_event requires a Carrom match, got %',
      v_match.sport;
  END IF;

  IF p_team_franchise_id NOT IN (
    v_match.franchise_a_id,
    v_match.franchise_b_id
  ) THEN
    RAISE EXCEPTION
      'Team is not part of this match';
  END IF;

  IF p_kind NOT IN (
    'point',
    'queen',
    'foul',
    'board_win'
  ) THEN
    RAISE EXCEPTION
      'Invalid carrom kind %',
      p_kind;
  END IF;


  v_board :=
    COALESCE(
      v_match.current_period,
      1
    );

  v_boards :=
    COALESCE(
      NULLIF(
        v_match.config->>'boards',
        ''
      )::INT,
      1
    );

  v_needed :=
    FLOOR(
      v_boards / 2.0
    )::INT + 1;


  IF
    v_board < 1
    OR v_board > v_boards
  THEN
    RAISE EXCEPTION
      'Invalid board %. Match has % boards.',
      v_board,
      v_boards;
  END IF;


  IF EXISTS (
    SELECT 1
    FROM public.match_sport_events
    WHERE match_id = p_match_id
      AND period = v_board
      AND kind = 'board_win'
  ) THEN
    RAISE EXCEPTION
      'Board % is already complete',
      v_board;
  END IF;


  SELECT COUNT(*)
  INTO v_team_points
  FROM public.match_sport_events
  WHERE match_id = p_match_id
    AND period = v_board
    AND kind = 'point'
    AND team_franchise_id =
      p_team_franchise_id;


  IF p_kind = 'point' THEN

    IF v_team_points >= 9 THEN
      RAISE EXCEPTION
        'All 9 pieces for this side are already recorded on Board %',
        v_board;
    END IF;

    v_value := 1;
    v_label := 'Coin';


  ELSIF p_kind = 'queen' THEN

    IF EXISTS (
      SELECT 1
      FROM public.match_sport_events
      WHERE match_id = p_match_id
        AND period = v_board
        AND kind = 'queen'
    ) THEN
      RAISE EXCEPTION
        'Queen is already recorded on Board %',
        v_board;
    END IF;

    v_value :=
      COALESCE(
        NULLIF(
          v_match.config->>'queen_points',
          ''
        )::NUMERIC,
        3
      );

    v_label := 'Queen covered';


  ELSIF p_kind = 'foul' THEN

    v_value := -1;
    v_label := 'Foul';


  ELSE

    IF v_team_points < 9 THEN
      RAISE EXCEPTION
        'Cannot win Board % yet: only % of 9 pieces are recorded',
        v_board,
        v_team_points;
    END IF;

    v_opp :=
      CASE
        WHEN
          p_team_franchise_id =
            v_match.franchise_a_id
        THEN
          v_match.franchise_b_id
        ELSE
          v_match.franchise_a_id
      END;

    SELECT COUNT(*)
    INTO v_opp_points
    FROM public.match_sport_events
    WHERE match_id = p_match_id
      AND period = v_board
      AND kind = 'point'
      AND team_franchise_id =
        v_opp;

    v_opp_remaining :=
      GREATEST(
        9 - v_opp_points,
        0
      );

    v_value :=
      v_opp_remaining;

    v_label := 'Board won';
  END IF;


  INSERT INTO public.match_sport_events (
    match_id,
    period,
    kind,
    team_franchise_id,
    value,
    label,
    meta
  )
  VALUES (
    p_match_id,
    v_board,
    p_kind,
    p_team_franchise_id,
    v_value,
    v_label,
    jsonb_build_object(
      'board',
      v_board,
      'player',
      p_player
    )
  )
  RETURNING *
  INTO v_row;


  IF p_kind = 'board_win' THEN

    SELECT
      COUNT(*) FILTER (
        WHERE team_franchise_id =
          v_match.franchise_a_id
      ),
      COUNT(*) FILTER (
        WHERE team_franchise_id =
          v_match.franchise_b_id
      )
    INTO
      v_wins_a,
      v_wins_b
    FROM public.match_sport_events
    WHERE match_id = p_match_id
      AND kind = 'board_win';


    IF
      GREATEST(
        v_wins_a,
        v_wins_b
      ) < v_needed
      AND v_board < v_boards
    THEN
      UPDATE public.matches
      SET current_period =
        v_board + 1
      WHERE id = p_match_id;
    END IF;
  END IF;


  RETURN v_row;
END;
$$;


CREATE OR REPLACE FUNCTION public.carrom_complete_match(
  p_match_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;

  v_boards INT;
  v_needed INT;

  v_wins_a INT;
  v_wins_b INT;

  v_points_a NUMERIC;
  v_points_b NUMERIC;
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
    RAISE EXCEPTION
      'Match not found';
  END IF;

  IF v_match.sport <> 'Carrom' THEN
    RAISE EXCEPTION
      'carrom_complete_match requires a Carrom match, got %',
      v_match.sport;
  END IF;


  v_boards :=
    COALESCE(
      NULLIF(
        v_match.config->>'boards',
        ''
      )::INT,
      1
    );

  v_needed :=
    FLOOR(
      v_boards / 2.0
    )::INT + 1;


  SELECT
    COUNT(*) FILTER (
      WHERE team_franchise_id =
        v_match.franchise_a_id
    ),
    COUNT(*) FILTER (
      WHERE team_franchise_id =
        v_match.franchise_b_id
    )
  INTO
    v_wins_a,
    v_wins_b
  FROM public.match_sport_events
  WHERE match_id = p_match_id
    AND kind = 'board_win';


  IF
    GREATEST(
      v_wins_a,
      v_wins_b
    ) < v_needed
  THEN
    RAISE EXCEPTION
      'Carrom match is not decided: %-% boards. Need % wins.',
      v_wins_a,
      v_wins_b,
      v_needed;
  END IF;


  SELECT
    COALESCE(
      SUM(value) FILTER (
        WHERE team_franchise_id =
          v_match.franchise_a_id
      ),
      0
    ),
    COALESCE(
      SUM(value) FILTER (
        WHERE team_franchise_id =
          v_match.franchise_b_id
      ),
      0
    )
  INTO
    v_points_a,
    v_points_b
  FROM public.match_sport_events
  WHERE match_id = p_match_id;


  UPDATE public.matches
  SET
    status = 'completed',
    winner_franchise_id =
      CASE
        WHEN v_wins_a > v_wins_b
          THEN v_match.franchise_a_id
        ELSE v_match.franchise_b_id
      END,
    is_tie = FALSE,
    result_summary =
      format(
        'won %s - %s boards',
        GREATEST(
          v_wins_a,
          v_wins_b
        ),
        LEAST(
          v_wins_a,
          v_wins_b
        )
      )
  WHERE id = p_match_id;
END;
$$;


-- ============================================================
-- RELAY
-- ============================================================

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
  v_row public.match_sport_events%ROWTYPE;
BEGIN
  v_match :=
    public.sport_lock_match(
      p_match_id
    );

  IF v_match.sport <> 'Relay' THEN
    RAISE EXCEPTION
      'relay_record_time requires a Relay match, got %',
      v_match.sport;
  END IF;

  IF p_team_franchise_id NOT IN (
    v_match.franchise_a_id,
    v_match.franchise_b_id
  ) THEN
    RAISE EXCEPTION
      'Team is not part of this match';
  END IF;

  IF
    p_seconds IS NULL
    OR p_seconds <= 0
  THEN
    RAISE EXCEPTION
      'Invalid relay time';
  END IF;


  DELETE FROM public.match_sport_events
  WHERE match_id = p_match_id
    AND kind = 'result_time'
    AND team_franchise_id =
      p_team_franchise_id;


  INSERT INTO public.match_sport_events (
    match_id,
    period,
    kind,
    team_franchise_id,
    value,
    label,
    meta
  )
  VALUES (
    p_match_id,
    1,
    'result_time',
    p_team_franchise_id,
    p_seconds,
    'Finish time',
    jsonb_build_object(
      'legs',
      COALESCE(
        p_legs,
        '[]'::JSONB
      )
    )
  )
  RETURNING *
  INTO v_row;


  RETURN v_row;
END;
$$;


CREATE OR REPLACE FUNCTION public.relay_complete_match(
  p_match_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;

  v_time_a NUMERIC;
  v_time_b NUMERIC;
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
    RAISE EXCEPTION
      'Match not found';
  END IF;

  IF v_match.sport <> 'Relay' THEN
    RAISE EXCEPTION
      'relay_complete_match requires a Relay match, got %',
      v_match.sport;
  END IF;

  IF v_match.status = 'completed' THEN
    RAISE EXCEPTION
      'Match already completed';
  END IF;


  SELECT
    MAX(value) FILTER (
      WHERE team_franchise_id =
        v_match.franchise_a_id
    ),
    MAX(value) FILTER (
      WHERE team_franchise_id =
        v_match.franchise_b_id
    )
  INTO
    v_time_a,
    v_time_b
  FROM public.match_sport_events
  WHERE match_id = p_match_id
    AND kind = 'result_time';


  IF
    v_time_a IS NULL
    OR v_time_b IS NULL
  THEN
    RAISE EXCEPTION
      'Both relay finish times must be recorded before completion';
  END IF;


  UPDATE public.matches
  SET
    status = 'completed',
    winner_franchise_id =
      CASE
        WHEN v_time_a = v_time_b
          THEN NULL
        WHEN v_time_a < v_time_b
          THEN v_match.franchise_a_id
        ELSE v_match.franchise_b_id
      END,
    is_tie =
      v_time_a = v_time_b,
    result_summary =
      CASE
        WHEN v_time_a = v_time_b
          THEN format(
            'dead heat %ss',
            v_time_a
          )
        ELSE format(
          '%ss vs %ss',
          LEAST(
            v_time_a,
            v_time_b
          ),
          GREATEST(
            v_time_a,
            v_time_b
          )
        )
      END
  WHERE id = p_match_id;
END;
$$;


REVOKE ALL
ON FUNCTION public.relay_complete_match(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.relay_complete_match(UUID)
TO authenticated;


COMMIT;
