-- ╔══════════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Production database cleanup                      ║
-- ║  Removes all test/dev data. Keeps franchise + leader data.  ║
-- ╚══════════════════════════════════════════════════════════════╝

BEGIN;

-- 1. Clear auction history
DELETE FROM public.auction_action_history;

-- 2. Clear bids
DELETE FROM public.auction_bids;

-- 3. Clear auction players
DELETE FROM public.auction_players;

-- 4. Clear player registrations
DELETE FROM public.player_registrations;

-- 5. Reset auction config to clean state
UPDATE public.auction_config
SET status = 'setup',
    current_player_id = NULL,
    round_ends_at = NULL;

-- 6. Reset franchise counters
UPDATE public.franchises
SET spent_amount = 0,
    retained_count = 0;

-- 7. Remove auction-created franchise members (keep leaders)
DELETE FROM public.franchise_members WHERE role <> 'leader';

-- 8. Clear any match data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public'
    AND table_name='match_players'
  ) THEN
    DELETE FROM public.match_players;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public'
    AND table_name='match_innings'
  ) THEN
    DELETE FROM public.match_innings;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public'
    AND table_name='matches'
  ) THEN
    DELETE FROM public.matches;
  END IF;
END $$;

COMMIT;
