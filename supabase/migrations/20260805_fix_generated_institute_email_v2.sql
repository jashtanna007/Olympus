-- Correct SOLD, Undo and Redo writes for the generated
-- franchise_members.institute_email column.

BEGIN;

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

  SELECT ap.*
  INTO v_next
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

CREATE OR REPLACE FUNCTION public.auction_undo_last()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action public.auction_action_history%ROWTYPE;
  v_config public.auction_config%ROWTYPE;
  v_player public.auction_players%ROWTYPE;
  v_registration public.player_registrations%ROWTYPE;
  v_next_id UUID;
  v_outcome TEXT;
  v_member_before JSONB;
  v_member_id UUID;
BEGIN
  PERFORM public.auction_require_admin();

  SELECT *
  INTO v_action
  FROM public.auction_action_history
  WHERE is_undone = FALSE
  ORDER BY id DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'There is no auction action to undo';
  END IF;

  SELECT *
  INTO v_config
  FROM public.auction_config
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF v_action.action_type = 'bid' THEN
    IF v_config.current_player_id IS DISTINCT FROM v_action.auction_player_id THEN
      RAISE EXCEPTION 'Undo newer player actions before undoing this bid';
    END IF;

    DELETE FROM public.auction_bids
    WHERE id = (v_action.payload->>'bid_id')::UUID
      AND auction_player_id = v_action.auction_player_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The bid to undo no longer exists';
    END IF;
  ELSE
    v_outcome := v_action.payload->>'outcome';
    v_next_id := NULLIF(v_action.payload->>'next_player_id', '')::UUID;

    SELECT *
    INTO v_player
    FROM public.auction_players
    WHERE id = v_action.auction_player_id
    FOR UPDATE;

    SELECT *
    INTO v_registration
    FROM public.player_registrations
    WHERE id = v_player.registration_id;

    IF v_next_id IS NOT NULL THEN
      UPDATE public.auction_players
      SET status = 'upcoming'
      WHERE id = v_next_id
        AND status = 'current';
    END IF;

    UPDATE public.auction_players
    SET status = 'current',
        sold_to_franchise_id = NULLIF(v_action.payload->>'player_sold_to_before', '')::UUID,
        sold_price = NULLIF(v_action.payload->>'player_sold_price_before', '')::INTEGER,
        sold_at = NULLIF(v_action.payload->>'player_sold_at_before', '')::TIMESTAMPTZ
    WHERE id = v_action.auction_player_id;

    IF v_outcome = 'sold' THEN
      UPDATE public.franchises
      SET spent_amount = (v_action.payload->>'franchise_spent_before')::INTEGER
      WHERE id = (v_action.payload->>'winning_franchise_id')::UUID;

      v_member_before := v_action.payload->'member_before';

      IF v_member_before IS NULL OR v_member_before = 'null'::JSONB THEN
        DELETE FROM public.franchise_members
        WHERE roll_number = v_registration.roll_number
          AND role = 'player';
      ELSE
        v_member_id := (v_member_before->>'id')::UUID;

        INSERT INTO public.franchise_members (
          id,
          franchise_id,
          full_name,
          roll_number,
          role,
          display_order,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          v_member_id,
          (v_member_before->>'franchise_id')::UUID,
          v_member_before->>'full_name',
          v_member_before->>'roll_number',
          v_member_before->>'role',
          (v_member_before->>'display_order')::SMALLINT,
          (v_member_before->>'is_active')::BOOLEAN,
          (v_member_before->>'created_at')::TIMESTAMPTZ,
          (v_member_before->>'updated_at')::TIMESTAMPTZ
        )
        ON CONFLICT (roll_number) DO UPDATE
        SET franchise_id = EXCLUDED.franchise_id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            display_order = EXCLUDED.display_order,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at;
      END IF;
    END IF;

    UPDATE public.auction_config
    SET current_player_id = v_action.auction_player_id,
        status = COALESCE(NULLIF(v_action.payload->>'config_status_before', ''), 'live')
    WHERE id = v_config.id;
  END IF;

  UPDATE public.auction_action_history
  SET is_undone = TRUE,
      undone_at = now()
  WHERE id = v_action.id;

  RETURN jsonb_build_object(
    'action_id', v_action.id,
    'action_type', v_action.action_type,
    'undone', TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.auction_redo_last()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action public.auction_action_history%ROWTYPE;
  v_config public.auction_config%ROWTYPE;
  v_player public.auction_players%ROWTYPE;
  v_registration public.player_registrations%ROWTYPE;
  v_franchise public.franchises%ROWTYPE;
  v_bid public.auction_bids%ROWTYPE;
  v_highest INTEGER;
  v_expected INTEGER;
  v_next_id UUID;
  v_outcome TEXT;
  v_display_order SMALLINT;
BEGIN
  PERFORM public.auction_require_admin();

  SELECT *
  INTO v_action
  FROM public.auction_action_history
  WHERE is_undone = TRUE
  ORDER BY id ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'There is no auction action to redo';
  END IF;

  SELECT *
  INTO v_config
  FROM public.auction_config
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF v_config.current_player_id IS DISTINCT FROM v_action.auction_player_id THEN
    RAISE EXCEPTION 'The auction state changed; this action can no longer be redone';
  END IF;

  SELECT *
  INTO v_player
  FROM public.auction_players
  WHERE id = v_action.auction_player_id
  FOR UPDATE;

  IF NOT FOUND OR v_player.status <> 'current' THEN
    RAISE EXCEPTION 'The player for this redo action is not current';
  END IF;

  IF v_action.action_type = 'bid' THEN
    SELECT COALESCE(MAX(amount), NULL)
    INTO v_highest
    FROM public.auction_bids
    WHERE auction_player_id = v_player.id;

    v_expected := CASE
      WHEN v_highest IS NULL THEN v_player.base_price
      WHEN v_highest < 500 THEN v_highest + 50
      ELSE v_highest + 100
    END;

    IF v_expected <> (v_action.payload->>'amount')::INTEGER THEN
      RAISE EXCEPTION 'The bid sequence changed; this bid can no longer be redone';
    END IF;

    SELECT *
    INTO v_franchise
    FROM public.franchises
    WHERE id = (v_action.payload->>'franchise_id')::UUID
      AND is_active = TRUE
    FOR UPDATE;

    IF NOT FOUND OR v_expected > v_franchise.total_budget - v_franchise.spent_amount THEN
      RAISE EXCEPTION 'The franchise no longer has enough purse for this bid';
    END IF;

    INSERT INTO public.auction_bids (
      id,
      auction_player_id,
      franchise_id,
      amount,
      created_at
    )
    VALUES (
      (v_action.payload->>'bid_id')::UUID,
      v_action.auction_player_id,
      (v_action.payload->>'franchise_id')::UUID,
      (v_action.payload->>'amount')::INTEGER,
      (v_action.payload->>'created_at')::TIMESTAMPTZ
    )
    RETURNING * INTO v_bid;
  ELSE
    v_outcome := v_action.payload->>'outcome';
    v_next_id := NULLIF(v_action.payload->>'next_player_id', '')::UUID;

    SELECT *
    INTO v_registration
    FROM public.player_registrations
    WHERE id = v_player.registration_id;

    IF v_outcome = 'sold' THEN
      SELECT *
      INTO v_bid
      FROM public.auction_bids
      WHERE id = (v_action.payload->>'winning_bid_id')::UUID
        AND auction_player_id = v_player.id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'The winning bid required for this redo no longer exists';
      END IF;

      UPDATE public.franchises
      SET spent_amount = (v_action.payload->>'franchise_spent_before')::INTEGER
                         + (v_action.payload->>'winning_amount')::INTEGER
      WHERE id = (v_action.payload->>'winning_franchise_id')::UUID
        AND (v_action.payload->>'franchise_spent_before')::INTEGER
            + (v_action.payload->>'winning_amount')::INTEGER <= total_budget;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'The winning franchise no longer has enough purse balance';
      END IF;

      UPDATE public.auction_players
      SET status = 'sold',
          sold_to_franchise_id = (v_action.payload->>'winning_franchise_id')::UUID,
          sold_price = (v_action.payload->>'winning_amount')::INTEGER,
          sold_at = now()
      WHERE id = v_player.id;

      SELECT LEAST(COALESCE(MAX(display_order), 0) + 1, 32767)::SMALLINT
      INTO v_display_order
      FROM public.franchise_members
      WHERE franchise_id = (v_action.payload->>'winning_franchise_id')::UUID;

      INSERT INTO public.franchise_members (
        franchise_id,
        full_name,
        roll_number,
        role,
        display_order,
        is_active
      )
      VALUES (
        (v_action.payload->>'winning_franchise_id')::UUID,
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

    IF v_next_id IS NOT NULL THEN
      UPDATE public.auction_players
      SET status = 'current'
      WHERE id = v_next_id
        AND status = 'upcoming';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'The next player required for this redo is no longer upcoming';
      END IF;

      UPDATE public.auction_config
      SET current_player_id = v_next_id,
          status = 'live'
      WHERE id = v_config.id;
    ELSE
      UPDATE public.auction_config
      SET current_player_id = NULL,
          status = 'completed'
      WHERE id = v_config.id;
    END IF;
  END IF;

  UPDATE public.auction_action_history
  SET is_undone = FALSE,
      undone_at = NULL
  WHERE id = v_action.id;

  RETURN jsonb_build_object(
    'action_id', v_action.id,
    'action_type', v_action.action_type,
    'redone', TRUE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.auction_complete_current(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auction_undo_last() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auction_redo_last() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auction_complete_current(TEXT)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.auction_undo_last()
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.auction_redo_last()
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
