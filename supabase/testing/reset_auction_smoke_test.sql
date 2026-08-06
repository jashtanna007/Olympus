-- DESTRUCTIVE SMOKE-TEST RESET FOR THE CURRENT OLYMPUS TEST DATA ONLY.
-- Run manually in Supabase SQL Editor. Do not include this file in production migrations.
-- It backs up existing auction rows, then queues only rolls 202411005 and 202411074.
-- Active franchise leaders, including roll 202411046, are intentionally excluded.

BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.auction_config) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one auction_config row';
  END IF;

  IF (
    SELECT count(*)
    FROM public.player_registrations
    WHERE roll_number IN ('202411005', '202411074')
  ) <> 2 THEN
    RAISE EXCEPTION 'Expected test registrations 202411005 and 202411074';
  END IF;
END;
$$;

CREATE SCHEMA IF NOT EXISTS auction_test_backup;
REVOKE ALL ON SCHEMA auction_test_backup FROM PUBLIC, anon, authenticated;

DROP TABLE IF EXISTS auction_test_backup.auction_config_before_smoke;
DROP TABLE IF EXISTS auction_test_backup.auction_players_before_smoke;
DROP TABLE IF EXISTS auction_test_backup.auction_bids_before_smoke;
DROP TABLE IF EXISTS auction_test_backup.franchises_before_smoke;
DROP TABLE IF EXISTS auction_test_backup.franchise_players_before_smoke;

CREATE TABLE auction_test_backup.auction_config_before_smoke AS
TABLE public.auction_config;

CREATE TABLE auction_test_backup.auction_players_before_smoke AS
TABLE public.auction_players;

CREATE TABLE auction_test_backup.auction_bids_before_smoke AS
TABLE public.auction_bids;

CREATE TABLE auction_test_backup.franchises_before_smoke AS
TABLE public.franchises;

CREATE TABLE auction_test_backup.franchise_players_before_smoke AS
SELECT *
FROM public.franchise_members
WHERE role = 'player';

DELETE FROM public.auction_bids;
DELETE FROM public.auction_players;

DELETE FROM public.franchise_members
WHERE role = 'player'
  AND roll_number IN ('202411005', '202411074');

UPDATE public.franchises
SET spent_amount = 0,
    retained_count = 0;

WITH test_players AS (
  SELECT
    id,
    row_number() OVER (ORDER BY roll_number) - 1 AS queue_order
  FROM public.player_registrations
  WHERE roll_number IN ('202411005', '202411074')
    AND NOT EXISTS (
      SELECT 1
      FROM public.franchise_members fm
      WHERE fm.roll_number = player_registrations.roll_number
        AND fm.role = 'leader'
        AND fm.is_active = TRUE
    )
), inserted AS (
  INSERT INTO public.auction_players (
    registration_id,
    base_price,
    status,
    queue_order
  )
  SELECT
    id,
    200,
    CASE WHEN queue_order = 0 THEN 'current' ELSE 'upcoming' END,
    queue_order
  FROM test_players
  RETURNING id, status
)
UPDATE public.auction_config
SET total_budget = 10000,
    base_price = 200,
    bid_increment = 50,
    gender_mode = 'Male',
    status = 'live',
    current_player_id = (
      SELECT id
      FROM inserted
      WHERE status = 'current'
      LIMIT 1
    );

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT
  ap.status,
  pr.full_name,
  pr.roll_number,
  ap.base_price,
  ap.queue_order,
  (ap.id = ac.current_player_id) AS selected_by_config
FROM public.auction_players ap
JOIN public.player_registrations pr ON pr.id = ap.registration_id
CROSS JOIN public.auction_config ac
ORDER BY ap.queue_order;
