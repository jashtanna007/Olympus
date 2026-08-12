-- OLYMPUS
-- Correct scoring boundaries for Football, Volleyball,
-- Basketball, Badminton and Table Tennis.
--
-- This migration is corrective only:
-- no tables are dropped and no match history is deleted.

BEGIN;


-- ============================================================
-- FOOTBALL SHOOTOUT WINNER
-- ============================================================

CREATE OR REPLACE FUNCTION public.football_shootout_winner(
  p_match_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_event RECORD;

  v_a_taken INT := 0;
  v_b_taken INT := 0;

  v_a_first_goals INT := 0;
  v_b_first_goals INT := 0;

  v_a_extra_goals INT := 0;
  v_b_extra_goals INT := 0;

  v_a_extra_taken INT := 0;
  v_b_extra_taken INT := 0;

  v_scored BOOLEAN;
BEGIN
  SELECT *
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  FOR v_event IN
    SELECT
      id,
      type,
      minute,
      team_franchise_id
    FROM public.football_events
    WHERE match_id = p_match_id
      AND (
        type IN ('pen_goal', 'pen_miss')
        OR (type = 'goal' AND minute >= 121)
      )
    ORDER BY created_at, id
  LOOP
    v_scored :=
      v_event.type = 'pen_goal'
      OR (
        v_event.type = 'goal'
        AND v_event.minute >= 121
      );

    IF v_event.team_franchise_id =
       v_match.franchise_a_id THEN

      v_a_taken := v_a_taken + 1;

      IF v_a_taken <= 5 THEN
        IF v_scored THEN
          v_a_first_goals :=
            v_a_first_goals + 1;
        END IF;
      ELSE
        v_a_extra_taken :=
          v_a_extra_taken + 1;

        IF v_scored THEN
          v_a_extra_goals :=
            v_a_extra_goals + 1;
        END IF;
      END IF;

    ELSIF v_event.team_franchise_id =
          v_match.franchise_b_id THEN

      v_b_taken := v_b_taken + 1;

      IF v_b_taken <= 5 THEN
        IF v_scored THEN
          v_b_first_goals :=
            v_b_first_goals + 1;
        END IF;
      ELSE
        v_b_extra_taken :=
          v_b_extra_taken + 1;

        IF v_scored THEN
          v_b_extra_goals :=
            v_b_extra_goals + 1;
        END IF;
      END IF;

    ELSE
      CONTINUE;
    END IF;


    -- First five kicks: mathematical elimination.
    IF v_a_taken < 5 OR v_b_taken < 5 THEN
      IF
        v_a_first_goals >
        v_b_first_goals +
          GREATEST(0, 5 - v_b_taken)
      THEN
        RETURN v_match.franchise_a_id;
      END IF;

      IF
        v_b_first_goals >
        v_a_first_goals +
          GREATEST(0, 5 - v_a_taken)
      THEN
        RETURN v_match.franchise_b_id;
      END IF;

      CONTINUE;
    END IF;


    -- Both sides completed their first five.
    IF v_a_first_goals <> v_b_first_goals THEN
      RETURN CASE
        WHEN v_a_first_goals > v_b_first_goals
          THEN v_match.franchise_a_id
        ELSE v_match.franchise_b_id
      END;
    END IF;


    -- Sudden death: only after equal numbers of extra kicks.
    IF
      v_a_extra_taken > 0
      AND v_a_extra_taken = v_b_extra_taken
      AND v_a_extra_goals <> v_b_extra_goals
    THEN
      RETURN CASE
        WHEN v_a_extra_goals > v_b_extra_goals
          THEN v_match.franchise_a_id
        ELSE v_match.franchise_b_id
      END;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;


-- ============================================================
-- VOLLEYBALL POINT RECORDING
-- ============================================================

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
  v_match public.matches%ROWTYPE;
  v_row public.volleyball_points%ROWTYPE;

  v_set SMALLINT;
  v_sets INT;
  v_sets_needed INT;

  v_target INT;
  v_final_target INT;

  v_sa INT;
  v_sb INT;

  v_wa INT;
  v_wb INT;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);

  SELECT *
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.status = 'completed' THEN
    RAISE EXCEPTION 'Match already completed';
  END IF;

  IF p_scoring_team_franchise_id NOT IN (
    v_match.franchise_a_id,
    v_match.franchise_b_id
  ) THEN
    RAISE EXCEPTION 'Team is not part of this match';
  END IF;

  IF v_match.status = 'scheduled' THEN
    UPDATE public.matches
    SET status = 'live'
    WHERE id = p_match_id;
  END IF;

  v_set :=
    COALESCE(v_match.current_period, 1);

  v_sets :=
    COALESCE(
      NULLIF(v_match.config->>'sets', '')::INT,
      3
    );

  v_sets_needed :=
    FLOOR(v_sets / 2.0)::INT + 1;

  v_target :=
    COALESCE(
      NULLIF(
        v_match.config->>'points_per_set',
        ''
      )::INT,
      25
    );

  v_final_target :=
    COALESCE(
      NULLIF(
        v_match.config->>'final_set_points',
        ''
      )::INT,
      15
    );

  IF v_set > v_sets THEN
    RAISE EXCEPTION
      'Configured match has only % sets',
      v_sets;
  END IF;


  -- Has the fixture already been won?
  WITH per_set AS (
    SELECT
      set_number,
      COUNT(*) FILTER (
        WHERE scoring_team_franchise_id =
          v_match.franchise_a_id
      ) AS a,
      COUNT(*) FILTER (
        WHERE scoring_team_franchise_id =
          v_match.franchise_b_id
      ) AS b
    FROM public.volleyball_points
    WHERE match_id = p_match_id
    GROUP BY set_number
  ),
  winners AS (
    SELECT
      CASE
        WHEN
          GREATEST(a, b) >=
            CASE
              WHEN set_number >= v_sets
                THEN v_final_target
              ELSE v_target
            END
          AND ABS(a - b) >= 2
        THEN
          CASE
            WHEN a > b
              THEN v_match.franchise_a_id
            ELSE v_match.franchise_b_id
          END
      END AS winner
    FROM per_set
  )
  SELECT
    COUNT(*) FILTER (
      WHERE winner =
        v_match.franchise_a_id
    ),
    COUNT(*) FILTER (
      WHERE winner =
        v_match.franchise_b_id
    )
  INTO v_wa, v_wb
  FROM winners;

  v_wa := COALESCE(v_wa, 0);
  v_wb := COALESCE(v_wb, 0);

  IF
    v_wa >= v_sets_needed
    OR v_wb >= v_sets_needed
  THEN
    RAISE EXCEPTION
      'Volleyball match already decided %-%',
      v_wa,
      v_wb;
  END IF;


  -- Reject points in an already-completed set.
  SELECT
    COUNT(*) FILTER (
      WHERE scoring_team_franchise_id =
        v_match.franchise_a_id
    ),
    COUNT(*) FILTER (
      WHERE scoring_team_franchise_id =
        v_match.franchise_b_id
    )
  INTO v_sa, v_sb
  FROM public.volleyball_points
  WHERE match_id = p_match_id
    AND set_number = v_set;

  IF
    GREATEST(v_sa, v_sb) >=
      CASE
        WHEN v_set >= v_sets
          THEN v_final_target
        ELSE v_target
      END
    AND ABS(v_sa - v_sb) >= 2
  THEN
    RAISE EXCEPTION
      'Set % is already complete',
      v_set;
  END IF;


  INSERT INTO public.volleyball_points (
    match_id,
    set_number,
    scoring_team_franchise_id,
    type
  )
  VALUES (
    p_match_id,
    v_set,
    p_scoring_team_franchise_id,
    p_type
  )
  RETURNING *
  INTO v_row;


  SELECT
    COUNT(*) FILTER (
      WHERE scoring_team_franchise_id =
        v_match.franchise_a_id
    ),
    COUNT(*) FILTER (
      WHERE scoring_team_franchise_id =
        v_match.franchise_b_id
    )
  INTO v_sa, v_sb
  FROM public.volleyball_points
  WHERE match_id = p_match_id
    AND set_number = v_set;


  IF
    GREATEST(v_sa, v_sb) >=
      CASE
        WHEN v_set >= v_sets
          THEN v_final_target
        ELSE v_target
      END
    AND ABS(v_sa - v_sb) >= 2
  THEN

    WITH per_set AS (
      SELECT
        set_number,
        COUNT(*) FILTER (
          WHERE scoring_team_franchise_id =
            v_match.franchise_a_id
        ) AS a,
        COUNT(*) FILTER (
          WHERE scoring_team_franchise_id =
            v_match.franchise_b_id
        ) AS b
      FROM public.volleyball_points
      WHERE match_id = p_match_id
      GROUP BY set_number
    ),
    winners AS (
      SELECT
        CASE
          WHEN
            GREATEST(a, b) >=
              CASE
                WHEN set_number >= v_sets
                  THEN v_final_target
                ELSE v_target
              END
            AND ABS(a - b) >= 2
          THEN
            CASE
              WHEN a > b
                THEN v_match.franchise_a_id
              ELSE v_match.franchise_b_id
            END
        END AS winner
      FROM per_set
    )
    SELECT
      COUNT(*) FILTER (
        WHERE winner =
          v_match.franchise_a_id
      ),
      COUNT(*) FILTER (
        WHERE winner =
          v_match.franchise_b_id
      )
    INTO v_wa, v_wb
    FROM winners;

    v_wa := COALESCE(v_wa, 0);
    v_wb := COALESCE(v_wb, 0);

    IF
      v_wa < v_sets_needed
      AND v_wb < v_sets_needed
      AND v_set < v_sets
    THEN
      UPDATE public.matches
      SET current_period = v_set + 1
      WHERE id = p_match_id;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;


-- ============================================================
-- RALLY SPORTS POINT RECORDING
-- ============================================================

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
  v_match public.matches%ROWTYPE;
  v_row public.match_sport_events%ROWTYPE;

  v_period SMALLINT;

  v_target INT;
  v_cap INT;

  v_games INT;
  v_games_needed INT;

  v_a INT;
  v_b INT;

  v_wa INT;
  v_wb INT;
BEGIN
  v_match :=
    public.sport_lock_match(p_match_id);

  IF v_match.sport NOT IN (
    'Badminton',
    'Table Tennis'
  ) THEN
    RAISE EXCEPTION
      'rally_record_point does not apply to sport %',
      v_match.sport;
  END IF;

  IF p_team_franchise_id NOT IN (
    v_match.franchise_a_id,
    v_match.franchise_b_id
  ) THEN
    RAISE EXCEPTION
      'Team is not part of this match';
  END IF;

  IF p_kind NOT IN ('point', 'serve') THEN
    RAISE EXCEPTION 'Invalid kind';
  END IF;

  v_period :=
    COALESCE(v_match.current_period, 1);

  v_games :=
    COALESCE(
      NULLIF(v_match.config->>'games', '')::INT,
      3
    );

  v_games_needed :=
    FLOOR(v_games / 2.0)::INT + 1;

  IF v_match.sport = 'Badminton' THEN
    v_target :=
      COALESCE(
        NULLIF(
          v_match.config->>'points_per_game',
          ''
        )::INT,
        21
      );

    v_cap :=
      COALESCE(
        NULLIF(
          v_match.config->>'deuce_cap',
          ''
        )::INT,
        30
      );
  ELSE
    v_target :=
      COALESCE(
        NULLIF(
          v_match.config->>'points_per_game',
          ''
        )::INT,
        11
      );

    v_cap :=
      NULLIF(
        v_match.config->>'deuce_cap',
        ''
      )::INT;
  END IF;


  IF v_period > v_games THEN
    RAISE EXCEPTION
      'Configured match has only % games',
      v_games;
  END IF;


  -- Count completed games before accepting another event.
  WITH per_game AS (
    SELECT
      period,
      COUNT(*) FILTER (
        WHERE team_franchise_id =
          v_match.franchise_a_id
      ) AS a,
      COUNT(*) FILTER (
        WHERE team_franchise_id =
          v_match.franchise_b_id
      ) AS b
    FROM public.match_sport_events
    WHERE match_id = p_match_id
      AND kind = 'point'
    GROUP BY period
  ),
  winners AS (
    SELECT
      CASE
        WHEN
          (
            GREATEST(a, b) >= v_target
            AND ABS(a - b) >= 2
          )
          OR (
            v_cap IS NOT NULL
            AND GREATEST(a, b) >= v_cap
          )
        THEN
          CASE
            WHEN a > b
              THEN v_match.franchise_a_id
            ELSE v_match.franchise_b_id
          END
      END AS winner
    FROM per_game
  )
  SELECT
    COUNT(*) FILTER (
      WHERE winner =
        v_match.franchise_a_id
    ),
    COUNT(*) FILTER (
      WHERE winner =
        v_match.franchise_b_id
    )
  INTO v_wa, v_wb
  FROM winners;

  v_wa := COALESCE(v_wa, 0);
  v_wb := COALESCE(v_wb, 0);

  IF
    v_wa >= v_games_needed
    OR v_wb >= v_games_needed
  THEN
    RAISE EXCEPTION
      '% match already decided %-%',
      v_match.sport,
      v_wa,
      v_wb;
  END IF;


  IF p_kind = 'serve' THEN
    INSERT INTO public.match_sport_events (
      match_id,
      period,
      kind,
      team_franchise_id,
      label
    )
    VALUES (
      p_match_id,
      v_period,
      'serve',
      p_team_franchise_id,
      'Serve'
    )
    RETURNING *
    INTO v_row;

    RETURN v_row;
  END IF;


  -- Reject another point if this game already ended.
  SELECT
    COUNT(*) FILTER (
      WHERE team_franchise_id =
        v_match.franchise_a_id
    ),
    COUNT(*) FILTER (
      WHERE team_franchise_id =
        v_match.franchise_b_id
    )
  INTO v_a, v_b
  FROM public.match_sport_events
  WHERE match_id = p_match_id
    AND period = v_period
    AND kind = 'point';

  IF
    (
      GREATEST(v_a, v_b) >= v_target
      AND ABS(v_a - v_b) >= 2
    )
    OR (
      v_cap IS NOT NULL
      AND GREATEST(v_a, v_b) >= v_cap
    )
  THEN
    RAISE EXCEPTION
      'Game % is already complete',
      v_period;
  END IF;


  INSERT INTO public.match_sport_events (
    match_id,
    period,
    kind,
    team_franchise_id,
    value
  )
  VALUES (
    p_match_id,
    v_period,
    'point',
    p_team_franchise_id,
    1
  )
  RETURNING *
  INTO v_row;


  SELECT
    COUNT(*) FILTER (
      WHERE team_franchise_id =
        v_match.franchise_a_id
    ),
    COUNT(*) FILTER (
      WHERE team_franchise_id =
        v_match.franchise_b_id
    )
  INTO v_a, v_b
  FROM public.match_sport_events
  WHERE match_id = p_match_id
    AND period = v_period
    AND kind = 'point';


  IF
    (
      GREATEST(v_a, v_b) >= v_target
      AND ABS(v_a - v_b) >= 2
    )
    OR (
      v_cap IS NOT NULL
      AND GREATEST(v_a, v_b) >= v_cap
    )
  THEN

    WITH per_game AS (
      SELECT
        period,
        COUNT(*) FILTER (
          WHERE team_franchise_id =
            v_match.franchise_a_id
        ) AS a,
        COUNT(*) FILTER (
          WHERE team_franchise_id =
            v_match.franchise_b_id
        ) AS b
      FROM public.match_sport_events
      WHERE match_id = p_match_id
        AND kind = 'point'
      GROUP BY period
    ),
    winners AS (
      SELECT
        CASE
          WHEN
            (
              GREATEST(a, b) >= v_target
              AND ABS(a - b) >= 2
            )
            OR (
              v_cap IS NOT NULL
              AND GREATEST(a, b) >= v_cap
            )
          THEN
            CASE
              WHEN a > b
                THEN v_match.franchise_a_id
              ELSE v_match.franchise_b_id
            END
        END AS winner
      FROM per_game
    )
    SELECT
      COUNT(*) FILTER (
        WHERE winner =
          v_match.franchise_a_id
      ),
      COUNT(*) FILTER (
        WHERE winner =
          v_match.franchise_b_id
      )
    INTO v_wa, v_wb
    FROM winners;

    v_wa := COALESCE(v_wa, 0);
    v_wb := COALESCE(v_wb, 0);

    IF
      v_wa < v_games_needed
      AND v_wb < v_games_needed
      AND v_period < v_games
    THEN
      UPDATE public.matches
      SET current_period = v_period + 1
      WHERE id = p_match_id;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;


-- ============================================================
-- RALLY MATCH COMPLETION
-- ============================================================

CREATE OR REPLACE FUNCTION public.rally_complete_match(
  p_match_id UUID
)
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
  v_games_needed INT;

  v_wa INT;
  v_wb INT;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);

  SELECT *
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  v_games :=
    COALESCE(
      NULLIF(v_match.config->>'games', '')::INT,
      3
    );

  v_games_needed :=
    FLOOR(v_games / 2.0)::INT + 1;

  IF v_match.sport = 'Badminton' THEN
    v_target :=
      COALESCE(
        NULLIF(
          v_match.config->>'points_per_game',
          ''
        )::INT,
        21
      );

    v_cap :=
      COALESCE(
        NULLIF(
          v_match.config->>'deuce_cap',
          ''
        )::INT,
        30
      );

  ELSIF v_match.sport = 'Table Tennis' THEN

    v_target :=
      COALESCE(
        NULLIF(
          v_match.config->>'points_per_game',
          ''
        )::INT,
        11
      );

    v_cap :=
      NULLIF(
        v_match.config->>'deuce_cap',
        ''
      )::INT;

  ELSE
    RAISE EXCEPTION
      'rally_complete_match does not apply to sport %',
      v_match.sport;
  END IF;


  WITH per_game AS (
    SELECT
      period,
      COUNT(*) FILTER (
        WHERE team_franchise_id =
          v_match.franchise_a_id
      ) AS a,
      COUNT(*) FILTER (
        WHERE team_franchise_id =
          v_match.franchise_b_id
      ) AS b
    FROM public.match_sport_events
    WHERE match_id = p_match_id
      AND kind = 'point'
    GROUP BY period
  ),
  winners AS (
    SELECT
      CASE
        WHEN
          (
            GREATEST(a, b) >= v_target
            AND ABS(a - b) >= 2
          )
          OR (
            v_cap IS NOT NULL
            AND GREATEST(a, b) >= v_cap
          )
        THEN
          CASE
            WHEN a > b
              THEN v_match.franchise_a_id
            ELSE v_match.franchise_b_id
          END
      END AS winner
    FROM per_game
  )
  SELECT
    COUNT(*) FILTER (
      WHERE winner =
        v_match.franchise_a_id
    ),
    COUNT(*) FILTER (
      WHERE winner =
        v_match.franchise_b_id
    )
  INTO v_wa, v_wb
  FROM winners;

  v_wa := COALESCE(v_wa, 0);
  v_wb := COALESCE(v_wb, 0);


  IF
    GREATEST(v_wa, v_wb) < v_games_needed
  THEN
    RAISE EXCEPTION
      'Match is not decided: %-% games. Need % wins.',
      v_wa,
      v_wb,
      v_games_needed;
  END IF;


  UPDATE public.matches
  SET
    status = 'completed',
    winner_franchise_id =
      CASE
        WHEN v_wa > v_wb
          THEN v_match.franchise_a_id
        ELSE v_match.franchise_b_id
      END,
    is_tie = FALSE,
    result_summary =
      format(
        'won %s - %s games',
        GREATEST(v_wa, v_wb),
        LEAST(v_wa, v_wb)
      )
  WHERE id = p_match_id;
END;
$$;


-- ============================================================
-- GENERIC TEAM-SPORT COMPLETION
-- ============================================================

CREATE OR REPLACE FUNCTION public.team_sport_complete_match(
  p_match_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;

  v_sa NUMERIC;
  v_sb NUMERIC;

  v_wa INT;
  v_wb INT;
  v_needed INT;

  v_winner UUID;

  v_quarters INT;

  v_sets INT;
  v_target INT;
  v_final_target INT;

  v_pen_a INT;
  v_pen_b INT;
  v_pen_count INT;
  v_pen_winner UUID;
BEGIN
  PERFORM public.cricket_require_scorer(p_match_id);

  SELECT *
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;


  -- ========================================================
  -- FOOTBALL
  -- ========================================================

  IF v_match.sport = 'Football' THEN

    SELECT
      COUNT(*) FILTER (
        WHERE
          (
            type = 'goal'
            AND minute < 121
            AND team_franchise_id =
              v_match.franchise_a_id
          )
          OR (
            type = 'own_goal'
            AND team_franchise_id =
              v_match.franchise_b_id
          )
      ),
      COUNT(*) FILTER (
        WHERE
          (
            type = 'goal'
            AND minute < 121
            AND team_franchise_id =
              v_match.franchise_b_id
          )
          OR (
            type = 'own_goal'
            AND team_franchise_id =
              v_match.franchise_a_id
          )
      )
    INTO v_sa, v_sb
    FROM public.football_events
    WHERE match_id = p_match_id;


    SELECT
      COUNT(*) FILTER (
        WHERE
          team_franchise_id =
            v_match.franchise_a_id
          AND (
            type = 'pen_goal'
            OR (
              type = 'goal'
              AND minute >= 121
            )
          )
      ),
      COUNT(*) FILTER (
        WHERE
          team_franchise_id =
            v_match.franchise_b_id
          AND (
            type = 'pen_goal'
            OR (
              type = 'goal'
              AND minute >= 121
            )
          )
      ),
      COUNT(*) FILTER (
        WHERE
          type IN ('pen_goal', 'pen_miss')
          OR (
            type = 'goal'
            AND minute >= 121
          )
      )
    INTO
      v_pen_a,
      v_pen_b,
      v_pen_count
    FROM public.football_events
    WHERE match_id = p_match_id;


    v_sa := COALESCE(v_sa, 0);
    v_sb := COALESCE(v_sb, 0);

    v_pen_a := COALESCE(v_pen_a, 0);
    v_pen_b := COALESCE(v_pen_b, 0);
    v_pen_count := COALESCE(v_pen_count, 0);


    IF v_sa <> v_sb THEN
      v_winner :=
        CASE
          WHEN v_sa > v_sb
            THEN v_match.franchise_a_id
          ELSE v_match.franchise_b_id
        END;

      UPDATE public.matches
      SET
        status = 'completed',
        winner_franchise_id = v_winner,
        is_tie = FALSE,
        result_summary =
          format(
            'won %s - %s',
            GREATEST(v_sa, v_sb),
            LEAST(v_sa, v_sb)
          )
      WHERE id = p_match_id;

      RETURN;
    END IF;


    IF v_pen_count = 0 THEN
      RAISE EXCEPTION
        'Football match is level %-% — complete extra time or penalty shootout first',
        v_sa,
        v_sb;
    END IF;


    v_pen_winner :=
      public.football_shootout_winner(
        p_match_id
      );

    IF v_pen_winner IS NULL THEN
      RAISE EXCEPTION
        'Penalty shootout is not decided yet';
    END IF;


    UPDATE public.matches
    SET
      status = 'completed',
      winner_franchise_id = v_pen_winner,
      is_tie = FALSE,
      result_summary =
        format(
          'won %s - %s (%s - %s pens)',
          v_sa,
          v_sb,
          CASE
            WHEN v_pen_winner =
              v_match.franchise_a_id
              THEN v_pen_a
            ELSE v_pen_b
          END,
          CASE
            WHEN v_pen_winner =
              v_match.franchise_a_id
              THEN v_pen_b
            ELSE v_pen_a
          END
        )
    WHERE id = p_match_id;

    RETURN;
  END IF;


  -- ========================================================
  -- VOLLEYBALL
  -- ========================================================

  IF v_match.sport = 'Volleyball' THEN

    v_sets :=
      COALESCE(
        NULLIF(v_match.config->>'sets', '')::INT,
        3
      );

    v_needed :=
      FLOOR(v_sets / 2.0)::INT + 1;

    v_target :=
      COALESCE(
        NULLIF(
          v_match.config->>'points_per_set',
          ''
        )::INT,
        25
      );

    v_final_target :=
      COALESCE(
        NULLIF(
          v_match.config->>'final_set_points',
          ''
        )::INT,
        15
      );


    WITH per_set AS (
      SELECT
        set_number,
        COUNT(*) FILTER (
          WHERE scoring_team_franchise_id =
            v_match.franchise_a_id
        ) AS a,
        COUNT(*) FILTER (
          WHERE scoring_team_franchise_id =
            v_match.franchise_b_id
        ) AS b
      FROM public.volleyball_points
      WHERE match_id = p_match_id
      GROUP BY set_number
    ),
    winners AS (
      SELECT
        CASE
          WHEN
            GREATEST(a, b) >=
              CASE
                WHEN set_number >= v_sets
                  THEN v_final_target
                ELSE v_target
              END
            AND ABS(a - b) >= 2
          THEN
            CASE
              WHEN a > b
                THEN v_match.franchise_a_id
              ELSE v_match.franchise_b_id
            END
        END AS winner
      FROM per_set
    )
    SELECT
      COUNT(*) FILTER (
        WHERE winner =
          v_match.franchise_a_id
      ),
      COUNT(*) FILTER (
        WHERE winner =
          v_match.franchise_b_id
      )
    INTO v_wa, v_wb
    FROM winners;

    v_wa := COALESCE(v_wa, 0);
    v_wb := COALESCE(v_wb, 0);


    IF GREATEST(v_wa, v_wb) < v_needed THEN
      RAISE EXCEPTION
        'Volleyball match is not decided: %-% sets. Need % wins.',
        v_wa,
        v_wb,
        v_needed;
    END IF;


    v_winner :=
      CASE
        WHEN v_wa > v_wb
          THEN v_match.franchise_a_id
        ELSE v_match.franchise_b_id
      END;

    UPDATE public.matches
    SET
      status = 'completed',
      winner_franchise_id = v_winner,
      is_tie = FALSE,
      result_summary =
        format(
          'won %s - %s sets',
          GREATEST(v_wa, v_wb),
          LEAST(v_wa, v_wb)
        )
    WHERE id = p_match_id;

    RETURN;
  END IF;


  -- ========================================================
  -- BASKETBALL
  -- ========================================================

  IF v_match.sport = 'Basketball' THEN

    v_quarters :=
      COALESCE(
        NULLIF(
          v_match.config->>'quarters',
          ''
        )::INT,
        4
      );


    IF
      COALESCE(v_match.current_period, 1) <
      v_quarters
    THEN
      RAISE EXCEPTION
        'Regulation is not complete. Current quarter %, required %.',
        COALESCE(v_match.current_period, 1),
        v_quarters;
    END IF;


    SELECT
      COALESCE(
        SUM(points) FILTER (
          WHERE team_franchise_id =
            v_match.franchise_a_id
        ),
        0
      ),
      COALESCE(
        SUM(points) FILTER (
          WHERE team_franchise_id =
            v_match.franchise_b_id
        ),
        0
      )
    INTO v_sa, v_sb
    FROM public.basketball_points
    WHERE match_id = p_match_id;


    IF v_sa = v_sb THEN

      IF
        COALESCE(v_match.current_period, 1)
        <= v_quarters
      THEN
        RAISE EXCEPTION
          'Scores level %-% after regulation — advance to overtime',
          v_sa,
          v_sb;
      END IF;

      RAISE EXCEPTION
        'Scores still level %-% — continue to another overtime period',
        v_sa,
        v_sb;
    END IF;


    v_winner :=
      CASE
        WHEN v_sa > v_sb
          THEN v_match.franchise_a_id
        ELSE v_match.franchise_b_id
      END;

    UPDATE public.matches
    SET
      status = 'completed',
      winner_franchise_id = v_winner,
      is_tie = FALSE,
      result_summary =
        format(
          'won %s - %s',
          GREATEST(v_sa, v_sb),
          LEAST(v_sa, v_sb)
        )
    WHERE id = p_match_id;

    RETURN;
  END IF;


  -- ========================================================
  -- EXISTING SPECIALIZED SPORTS
  -- ========================================================

  IF v_match.sport IN (
    'Badminton',
    'Table Tennis'
  ) THEN
    PERFORM public.rally_complete_match(
      p_match_id
    );
    RETURN;
  END IF;


  IF v_match.sport = 'Carrom' THEN
    PERFORM public.carrom_complete_match(
      p_match_id
    );
    RETURN;
  END IF;


  -- Keep Kabaddi on its current completion path until its
  -- dedicated tiebreak/state-machine fix in the next batch.
  IF v_match.sport = 'Kabaddi' THEN

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
    INTO v_sa, v_sb
    FROM public.match_sport_events
    WHERE match_id = p_match_id;


    IF
      v_sa = v_sb
      AND NOT EXISTS (
        SELECT 1
        FROM public.match_sport_events
        WHERE match_id = p_match_id
          AND kind = 'tiebreak'
      )
    THEN
      RAISE EXCEPTION
        'Scores level %-% — run the tiebreak before finishing',
        v_sa,
        v_sb;
    END IF;


    IF v_sa = v_sb THEN
      RAISE EXCEPTION
        'Scores still level %-% — continue the tiebreak',
        v_sa,
        v_sb;
    END IF;


    v_winner :=
      CASE
        WHEN v_sa > v_sb
          THEN v_match.franchise_a_id
        ELSE v_match.franchise_b_id
      END;

    UPDATE public.matches
    SET
      status = 'completed',
      winner_franchise_id = v_winner,
      is_tie = FALSE,
      result_summary =
        format(
          'won %s - %s',
          GREATEST(v_sa, v_sb),
          LEAST(v_sa, v_sb)
        )
    WHERE id = p_match_id;

    RETURN;
  END IF;


  RAISE EXCEPTION
    'Unsupported sport %',
    v_match.sport;
END;
$$;


REVOKE ALL
ON FUNCTION public.football_shootout_winner(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.football_shootout_winner(UUID)
TO authenticated;


COMMIT;
