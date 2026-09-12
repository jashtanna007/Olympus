CREATE OR REPLACE FUNCTION public.auction_start()
RETURNS public.auction_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_config public.auction_config%ROWTYPE;
  v_current_id UUID;
BEGIN
  PERFORM public.auction_require_admin();

  SELECT *
  INTO v_config
  FROM public.auction_config
  WHERE auction_type = 'franchise'
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'All auction configuration has not been created';
  END IF;

  IF v_config.status = 'live' THEN
    RAISE EXCEPTION 'The All auction is already live';
  END IF;

  IF v_config.status = 'paused'
     AND v_config.current_player_id IS NOT NULL THEN
    UPDATE public.auction_config
    SET status = 'live'
    WHERE id = v_config.id
    RETURNING * INTO v_config;
    RETURN v_config;
  END IF;

  SELECT ap.id
  INTO v_current_id
  FROM public.auction_players ap
  WHERE ap.auction_type = 'franchise'
    AND ap.status = 'current'
  ORDER BY ap.queue_order, ap.created_at, ap.id
  LIMIT 1
  FOR UPDATE;

  IF v_current_id IS NULL THEN
    SELECT ap.id
    INTO v_current_id
    FROM public.auction_players ap
    JOIN public.player_registrations pr
      ON pr.id = ap.registration_id
    WHERE ap.auction_type = 'franchise'
      AND ap.status = 'upcoming'
      AND NOT EXISTS (
        SELECT 1
        FROM public.franchise_members fm
        WHERE fm.roll_number = pr.roll_number
          AND fm.is_active = TRUE
      )
    ORDER BY ap.queue_order, ap.created_at, ap.id
    LIMIT 1
    FOR UPDATE OF ap;
  END IF;

  IF v_current_id IS NULL THEN
    RAISE EXCEPTION 'No players have been loaded into the All auction slot';
  END IF;

  UPDATE public.auction_players
  SET status = 'current'
  WHERE id = v_current_id
    AND auction_type = 'franchise';

  UPDATE public.auction_config
  SET current_player_id = v_current_id,
      status = 'live'
  WHERE id = v_config.id
  RETURNING * INTO v_config;

  RETURN v_config;
END;
$function$;
