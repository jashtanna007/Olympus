BEGIN;

-- Abandon the old automatically-generated franchise auction session.
-- Refuse to do this if a real franchise sale/retention happened meanwhile.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.auction_players
    WHERE auction_type = 'franchise'
      AND status IN ('sold', 'retained')
  ) THEN
    RAISE EXCEPTION
      'Cannot reset franchise auction because completed purchases now exist';
  END IF;

  UPDATE public.auction_config
  SET current_player_id = NULL,
      status = 'retention',
      round_ends_at = NULL;

  -- The old current/upcoming queue was auto-generated and is being abandoned.
  -- auction_bids belonging to deleted players cascade automatically.
  DELETE FROM public.auction_players
  WHERE auction_type = 'franchise'
    AND status IN ('current', 'upcoming');
END
$$;

-- Store the amount paid in the pre-auction/blind auction.
ALTER TABLE public.franchise_members
  ADD COLUMN IF NOT EXISTS purchase_price INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'franchise_members_purchase_price_non_negative'
  ) THEN
    ALTER TABLE public.franchise_members
      ADD CONSTRAINT franchise_members_purchase_price_non_negative
      CHECK (purchase_price IS NULL OR purchase_price >= 0);
  END IF;
END
$$;


-- ============================================================
-- Official franchise roster
-- Captain = purchase_price NULL
-- Blind-auction player = actual purchase price
-- ============================================================

-- Clear existing active leader assignments for these franchises first.
-- The official leaders below are then re-activated/upserted.
-- This avoids the one-active-leader-per-franchise unique constraint.
UPDATE public.franchise_members fm
SET
  is_active = FALSE,
  updated_at = now()
FROM public.franchises f
WHERE fm.franchise_id = f.id
  AND fm.role = 'leader'
  AND fm.is_active = TRUE
  AND f.slug IN (
    'desert-fighters',
    'fiery-falcons',
    'ocean-giants',
    'spartan-vortex',
    'deccan-knights',
    'shadow-fangs',
    'phoenix-clan',
    'trident-titans'
  );

WITH seed(slug, roll_number, role, purchase_price, display_order) AS (
  VALUES
    -- Desert Fighters
    ('desert-fighters', '202492001',   'leader', NULL::INTEGER, 0),
    ('desert-fighters', '202311089',   'player', 3700, 1),
    ('desert-fighters', '20252651062', 'player', 1000, 2),

    -- Fiery Falcons
    ('fiery-falcons', '202411046', 'leader', NULL::INTEGER, 0),
    ('fiery-falcons', '202411074', 'player', 2000, 1),
    ('fiery-falcons', '202411035', 'player', 1500, 2),
    ('fiery-falcons', '202311044', 'player', 900,  3),

    -- Ocean Giants
    ('ocean-giants', '202411042', 'leader', NULL::INTEGER, 0),
    ('ocean-giants', '202311085', 'player', 1100, 1),

    -- Spartan Vortex
    ('spartan-vortex', '20252651031', 'leader', NULL::INTEGER, 0),
    ('spartan-vortex', '20252651057', 'player', 900,  1),
    ('spartan-vortex', '20252651058', 'player', 3000, 2),
    ('spartan-vortex', '202411064',   'player', 900,  3),

    -- Deccan Knights
    ('deccan-knights', '202411014', 'leader', NULL::INTEGER, 0),
    ('deccan-knights', '202411039', 'player', 4100, 1),
    ('deccan-knights', '202311052', 'player', 1000, 2),
    ('deccan-knights', '202311023', 'player', 900,  3),

    -- Shadow Fangs
    ('shadow-fangs', '202411002', 'leader', NULL::INTEGER, 0),
    ('shadow-fangs', '202311001', 'player', 3100, 1),
    ('shadow-fangs', '202411012', 'player', 2000, 2),
    ('shadow-fangs', '202411086', 'player', 900,  3),

    -- Phoenix Clan
    ('phoenix-clan', '202411045',   'leader', NULL::INTEGER, 0),
    ('phoenix-clan', '202311046',   'player', 3600, 1),
    ('phoenix-clan', '20252651036', 'player', 1400, 2),

    -- Trident Titans
    ('trident-titans', '202411054',   'leader', NULL::INTEGER, 0),
    ('trident-titans', '202411060',   'player', 2900, 1),
    ('trident-titans', '202311064',   'player', 1400, 2),
    ('trident-titans', '20252603005', 'player', 1500, 3)
)

INSERT INTO public.franchise_members (
  franchise_id,
  full_name,
  roll_number,
  role,
  purchase_price,
  display_order,
  is_active
)
SELECT
  f.id,
  seed.roll_number,
  seed.roll_number,
  seed.role,
  seed.purchase_price,
  seed.display_order,
  TRUE
FROM seed
JOIN public.franchises f
  ON f.slug = seed.slug
ON CONFLICT (roll_number) DO UPDATE
SET
  franchise_id = EXCLUDED.franchise_id,
  role = EXCLUDED.role,
  purchase_price = EXCLUDED.purchase_price,
  display_order = EXCLUDED.display_order,
  is_active = TRUE,
  updated_at = now();


-- ============================================================
-- Original purse = 35,000
-- Set the current blind-auction spend.
-- ============================================================

WITH purse(slug, spent) AS (
  VALUES
    ('desert-fighters', 4700),
    ('fiery-falcons',   4400),
    ('ocean-giants',    1100),
    ('spartan-vortex',  4800),
    ('deccan-knights',  6000),
    ('shadow-fangs',    6000),
    ('phoenix-clan',    5000),
    ('trident-titans',  5800)
)

UPDATE public.franchises f
SET
  total_budget = 35000,
  spent_amount = purse.spent,
  updated_at = now()
FROM purse
WHERE f.slug = purse.slug;


-- ============================================================
-- Display resolver
--
-- Name priority:
-- 1. Olympus registration name
-- 2. Google/Auth user name
-- 3. Roll number
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_franchise_display_members()
RETURNS TABLE (
  id UUID,
  franchise_id UUID,
  roll_number TEXT,
  role TEXT,
  display_order SMALLINT,
  is_active BOOLEAN,
  purchase_price INTEGER,
  display_name TEXT,
  photo_url TEXT,
  sports JSONB
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$

  SELECT
    fm.id,
    fm.franchise_id,
    fm.roll_number,
    fm.role,
    fm.display_order,
    fm.is_active,

    COALESCE(
      fm.purchase_price,
      auction_info.sold_price
    ) AS purchase_price,

    COALESCE(
      NULLIF(BTRIM(reg.full_name), ''),
      NULLIF(BTRIM(auth_info.full_name), ''),
      fm.roll_number
    ) AS display_name,

    reg.photo_url::TEXT,

    COALESCE(
      to_jsonb(reg.sports),
      '[]'::JSONB
    ) AS sports

  FROM public.franchise_members fm

  LEFT JOIN LATERAL (
    SELECT
      pr.id,
      pr.full_name,
      pr.photo_url,
      pr.sports
    FROM public.player_registrations pr
    WHERE pr.roll_number = fm.roll_number
    ORDER BY pr.created_at DESC
    LIMIT 1
  ) reg ON TRUE

  LEFT JOIN LATERAL (
    SELECT
      COALESCE(
        NULLIF(BTRIM(u.raw_user_meta_data->>'full_name'), ''),
        NULLIF(BTRIM(u.raw_user_meta_data->>'name'), '')
      ) AS full_name
    FROM auth.users u
    WHERE split_part(lower(COALESCE(u.email, '')), '@', 1) = fm.roll_number
    ORDER BY u.created_at DESC
    LIMIT 1
  ) auth_info ON TRUE

  LEFT JOIN LATERAL (
    SELECT ap.sold_price
    FROM public.auction_players ap
    JOIN public.player_registrations apr
      ON apr.id = ap.registration_id
    WHERE apr.roll_number = fm.roll_number
      AND ap.status IN ('sold', 'retained')
    ORDER BY ap.sold_at DESC NULLS LAST, ap.created_at DESC
    LIMIT 1
  ) auction_info ON TRUE

  WHERE fm.is_active = TRUE
  ORDER BY fm.franchise_id, fm.display_order, fm.roll_number;

$function$;

REVOKE ALL
ON FUNCTION public.get_franchise_display_members()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_franchise_display_members()
TO authenticated;


-- ============================================================
-- When a blind-auction member registers later, mark them as
-- already sold so auction_start() cannot queue them again.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_blind_auction_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_member public.franchise_members%ROWTYPE;
BEGIN

  SELECT *
  INTO v_member
  FROM public.franchise_members
  WHERE roll_number = NEW.roll_number
    AND role = 'player'
    AND is_active = TRUE
    AND purchase_price IS NOT NULL
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.auction_players (
      registration_id,
      base_price,
      status,
      sold_to_franchise_id,
      sold_price,
      sold_at,
      queue_order,
      auction_type
    )
    VALUES (
      NEW.id,
      200,
      'sold',
      v_member.franchise_id,
      v_member.purchase_price,
      now(),
      0,
      'franchise'
    )
    ON CONFLICT (registration_id) DO UPDATE
    SET
      status = 'sold',
      sold_to_franchise_id = EXCLUDED.sold_to_franchise_id,
      sold_price = EXCLUDED.sold_price,
      sold_at = COALESCE(public.auction_players.sold_at, EXCLUDED.sold_at),
      auction_type = 'franchise';
  END IF;

  RETURN NEW;
END;
$function$;


DROP TRIGGER IF EXISTS sync_blind_auction_registration_trigger
ON public.player_registrations;

CREATE TRIGGER sync_blind_auction_registration_trigger
AFTER INSERT OR UPDATE OF roll_number
ON public.player_registrations
FOR EACH ROW
EXECUTE FUNCTION public.sync_blind_auction_registration();


-- Backfill any blind-auction players who are already registered.
INSERT INTO public.auction_players (
  registration_id,
  base_price,
  status,
  sold_to_franchise_id,
  sold_price,
  sold_at,
  queue_order,
  auction_type
)
SELECT
  reg.id,
  200,
  'sold',
  fm.franchise_id,
  fm.purchase_price,
  now(),
  0,
  'franchise'
FROM public.franchise_members fm
JOIN LATERAL (
  SELECT pr.id
  FROM public.player_registrations pr
  WHERE pr.roll_number = fm.roll_number
  ORDER BY pr.created_at DESC
  LIMIT 1
) reg ON TRUE
WHERE fm.role = 'player'
  AND fm.is_active = TRUE
  AND fm.purchase_price IS NOT NULL

ON CONFLICT (registration_id) DO UPDATE
SET
  status = 'sold',
  sold_to_franchise_id = EXCLUDED.sold_to_franchise_id,
  sold_price = EXCLUDED.sold_price,
  sold_at = COALESCE(public.auction_players.sold_at, EXCLUDED.sold_at),
  auction_type = 'franchise';



-- ============================================================
-- CURATED AUCTION SLOT SUPPORT
--
-- auction_players is now the explicit auction list.
-- auction_start() MUST NOT automatically add every registration.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auction_load_slot_by_rolls(
  p_roll_numbers TEXT[],
  p_auction_type TEXT DEFAULT 'franchise'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_config public.auction_config%ROWTYPE;
  v_expected INTEGER;
  v_found INTEGER;
BEGIN
  PERFORM public.auction_require_admin();

  IF p_auction_type NOT IN ('franchise', 'girls_individual') THEN
    RAISE EXCEPTION 'Invalid auction type';
  END IF;

  v_expected := COALESCE(cardinality(p_roll_numbers), 0);

  IF v_expected = 0 THEN
    RAISE EXCEPTION 'Auction slot player list cannot be empty';
  END IF;

  IF (
    SELECT count(*)
    FROM (
      SELECT DISTINCT trim(x) AS roll_number
      FROM unnest(p_roll_numbers) AS x
    ) d
  ) <> v_expected THEN
    RAISE EXCEPTION 'Auction slot contains duplicate roll numbers';
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
    RAISE EXCEPTION 'Stop the current auction before loading another slot';
  END IF;

  SELECT count(DISTINCT pr.roll_number)
  INTO v_found
  FROM public.player_registrations pr
  WHERE pr.roll_number = ANY(p_roll_numbers);

  IF v_found <> v_expected THEN
    RAISE EXCEPTION
      'Every player in the auction slot must have an Olympus registration';
  END IF;

  -- Captains and players already assigned to a franchise cannot be auctioned.
  IF EXISTS (
    SELECT 1
    FROM public.player_registrations pr
    JOIN public.franchise_members fm
      ON fm.roll_number = pr.roll_number
     AND fm.is_active = TRUE
    WHERE pr.roll_number = ANY(p_roll_numbers)
  ) THEN
    RAISE EXCEPTION
      'The auction list contains a player already assigned to a franchise';
  END IF;

  -- Remove any old prepared queue for this auction type.
  DELETE FROM public.auction_players
  WHERE auction_type = p_auction_type
    AND status IN ('current', 'upcoming');

  WITH input AS (
    SELECT
      trim(roll_number) AS roll_number,
      ordinality::INTEGER - 1 AS queue_order
    FROM unnest(p_roll_numbers)
      WITH ORDINALITY AS x(roll_number, ordinality)
  ),
  chosen AS (
    SELECT DISTINCT ON (i.roll_number)
      pr.id AS registration_id,
      i.queue_order
    FROM input i
    JOIN public.player_registrations pr
      ON pr.roll_number = i.roll_number
    ORDER BY i.roll_number, pr.created_at DESC
  )
  INSERT INTO public.auction_players (
    registration_id,
    base_price,
    status,
    sold_to_franchise_id,
    sold_price,
    sold_at,
    queue_order,
    auction_type
  )
  SELECT
    registration_id,
    v_config.base_price,
    'upcoming',
    NULL,
    NULL,
    NULL,
    queue_order,
    p_auction_type
  FROM chosen
  ON CONFLICT (registration_id) DO UPDATE
  SET
    base_price = EXCLUDED.base_price,
    status = 'upcoming',
    sold_to_franchise_id = NULL,
    sold_price = NULL,
    sold_at = NULL,
    queue_order = EXCLUDED.queue_order,
    auction_type = EXCLUDED.auction_type;

  UPDATE public.auction_config
  SET current_player_id = NULL,
      status = 'retention',
      round_ends_at = NULL
  WHERE id = v_config.id;

  RETURN v_expected;
END;
$function$;

REVOKE ALL
ON FUNCTION public.auction_load_slot_by_rolls(TEXT[], TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.auction_load_slot_by_rolls(TEXT[], TEXT)
TO authenticated;


-- auction_start now starts ONLY an explicitly loaded slot.
CREATE OR REPLACE FUNCTION public.auction_start()
RETURNS public.auction_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
  JOIN public.player_registrations pr
    ON pr.id = ap.registration_id
  WHERE ap.status = 'upcoming'
    AND NOT EXISTS (
      SELECT 1
      FROM public.franchise_members fm
      WHERE fm.roll_number = pr.roll_number
        AND fm.is_active = TRUE
    )
  ORDER BY ap.queue_order, ap.created_at, ap.id
  LIMIT 1
  FOR UPDATE OF ap;

  IF v_current_id IS NULL THEN
    RAISE EXCEPTION
      'No players have been loaded into the auction slot';
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
$function$;


COMMIT;
