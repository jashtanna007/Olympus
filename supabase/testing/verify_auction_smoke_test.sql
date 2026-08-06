-- Run after exercising bids and marking the first player SOLD in the UI.

-- 1. Core invariant: exactly one current player while live.
SELECT
  ac.status AS auction_status,
  ac.current_player_id,
  count(*) FILTER (WHERE ap.status = 'current') AS current_player_rows,
  count(*) FILTER (WHERE ap.status = 'upcoming') AS upcoming_rows,
  count(*) FILTER (WHERE ap.status = 'sold') AS sold_rows,
  count(*) FILTER (WHERE ap.status = 'unsold') AS unsold_rows
FROM public.auction_config ac
LEFT JOIN public.auction_players ap ON TRUE
GROUP BY ac.status, ac.current_player_id;

-- 2. Bid sequence validation. invalid_step must be false for every row.
WITH ordered_bids AS (
  SELECT
    ab.auction_player_id,
    ab.amount,
    ab.franchise_id,
    ab.created_at,
    lag(ab.amount) OVER (
      PARTITION BY ab.auction_player_id
      ORDER BY ab.created_at, ab.id
    ) AS previous_amount,
    ap.base_price
  FROM public.auction_bids ab
  JOIN public.auction_players ap ON ap.id = ab.auction_player_id
)
SELECT
  auction_player_id,
  previous_amount,
  amount,
  CASE
    WHEN previous_amount IS NULL THEN amount <> base_price
    WHEN previous_amount < 500 THEN amount <> previous_amount + 50
    ELSE amount <> previous_amount + 100
  END AS invalid_step
FROM ordered_bids
ORDER BY auction_player_id, created_at;

-- 3. Sold player must match the franchise roster by roll number.
SELECT
  pr.full_name,
  pr.roll_number,
  ap.status,
  ap.sold_price,
  f.name AS sold_to_franchise,
  fm.full_name AS roster_name,
  fm.role AS roster_role,
  fm.franchise_id = ap.sold_to_franchise_id AS roster_franchise_matches
FROM public.auction_players ap
JOIN public.player_registrations pr ON pr.id = ap.registration_id
LEFT JOIN public.franchises f ON f.id = ap.sold_to_franchise_id
LEFT JOIN public.franchise_members fm ON fm.roll_number = pr.roll_number
ORDER BY ap.queue_order;

-- 4. Spreadsheet/summary source rows.
SELECT
  f.display_order,
  f.name AS franchise,
  leader.full_name AS leader,
  pr.full_name AS player,
  pr.roll_number,
  ap.status,
  ap.sold_price,
  f.spent_amount,
  f.total_budget - f.spent_amount AS purse_remaining
FROM public.franchises f
LEFT JOIN public.franchise_members leader
  ON leader.franchise_id = f.id
 AND leader.role = 'leader'
 AND leader.is_active = TRUE
LEFT JOIN public.auction_players ap
  ON ap.sold_to_franchise_id = f.id
 AND ap.status IN ('sold', 'retained')
LEFT JOIN public.player_registrations pr
  ON pr.id = ap.registration_id
ORDER BY f.display_order, ap.sold_at, pr.full_name;
