BEGIN;

CREATE OR REPLACE FUNCTION public.auction_place_bid(p_franchise_id UUID)
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

  IF NOT FOUND
     OR v_config.status <> 'live'
     OR v_config.current_player_id IS NULL THEN
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

  v_amount := CASE
    WHEN v_highest IS NULL THEN v_player.base_price
    WHEN v_highest < 500 THEN v_highest + 50
    ELSE v_highest + 100
  END;

  IF v_amount > v_franchise.total_budget - v_franchise.spent_amount THEN
    RAISE EXCEPTION
      'This franchise has only % remaining in its purse',
      v_franchise.total_budget - v_franchise.spent_amount;
  END IF;

  -- New bid invalidates redo stack
  PERFORM public.auction_discard_redo_history();

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

  -- IMPORTANT: make every accepted bid undoable
  INSERT INTO public.auction_action_history (
    action_type,
    auction_player_id,
    payload
  )
  VALUES (
    'bid',
    v_player.id,
    jsonb_build_object(
      'bid_id', v_bid.id,
      'franchise_id', v_bid.franchise_id,
      'amount', v_bid.amount,
      'created_at', v_bid.created_at
    )
  );

  RETURN v_bid;
END;
$$;

COMMIT;
