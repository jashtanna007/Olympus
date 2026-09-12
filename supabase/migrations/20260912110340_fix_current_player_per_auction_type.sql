BEGIN;

-- The original auction supported only one session, so it allowed
-- only one current player globally.
--
-- Olympus now has three independent auctions:
--   franchise        = All
--   female_football
--   female_cricket
--
-- Each auction may therefore have its own current player.

DROP INDEX IF EXISTS public.auction_players_one_current_idx;

CREATE UNIQUE INDEX IF NOT EXISTS auction_players_one_current_per_type_idx
ON public.auction_players (auction_type)
WHERE status = 'current';

COMMIT;
