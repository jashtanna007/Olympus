-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Auction type routing in engine functions      ║
-- ║  Girls Cricket/Football → girls_individual               ║
-- ║  Everything else → franchise                             ║
-- ╚══════════════════════════════════════════════════════════╝

BEGIN;

-- ============================================================
-- Helper: determine auction_type for a registration
-- ============================================================
CREATE OR REPLACE FUNCTION public.auction_type_for_registration(p_reg player_registrations)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(trim(COALESCE(p_reg.gender, 'Male'))) = 'female'
     AND EXISTS (
       SELECT 1
       FROM jsonb_array_elements(p_reg.sports) s
       WHERE s->>'name' IN ('Cricket', 'Football')
     )
    THEN 'girls_individual'
    ELSE 'franchise'
  END;
$$;

-- ============================================================
-- auction_start() — set auction_type on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.auction_start()
RETURNS public.auction_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.auction_config%ROWTYPE;
  v_current_id UUID;
BEGIN
  PERFORM public.auction_require_admin();

  SELECT *
  INTO v_config
  FROM public.auction_config
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction configuration has not been created';
  END IF;

  IF v_config.status = 'live' THEN
    RAISE EXCEPTION 'The auction is already live';
  END IF;

  IF v_config.status = 'paused' AND v_config.current_player_id IS NOT NULL THEN
    UPDATE public.auction_config
    SET status = 'live'
    WHERE id = v_config.id
    RETURNING * INTO v_config;
    RETURN v_config;
  END IF;

  -- Look for an existing current player (leader-safe)
  SELECT ap.id
  INTO v_current_id
  FROM public.auction_players ap
  JOIN public.player_registrations pr ON pr.id = ap.registration_id
  WHERE ap.status = 'current'
    AND NOT EXISTS (
      SELECT 1
      FROM public.franchise_members fm
      WHERE fm.roll_number = pr.roll_number
        AND fm.role = 'leader'
        AND fm.is_active = TRUE
    )
  ORDER BY ap.queue_order, ap.created_at, ap.id
  LIMIT 1
  FOR UPDATE OF ap;

  -- Fallback: find next upcoming player
  IF v_current_id IS NULL THEN
    SELECT ap.id
    INTO v_current_id
    FROM public.auction_players ap
    JOIN public.player_registrations pr ON pr.id = ap.registration_id
    WHERE ap.status = 'upcoming'
      AND NOT EXISTS (
        SELECT 1
        FROM public.franchise_members fm
        WHERE fm.roll_number = pr.roll_number
          AND fm.role = 'leader'
          AND fm.is_active = TRUE
      )
    ORDER BY ap.queue_order, ap.created_at, ap.id
    LIMIT 1
    FOR UPDATE OF ap;
  END IF;

  -- No queued players — generate from registrations
  IF v_current_id IS NULL THEN
    WITH eligible AS (
      SELECT
        pr.id,
        public.auction_type_for_registration(pr) AS atype,
        row_number() OVER (ORDER BY random()) - 1 AS queue_position
      FROM public.player_registrations pr
      WHERE lower(trim(COALESCE(pr.gender, 'Male'))) = lower(trim(v_config.gender_mode))
        AND NOT EXISTS (
          SELECT 1
          FROM public.auction_players ap
          WHERE ap.registration_id = pr.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.franchise_members fm
          WHERE fm.roll_number = pr.roll_number
            AND fm.role = 'leader'
            AND fm.is_active = TRUE
        )
    )
    INSERT INTO public.auction_players (
      registration_id,
      base_price,
      status,
      queue_order,
      auction_type
    )
    SELECT
      id,
      v_config.base_price,
      'upcoming',
      queue_position,
      atype
    FROM eligible
    ON CONFLICT (registration_id) DO NOTHING;

    -- Pick the first upcoming player
    SELECT ap.id
    INTO v_current_id
    FROM public.auction_players ap
    JOIN public.player_registrations pr ON pr.id = ap.registration_id
    WHERE ap.status = 'upcoming'
      AND NOT EXISTS (
        SELECT 1
        FROM public.franchise_members fm
        WHERE fm.roll_number = pr.roll_number
          AND fm.role = 'leader'
          AND fm.is_active = TRUE
      )
    ORDER BY ap.queue_order, ap.created_at, ap.id
    LIMIT 1
    FOR UPDATE OF ap;
  END IF;

  IF v_current_id IS NULL THEN
    RAISE EXCEPTION 'No eligible % players are available for this auction', v_config.gender_mode;
  END IF;

  UPDATE public.auction_players
  SET status = 'current'
  WHERE id = v_current_id;

  UPDATE public.auction_config
  SET current_player_id = v_current_id,
      status = 'live'
  WHERE id = v_config.id
  RETURNING * INTO v_config;

  RETURN v_config;
END;
$$;

-- ============================================================
-- auction_complete_current() — scope next-player to same auction_type
-- ============================================================
CREATE OR REPLACE FUNCTION public.auction_complete_current(p_outcome TEXT)
RETURNS public.auction_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.auction_config%ROWTYPE;
  v_player public.auction_players%ROWTYPE;
  v_registration public.player_registrations%ROWTYPE;
  v_winning_bid public.auction_bids%ROWTYPE;
  v_next public.auction_players%ROWTYPE;
  v_existing_member_role TEXT;
  v_display_order SMALLINT;
  v_config_status_before TEXT;
  v_franchise_spent_before INTEGER;
  v_member_before JSONB;
BEGIN
  PERFORM public.auction_require_admin();

  IF p_outcome NOT IN ('sold', 'unsold') THEN
    RAISE EXCEPTION 'Auction outcome must be sold or unsold';
  END IF;

  SELECT *
  INTO v_config
  FROM public.auction_config
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_config.current_player_id IS NULL THEN
    RAISE EXCEPTION 'There is no current player to complete';
  END IF;

  v_config_status_before := v_config.status;

  SELECT *
  INTO v_player
  FROM public.auction_players
  WHERE id = v_config.current_player_id
  FOR UPDATE;

  IF NOT FOUND OR v_player.status <> 'current' THEN
    RAISE EXCEPTION 'The current player has already been completed';
  END IF;

  SELECT *
  INTO v_registration
  FROM public.player_registrations
  WHERE id = v_player.registration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The current player registration no longer exists';
  END IF;

  IF p_outcome = 'sold' THEN
    SELECT *
    INTO v_winning_bid
    FROM public.auction_bids
    WHERE auction_player_id = v_player.id
    ORDER BY amount DESC, created_at ASC, id ASC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'A player cannot be sold without a valid bid';
    END IF;

    SELECT role
    INTO v_existing_member_role
    FROM public.franchise_members
    WHERE roll_number = v_registration.roll_number
    FOR UPDATE;

    IF v_existing_member_role = 'leader' THEN
      RAISE EXCEPTION 'A franchise leader cannot be sold in the auction';
    END IF;

    SELECT spent_amount
    INTO v_franchise_spent_before
    FROM public.franchises
    WHERE id = v_winning_bid.franchise_id
    FOR UPDATE;

    SELECT to_jsonb(fm)
    INTO v_member_before
    FROM public.franchise_members fm
    WHERE fm.roll_number = v_registration.roll_number;
  END IF;

  PERFORM public.auction_discard_redo_history();

  IF p_outcome = 'sold' THEN
    UPDATE public.franchises
    SET spent_amount = spent_amount + v_winning_bid.amount
    WHERE id = v_winning_bid.franchise_id
      AND spent_amount + v_winning_bid.amount <= total_budget;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The winning franchise no longer has enough purse balance';
    END IF;

    UPDATE public.auction_players
    SET status = 'sold',
        sold_to_franchise_id = v_winning_bid.franchise_id,
        sold_price = v_winning_bid.amount,
        sold_at = now()
    WHERE id = v_player.id;

    SELECT LEAST(COALESCE(MAX(display_order), 0) + 1, 32767)::SMALLINT
    INTO v_display_order
    FROM public.franchise_members
    WHERE franchise_id = v_winning_bid.franchise_id;

    INSERT INTO public.franchise_members (
      franchise_id,
      full_name,
      roll_number,
      role,
      display_order,
      is_active
    )
    VALUES (
      v_winning_bid.franchise_id,
      v_registration.full_name,
      v_registration.roll_number,
      'player',
      v_display_order,
      TRUE
    )
    ON CONFLICT (roll_number) DO UPDATE
    SET franchise_id = EXCLUDED.franchise_id,
        full_name = EXCLUDED.full_name,
        role = 'player',
        display_order = EXCLUDED.display_order,
        is_active = TRUE,
        updated_at = now()
    WHERE public.franchise_members.role = 'player';
  ELSE
    UPDATE public.auction_players
    SET status = 'unsold',
        sold_to_franchise_id = NULL,
        sold_price = NULL,
        sold_at = now()
    WHERE id = v_player.id;
  END IF;

  -- Advance to next player OF THE SAME AUCTION TYPE
  SELECT ap.*
  INTO v_next
  FROM public.auction_players ap
  JOIN public.player_registrations pr ON pr.id = ap.registration_id
  WHERE ap.status = 'upcoming'
    AND ap.auction_type = v_player.auction_type
    AND NOT EXISTS (
      SELECT 1
      FROM public.franchise_members fm
      WHERE fm.roll_number = pr.roll_number
        AND fm.role = 'leader'
        AND fm.is_active = TRUE
    )
  ORDER BY ap.queue_order, ap.created_at, ap.id
  LIMIT 1
  FOR UPDATE OF ap;

  IF FOUND THEN
    UPDATE public.auction_players
    SET status = 'current'
    WHERE id = v_next.id;

    UPDATE public.auction_config
    SET current_player_id = v_next.id,
        status = 'live'
    WHERE id = v_config.id
    RETURNING * INTO v_config;
  ELSE
    UPDATE public.auction_config
    SET current_player_id = NULL,
        status = 'completed'
    WHERE id = v_config.id
    RETURNING * INTO v_config;
  END IF;

  INSERT INTO public.auction_action_history (
    action_type,
    auction_player_id,
    payload
  )
  VALUES (
    'complete',
    v_player.id,
    jsonb_build_object(
      'outcome', p_outcome,
      'config_status_before', v_config_status_before,
      'player_sold_to_before', v_player.sold_to_franchise_id,
      'player_sold_price_before', v_player.sold_price,
      'player_sold_at_before', v_player.sold_at,
      'next_player_id', v_next.id,
      'winning_bid_id', v_winning_bid.id,
      'winning_franchise_id', v_winning_bid.franchise_id,
      'winning_amount', v_winning_bid.amount,
      'franchise_spent_before', v_franchise_spent_before,
      'member_before', v_member_before,
      'roll_number', v_registration.roll_number
    )
  );

  RETURN v_config;
END;
$$;

-- ============================================================
-- auction_save_retentions() — set auction_type on retention INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.auction_save_retentions(p_retentions JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_config public.auction_config%ROWTYPE;
DECLARE v_expected INTEGER;
DECLARE v_valid INTEGER;
BEGIN
  PERFORM public.auction_require_admin();
  IF jsonb_typeof(p_retentions) <> 'array' THEN
    RAISE EXCEPTION 'Retentions must be an array';
  END IF;

  SELECT * INTO v_config FROM public.auction_config ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF v_config.status IN ('live', 'paused') THEN
    RAISE EXCEPTION 'Retentions are locked once the live auction has started';
  END IF;

  WITH chosen AS (
    SELECT (entry->>'franchise_id')::UUID AS franchise_id, registration_id::UUID
    FROM jsonb_array_elements(p_retentions) entry
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(entry->'registration_ids', '[]'::jsonb)) registration_id
  )
  SELECT count(*), count(DISTINCT registration_id) INTO v_expected, v_valid FROM chosen;
  IF v_expected <> v_valid THEN
    RAISE EXCEPTION 'A player may only be retained by one franchise';
  END IF;

  WITH chosen AS (
    SELECT (entry->>'franchise_id')::UUID AS franchise_id, registration_id::UUID
    FROM jsonb_array_elements(p_retentions) entry
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(entry->'registration_ids', '[]'::jsonb)) registration_id
  )
  SELECT count(*) INTO v_valid
  FROM chosen c
  JOIN public.franchises f ON f.id = c.franchise_id AND f.is_active
  JOIN public.player_registrations r ON r.id = c.registration_id;
  IF v_valid <> v_expected THEN
    RAISE EXCEPTION 'A selected franchise or player no longer exists';
  END IF;

  IF EXISTS (
    WITH chosen AS (
      SELECT registration_id::UUID AS registration_id
      FROM jsonb_array_elements(p_retentions) entry
      CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(entry->'registration_ids', '[]'::jsonb)) registration_id
    )
    SELECT 1 FROM chosen c JOIN public.auction_players ap USING (registration_id)
    WHERE ap.status <> 'retained'
  ) THEN
    RAISE EXCEPTION 'Players already in an auction cannot be changed through retention';
  END IF;

  DELETE FROM public.auction_players WHERE status = 'retained';

  -- Retentions are always franchise-type (retained into a franchise)
  INSERT INTO public.auction_players
    (registration_id, base_price, status, sold_to_franchise_id, sold_price, sold_at, queue_order, auction_type)
  SELECT registration_id::UUID, 500, 'retained', (entry->>'franchise_id')::UUID, 500, now(), 0, 'franchise'
  FROM jsonb_array_elements(p_retentions) entry
  CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(entry->'registration_ids', '[]'::jsonb)) registration_id;

  UPDATE public.franchises f
  SET retained_count = COALESCE(r.retained_count, 0),
      spent_amount = COALESCE(s.sold_total, 0) + COALESCE(r.retained_count, 0) * 500
  FROM (
    SELECT sold_to_franchise_id AS franchise_id, count(*)::INTEGER AS retained_count
    FROM public.auction_players WHERE status = 'retained'
    GROUP BY sold_to_franchise_id
  ) r
  FULL OUTER JOIN (
    SELECT sold_to_franchise_id AS franchise_id, COALESCE(sum(sold_price), 0)::INTEGER AS sold_total
    FROM public.auction_players WHERE status = 'sold'
    GROUP BY sold_to_franchise_id
  ) s ON s.franchise_id = r.franchise_id
  WHERE f.id = COALESCE(r.franchise_id, s.franchise_id);

  UPDATE public.franchises
  SET retained_count = 0,
      spent_amount = COALESCE((
        SELECT sum(sold_price) FROM public.auction_players ap
        WHERE ap.status = 'sold' AND ap.sold_to_franchise_id = franchises.id
      ), 0)
  WHERE id NOT IN (
    SELECT sold_to_franchise_id FROM public.auction_players
    WHERE status IN ('retained', 'sold') AND sold_to_franchise_id IS NOT NULL
  );

  UPDATE public.auction_config
  SET status = 'retention', current_player_id = NULL, round_ends_at = NULL
  WHERE id = v_config.id;
END;
$$;

COMMIT;
