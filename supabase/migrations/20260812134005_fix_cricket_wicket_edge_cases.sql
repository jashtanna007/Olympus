-- OLYMPUS
-- Cricket wicket/delivery edge cases.
--
-- Supports wickets from legal balls, Wides, No-balls,
-- Byes and Leg byes without changing the legacy RPC.
--
-- Safe corrective migration:
-- no tables are dropped and no match history is deleted.

BEGIN;

CREATE OR REPLACE FUNCTION public.cricket_record_wicket_v2(
  p_innings_id UUID,
  p_dismissal_type TEXT,
  p_out_player_id UUID,
  p_ball_type TEXT DEFAULT 'runs',
  p_runs_batter INTEGER DEFAULT 0,
  p_runs_extra INTEGER DEFAULT 0,
  p_fielder_id UUID DEFAULT NULL,
  p_vacant_end TEXT DEFAULT NULL,
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

  v_striker_before UUID;
  v_non_striker_before UUID;
  v_survivor UUID;

  v_allowed BOOLEAN := FALSE;
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

  IF p_ball_type NOT IN (
    'runs',
    'wide',
    'noball',
    'bye',
    'legbye'
  ) THEN
    RAISE EXCEPTION
      'Unsupported delivery type %',
      p_ball_type;
  END IF;

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


  -- ----------------------------------------------------------
  -- Dismissals permitted by the selected delivery type.
  -- ----------------------------------------------------------

  IF p_ball_type = 'runs' THEN
    v_allowed :=
      p_dismissal_type IN (
        'bowled',
        'caught',
        'lbw',
        'run_out',
        'stumped',
        'hit_wicket'
      );

  ELSIF p_ball_type = 'wide' THEN
    v_allowed :=
      p_dismissal_type IN (
        'run_out',
        'stumped',
        'hit_wicket'
      );

  ELSIF p_ball_type = 'noball' THEN
    v_allowed :=
      p_dismissal_type = 'run_out';

  ELSIF p_ball_type IN (
    'bye',
    'legbye'
  ) THEN
    v_allowed :=
      p_dismissal_type = 'run_out';
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION
      '% is not valid from a % delivery',
      p_dismissal_type,
      p_ball_type;
  END IF;


  -- ----------------------------------------------------------
  -- Batter validation
  -- ----------------------------------------------------------

  v_striker_before :=
    v_innings.striker_id;

  v_non_striker_before :=
    v_innings.non_striker_id;

  IF p_out_player_id NOT IN (
    v_striker_before,
    v_non_striker_before
  ) THEN
    RAISE EXCEPTION
      'Dismissed player must be one of the two current batters';
  END IF;

  IF
    p_dismissal_type <> 'run_out'
    AND p_out_player_id <>
      v_striker_before
  THEN
    RAISE EXCEPTION
      '% can only dismiss the striker',
      p_dismissal_type;
  END IF;


  -- ----------------------------------------------------------
  -- Run validation
  -- ----------------------------------------------------------

  IF
    p_runs_batter < 0
    OR p_runs_extra < 0
  THEN
    RAISE EXCEPTION
      'Runs cannot be negative';
  END IF;

  IF
    p_dismissal_type <> 'run_out'
    AND (
      p_runs_batter <> 0
      OR (
        p_ball_type IN (
          'runs',
          'bye',
          'legbye'
        )
        AND p_runs_extra <> 0
      )
      OR (
        p_ball_type IN (
          'wide',
          'noball'
        )
        AND p_runs_extra <>
          v_match.wide_noball_penalty
      )
    )
  THEN
    RAISE EXCEPTION
      'Runs are inconsistent with this dismissal';
  END IF;


  -- ----------------------------------------------------------
  -- Run Out requires explicit final batting-end state.
  -- This avoids guessing after an incomplete attempted run.
  -- ----------------------------------------------------------

  IF p_dismissal_type = 'run_out' THEN
    IF p_vacant_end NOT IN (
      'striker',
      'non_striker'
    ) THEN
      RAISE EXCEPTION
        'Run Out requires the vacant end for the next delivery';
    END IF;
  ELSIF p_vacant_end IS NOT NULL THEN
    RAISE EXCEPTION
      'Vacant end is only used for Run Out';
  END IF;


  -- ----------------------------------------------------------
  -- Fielding validation
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- Record the delivery through the central ball function.
  -- This preserves:
  --   totals
  --   extras
  --   legal-ball count
  --   strike rotation
  --   over completion
  --   undo snapshots
  -- ----------------------------------------------------------

  v_delivery :=
    public.cricket_record_ball(
      p_innings_id,
      p_ball_type,
      p_runs_batter,
      p_runs_extra,
      p_wagon_angle,
      p_wagon_distance,
      p_pitch_x,
      p_pitch_y
    );


  UPDATE public.cricket_deliveries
  SET
    is_wicket = TRUE,
    dismissal_type =
      p_dismissal_type,
    out_player_id =
      p_out_player_id,
    fielder_id =
      p_fielder_id,
    commentary =
      CASE
        WHEN p_ball_type = 'wide'
          THEN format(
            'Wide, %s — %s',
            p_dismissal_type,
            'WICKET'
          )

        WHEN p_ball_type = 'noball'
          THEN format(
            'No ball — %s, WICKET',
            p_dismissal_type
          )

        ELSE format(
          '%s — WICKET',
          p_dismissal_type
        )
      END
  WHERE id = v_delivery.id
  RETURNING *
  INTO v_delivery;


  -- ----------------------------------------------------------
  -- Increment wicket and leave exactly one batting end vacant.
  --
  -- For Run Out, scorer explicitly supplies the final vacant
  -- end after completed runs and any end-of-over strike change.
  --
  -- For other dismissals, record_ball has already handled any
  -- legal end-of-over swap, so locate the dismissed batter in
  -- the resulting innings state.
  -- ----------------------------------------------------------

  IF p_dismissal_type = 'run_out' THEN

    -- A Run Out can occur during an incomplete attempted run,
    -- so completed-run parity alone cannot tell us where the
    -- surviving batter finally stands.
    --
    -- The scorer supplies the vacant end. Place the surviving
    -- batter explicitly at the opposite end instead of trusting
    -- record_ball's ordinary strike rotation.
    v_survivor :=
      CASE
        WHEN p_out_player_id =
          v_striker_before
        THEN v_non_striker_before
        ELSE v_striker_before
      END;

    IF v_survivor IS NULL THEN
      RAISE EXCEPTION
        'Could not determine the surviving batter';
    END IF;

    UPDATE public.cricket_innings
    SET
      wickets = wickets + 1,

      striker_id =
        CASE
          WHEN p_vacant_end =
            'striker'
          THEN NULL
          ELSE v_survivor
        END,

      non_striker_id =
        CASE
          WHEN p_vacant_end =
            'non_striker'
          THEN NULL
          ELSE v_survivor
        END

    WHERE id = p_innings_id;

  ELSE

    UPDATE public.cricket_innings
    SET
      wickets = wickets + 1,
      striker_id =
        CASE
          WHEN striker_id =
            p_out_player_id
          THEN NULL
          ELSE striker_id
        END,
      non_striker_id =
        CASE
          WHEN non_striker_id =
            p_out_player_id
          THEN NULL
          ELSE non_striker_id
        END
    WHERE id = p_innings_id;

  END IF;


  RETURN v_delivery;
END;
$$;


REVOKE ALL
ON FUNCTION public.cricket_record_wicket_v2(
  UUID,
  TEXT,
  UUID,
  TEXT,
  INTEGER,
  INTEGER,
  UUID,
  TEXT,
  SMALLINT,
  SMALLINT,
  SMALLINT,
  SMALLINT
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.cricket_record_wicket_v2(
  UUID,
  TEXT,
  UUID,
  TEXT,
  INTEGER,
  INTEGER,
  UUID,
  TEXT,
  SMALLINT,
  SMALLINT,
  SMALLINT,
  SMALLINT
)
TO authenticated;

COMMIT;
