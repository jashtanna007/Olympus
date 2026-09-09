-- Atomic auction commands.  Apply after the existing auction migrations.
-- All state changes are kept in these functions so concurrent auctioneer
-- clicks cannot create invalid bids, overspend a franchise, or advance twice.

BEGIN;

ALTER TABLE public.auction_config
  ADD COLUMN IF NOT EXISTS round_seconds INTEGER NOT NULL DEFAULT 60
    CHECK (round_seconds BETWEEN 10 AND 600),
  ADD COLUMN IF NOT EXISTS round_ends_at TIMESTAMPTZ;

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

CREATE OR REPLACE FUNCTION public.auction_place_bid(
  p_franchise_id UUID,
  p_amount INTEGER
)
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
  v_required INTEGER;
  v_bid public.auction_bids%ROWTYPE;
BEGIN
  PERFORM public.auction_require_admin();

  SELECT * INTO v_config
  FROM public.auction_config
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_config.status <> 'live' OR v_config.current_player_id IS NULL THEN
    RAISE EXCEPTION 'There is no live player available for bidding';
  END IF;

  IF v_config.round_ends_at IS NOT NULL AND v_config.round_ends_at <= now() THEN
    RAISE EXCEPTION 'This bidding round has expired. Mark the player sold or unsold.';
  END IF;

  SELECT * INTO v_player
  FROM public.auction_players
  WHERE id = v_config.current_player_id
  FOR UPDATE;

  IF NOT FOUND OR v_player.status <> 'current' THEN
    RAISE EXCEPTION 'The current auction player is no longer available';
  END IF;

  SELECT * INTO v_franchise
  FROM public.franchises
  WHERE id = p_franchise_id AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected franchise is not active';
  END IF;

  SELECT max(amount) INTO v_highest
  FROM public.auction_bids
  WHERE auction_player_id = v_player.id;

  v_required := COALESCE(v_highest, v_player.base_price) + v_config.bid_increment;

  IF p_amount < v_required OR (p_amount - v_required) % v_config.bid_increment <> 0 THEN
    RAISE EXCEPTION 'Bid must be at least % and follow the % increment', v_required, v_config.bid_increment;
  END IF;

  IF p_amount > v_franchise.total_budget - v_franchise.spent_amount THEN
    RAISE EXCEPTION 'This franchise has only % remaining in its purse',
      v_franchise.total_budget - v_franchise.spent_amount;
  END IF;

  INSERT INTO public.auction_bids (auction_player_id, franchise_id, amount)
  VALUES (v_player.id, p_franchise_id, p_amount)
  RETURNING * INTO v_bid;

  UPDATE public.auction_config
  SET round_ends_at = now() + make_interval(secs => round_seconds)
  WHERE id = v_config.id;

  RETURN v_bid;
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
  v_winning_bid public.auction_bids%ROWTYPE;
  v_next public.auction_players%ROWTYPE;
BEGIN
  PERFORM public.auction_require_admin();

  IF p_outcome NOT IN ('sold', 'unsold') THEN
    RAISE EXCEPTION 'Auction outcome must be sold or unsold';
  END IF;

  SELECT * INTO v_config FROM public.auction_config ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_config.current_player_id IS NULL THEN
    RAISE EXCEPTION 'There is no current player to complete';
  END IF;

  SELECT * INTO v_player FROM public.auction_players
  WHERE id = v_config.current_player_id FOR UPDATE;
  IF NOT FOUND OR v_player.status <> 'current' THEN
    RAISE EXCEPTION 'The current player has already been completed';
  END IF;

  IF p_outcome = 'sold' THEN
    SELECT * INTO v_winning_bid FROM public.auction_bids
    WHERE auction_player_id = v_player.id
    ORDER BY amount DESC, created_at ASC, id ASC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'A player cannot be sold without a valid bid';
    END IF;

    UPDATE public.franchises
    SET spent_amount = spent_amount + v_winning_bid.amount
    WHERE id = v_winning_bid.franchise_id
      AND spent_amount + v_winning_bid.amount <= total_budget;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The winning franchise no longer has enough purse balance';
    END IF;

    UPDATE public.auction_players
    SET status = 'sold', sold_to_franchise_id = v_winning_bid.franchise_id,
        sold_price = v_winning_bid.amount, sold_at = now()
    WHERE id = v_player.id;
  ELSE
    UPDATE public.auction_players
    SET status = 'unsold', sold_to_franchise_id = NULL, sold_price = NULL, sold_at = now()
    WHERE id = v_player.id;
  END IF;

  SELECT * INTO v_next FROM public.auction_players
  WHERE status = 'upcoming'
  ORDER BY queue_order, created_at, id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.auction_players SET status = 'current' WHERE id = v_next.id;
    UPDATE public.auction_config
    SET current_player_id = v_next.id, status = 'live',
        round_ends_at = now() + make_interval(secs => round_seconds)
    WHERE id = v_config.id
    RETURNING * INTO v_config;
  ELSE
    UPDATE public.auction_config
    SET current_player_id = NULL, status = 'completed', round_ends_at = NULL
    WHERE id = v_config.id
    RETURNING * INTO v_config;
  END IF;

  RETURN v_config;
END;
$$;

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
  SELECT * INTO v_config FROM public.auction_config ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction configuration has not been created';
  END IF;

  IF v_config.status = 'live' THEN
    RAISE EXCEPTION 'The auction is already live';
  END IF;

  -- A paused auction resumes its current player instead of creating a second queue.
  IF v_config.status = 'paused' AND v_config.current_player_id IS NOT NULL THEN
    UPDATE public.auction_config
    SET status = 'live', round_ends_at = now() + make_interval(secs => round_seconds)
    WHERE id = v_config.id RETURNING * INTO v_config;
    RETURN v_config;
  END IF;

  SELECT id INTO v_current_id FROM public.auction_players
  WHERE status = 'current'
  ORDER BY queue_order, created_at LIMIT 1 FOR UPDATE;

  IF v_current_id IS NULL THEN
    SELECT id INTO v_current_id FROM public.auction_players
    WHERE status = 'upcoming'
    ORDER BY queue_order, created_at LIMIT 1 FOR UPDATE;

    IF v_current_id IS NOT NULL THEN
      UPDATE public.auction_players SET status = 'current' WHERE id = v_current_id;
    ELSE
      WITH shuffled AS (
        SELECT r.id, row_number() OVER (ORDER BY random()) - 1 AS position
        FROM public.player_registrations r
        WHERE r.gender = v_config.gender_mode
          AND NOT EXISTS (
            SELECT 1 FROM public.auction_players ap
            WHERE ap.registration_id = r.id
          )
      )
      INSERT INTO public.auction_players (registration_id, base_price, status, queue_order)
      SELECT id, v_config.base_price,
             CASE WHEN position = 0 THEN 'current' ELSE 'upcoming' END,
             position
      FROM shuffled;

      SELECT id INTO v_current_id FROM public.auction_players
      WHERE status = 'current'
      ORDER BY queue_order, created_at LIMIT 1;
    END IF;
  END IF;

  IF v_current_id IS NULL THEN
    RAISE EXCEPTION 'No eligible % players are available for this auction', v_config.gender_mode;
  END IF;

  UPDATE public.auction_config
  SET current_player_id = v_current_id, status = 'live',
      round_ends_at = now() + make_interval(secs => round_seconds)
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
DECLARE v_config public.auction_config%ROWTYPE;
BEGIN
  PERFORM public.auction_require_admin();
  SELECT * INTO v_config FROM public.auction_config ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_config.current_player_id IS NULL THEN
    RAISE EXCEPTION 'There is no active player to pause or resume';
  END IF;
  IF v_config.status = 'live' THEN
    UPDATE public.auction_config SET status = 'paused', round_ends_at = NULL
    WHERE id = v_config.id RETURNING * INTO v_config;
  ELSIF v_config.status = 'paused' THEN
    UPDATE public.auction_config
    SET status = 'live', round_ends_at = now() + make_interval(secs => round_seconds)
    WHERE id = v_config.id RETURNING * INTO v_config;
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
DECLARE v_config public.auction_config%ROWTYPE;
BEGIN
  PERFORM public.auction_require_admin();
  IF p_gender_mode NOT IN ('Male', 'Female') THEN
    RAISE EXCEPTION 'Gender mode must be Male or Female';
  END IF;
  SELECT * INTO v_config FROM public.auction_config ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF v_config.status IN ('live', 'paused') THEN
    RAISE EXCEPTION 'Pause and complete the current auction before changing gender mode';
  END IF;
  UPDATE public.auction_config SET gender_mode = p_gender_mode
  WHERE id = v_config.id RETURNING * INTO v_config;
  RETURN v_config;
END;
$$;

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

  INSERT INTO public.auction_players
    (registration_id, base_price, status, sold_to_franchise_id, sold_price, sold_at, queue_order)
  SELECT registration_id::UUID, 500, 'retained', (entry->>'franchise_id')::UUID, 500, now(), 0
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

-- Direct table mutation is intentionally disabled.  The RPCs above perform
-- validation and use row locks; policies from the earlier migration still
-- govern reads for the live spectator page.
REVOKE INSERT, UPDATE, DELETE ON public.auction_config FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.auction_players FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.auction_bids FROM authenticated;
REVOKE UPDATE ON public.franchises FROM authenticated;

GRANT EXECUTE ON FUNCTION public.auction_place_bid(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_complete_current(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_start() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_toggle_live() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_set_gender(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_save_retentions(JSONB) TO authenticated;

COMMIT;
