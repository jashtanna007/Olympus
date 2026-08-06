-- Olympus auction runtime repair.
-- Apply after the existing franchise, registration, and auction migrations.
-- This migration intentionally removes all timer dependency from auction commands.

BEGIN;

-- ============================================================
-- AUTHORIZATION HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_auction_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'auctioneer')
  );
$$;

CREATE OR REPLACE FUNCTION public.auction_require_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_auction_admin() THEN
    RAISE EXCEPTION 'Only an administrator or auctioneer can operate the auction'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Signed-in viewers may read registration details only when the player is part
-- of the auction queue. Existing own-registration and admin policies remain.
DROP POLICY IF EXISTS "Authenticated users can view auction registrations"
  ON public.player_registrations;

CREATE POLICY "Authenticated users can view auction registrations"
  ON public.player_registrations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_auction_admin()
    OR EXISTS (
      SELECT 1
      FROM public.auction_players ap
      WHERE ap.registration_id = player_registrations.id
    )
  );

-- ============================================================
-- REPAIR EXISTING QUEUE INVARIANTS
-- ============================================================

-- Franchise leaders are displayed as the first team member and are not auctioned.
UPDATE public.auction_players ap
SET status = 'unsold',
    sold_to_franchise_id = NULL,
    sold_price = NULL,
    sold_at = COALESCE(ap.sold_at, now())
FROM public.player_registrations pr
WHERE pr.id = ap.registration_id
  AND ap.status IN ('current', 'upcoming')
  AND EXISTS (
    SELECT 1
    FROM public.franchise_members fm
    WHERE fm.roll_number = pr.roll_number
      AND fm.role = 'leader'
      AND fm.is_active = TRUE
  );

-- Keep the row selected by auction_config as current. If it is invalid, keep the
-- earliest remaining current row. All duplicate current rows become upcoming.
DO $$
DECLARE
  v_config_id UUID;
  v_config_status TEXT;
  v_current_id UUID;
BEGIN
  SELECT id, status, current_player_id
  INTO v_config_id, v_config_status, v_current_id
  FROM public.auction_config
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF v_config_id IS NULL THEN
    INSERT INTO public.auction_config (
      total_budget,
      base_price,
      bid_increment,
      status,
      gender_mode
    )
    VALUES (10000, 200, 50, 'setup', 'Male')
    RETURNING id, status, current_player_id
    INTO v_config_id, v_config_status, v_current_id;
  END IF;

  IF v_current_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.auction_players
    WHERE id = v_current_id
      AND status = 'current'
  ) THEN
    SELECT id
    INTO v_current_id
    FROM public.auction_players
    WHERE status = 'current'
    ORDER BY queue_order, created_at, id
    LIMIT 1;
  END IF;

  UPDATE public.auction_players
  SET status = 'upcoming'
  WHERE status = 'current'
    AND (v_current_id IS NULL OR id <> v_current_id);

  IF v_current_id IS NOT NULL THEN
    UPDATE public.auction_players
    SET status = 'current'
    WHERE id = v_current_id;
  END IF;

  UPDATE public.auction_config
  SET current_player_id = v_current_id,
      status = CASE
        WHEN v_current_id IS NULL AND status IN ('live', 'paused') THEN 'setup'
        ELSE status
      END
  WHERE id = v_config_id;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS auction_config_singleton_idx
  ON public.auction_config ((TRUE));

CREATE UNIQUE INDEX IF NOT EXISTS auction_players_one_current_idx
  ON public.auction_players ((status))
  WHERE status = 'current';

-- ============================================================
-- ATOMIC BID COMMAND
-- ============================================================

DROP FUNCTION IF EXISTS public.auction_place_bid(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.auction_place_bid(UUID);

CREATE FUNCTION public.auction_place_bid(p_franchise_id UUID)
RETURNS public.auction_bids
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.auction_config%ROWTYPE;
  v_player public.auction_players%ROWTYPE;
  v_franchise public.franchises%ROWTYPE;
  v_highest INTEGER;
  v_highest_franchise_id UUID;
  v_amount INTEGER;
  v_bid public.auction_bids%ROWTYPE;
BEGIN
  PERFORM public.auction_require_admin();

  SELECT *
  INTO v_config
  FROM public.auction_config
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_config.status <> 'live' OR v_config.current_player_id IS NULL THEN
    RAISE EXCEPTION 'There is no live player available for bidding';
  END IF;

  SELECT *
  INTO v_player
  FROM public.auction_players
  WHERE id = v_config.current_player_id
  FOR UPDATE;

  IF NOT FOUND OR v_player.status <> 'current' THEN
    RAISE EXCEPTION 'The current auction player is no longer available';
  END IF;

  SELECT *
  INTO v_franchise
  FROM public.franchises
  WHERE id = p_franchise_id
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected franchise is not active';
  END IF;

  SELECT amount, franchise_id
  INTO v_highest, v_highest_franchise_id
  FROM public.auction_bids
  WHERE auction_player_id = v_player.id
  ORDER BY amount DESC, created_at ASC, id ASC
  LIMIT 1;

  IF v_highest_franchise_id = p_franchise_id THEN
    RAISE EXCEPTION 'This franchise is already the highest bidder';
  END IF;

  -- First franchise click places the base price. Bids then increase by 50
  -- through 500, and by 100 after the current bid reaches 500.
  v_amount := CASE
    WHEN v_highest IS NULL THEN v_player.base_price
    WHEN v_highest < 500 THEN v_highest + 50
    ELSE v_highest + 100
  END;

  IF v_amount > v_franchise.total_budget - v_franchise.spent_amount THEN
    RAISE EXCEPTION 'This franchise has only % remaining in its purse',
      v_franchise.total_budget - v_franchise.spent_amount;
  END IF;

  INSERT INTO public.auction_bids (
    auction_player_id,
    franchise_id,
    amount
  )
  VALUES (
    v_player.id,
    p_franchise_id,
    v_amount
  )
  RETURNING * INTO v_bid;

  RETURN v_bid;
END;
$$;

-- ============================================================
-- AUCTION LIFECYCLE COMMANDS
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

  IF v_current_id IS NULL THEN
    WITH eligible AS (
      SELECT
        pr.id,
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
      queue_order
    )
    SELECT
      id,
      v_config.base_price,
      'upcoming',
      queue_position
    FROM eligible
    ON CONFLICT (registration_id) DO NOTHING;

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

CREATE OR REPLACE FUNCTION public.auction_toggle_live()
RETURNS public.auction_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.auction_config%ROWTYPE;
BEGIN
  PERFORM public.auction_require_admin();

  SELECT *
  INTO v_config
  FROM public.auction_config
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_config.current_player_id IS NULL THEN
    RAISE EXCEPTION 'There is no active player to pause or resume';
  END IF;

  IF v_config.status = 'live' THEN
    UPDATE public.auction_config
    SET status = 'paused'
    WHERE id = v_config.id
    RETURNING * INTO v_config;
  ELSIF v_config.status = 'paused' THEN
    UPDATE public.auction_config
    SET status = 'live'
    WHERE id = v_config.id
    RETURNING * INTO v_config;
  ELSE
    RAISE EXCEPTION 'Only a live or paused auction can be toggled';
  END IF;

  RETURN v_config;
END;
$$;

CREATE OR REPLACE FUNCTION public.auction_set_gender(p_gender_mode TEXT)
RETURNS public.auction_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.auction_config%ROWTYPE;
BEGIN
  PERFORM public.auction_require_admin();

  IF p_gender_mode NOT IN ('Male', 'Female') THEN
    RAISE EXCEPTION 'Gender mode must be Male or Female';
  END IF;

  SELECT *
  INTO v_config
  FROM public.auction_config
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction configuration has not been created';
  END IF;

  IF v_config.status IN ('live', 'paused') THEN
    RAISE EXCEPTION 'Complete the current auction before changing gender mode';
  END IF;

  UPDATE public.auction_config
  SET gender_mode = p_gender_mode
  WHERE id = v_config.id
  RETURNING * INTO v_config;

  RETURN v_config;
END;
$$;

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

  RETURN v_config;
END;
$$;

-- Direct table mutation remains disabled. All auction writes go through the
-- commands above so bid order, purse validation, and queue advancement are atomic.
REVOKE INSERT, UPDATE, DELETE ON public.auction_config FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.auction_players FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.auction_bids FROM authenticated;
REVOKE UPDATE ON public.franchises FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.franchise_members FROM authenticated;

REVOKE ALL ON FUNCTION public.auction_place_bid(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auction_complete_current(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auction_start() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auction_toggle_live() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auction_set_gender(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auction_place_bid(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_complete_current(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_start() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_toggle_live() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_set_gender(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
