-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Auction System Tables                         ║
-- ║  Run in Supabase SQL Editor                              ║
-- ╚══════════════════════════════════════════════════════════╝

BEGIN;

-- ============================================================
-- 1. AUCTION CONFIG  (singleton — one row controls the auction)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auction_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_budget      INTEGER NOT NULL DEFAULT 10000,
  base_price        INTEGER NOT NULL DEFAULT 200,
  bid_increment     INTEGER NOT NULL DEFAULT 50,
  status            TEXT NOT NULL DEFAULT 'setup'
                      CHECK (status IN ('setup', 'retention', 'live', 'paused', 'completed')),
  gender_mode       TEXT NOT NULL DEFAULT 'Male'
                      CHECK (gender_mode IN ('Male', 'Female')),
  current_player_id UUID,  -- FK added after auction_players exists
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. AUCTION PLAYERS  (queue of players for the auction)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auction_players (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id   UUID NOT NULL REFERENCES public.player_registrations(id) ON DELETE CASCADE,
  base_price        INTEGER NOT NULL DEFAULT 200,
  status            TEXT NOT NULL DEFAULT 'upcoming'
                      CHECK (status IN ('upcoming', 'current', 'sold', 'unsold', 'retained')),
  sold_to_franchise_id UUID REFERENCES public.franchises(id) ON DELETE SET NULL,
  sold_price        INTEGER,
  sold_at           TIMESTAMPTZ,
  queue_order       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT auction_players_registration_unique UNIQUE (registration_id)
);

-- Add FK from auction_config to auction_players
ALTER TABLE public.auction_config
  ADD CONSTRAINT auction_config_current_player_fk
  FOREIGN KEY (current_player_id)
  REFERENCES public.auction_players(id)
  ON DELETE SET NULL;

-- ============================================================
-- 3. AUCTION BIDS  (bid history per player)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_player_id UUID NOT NULL REFERENCES public.auction_players(id) ON DELETE CASCADE,
  franchise_id      UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  amount            INTEGER NOT NULL CHECK (amount > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auction_bids_player_idx ON public.auction_bids (auction_player_id);
CREATE INDEX IF NOT EXISTS auction_bids_franchise_idx ON public.auction_bids (franchise_id);
CREATE INDEX IF NOT EXISTS auction_players_status_idx ON public.auction_players (status);

-- ============================================================
-- 4. ADD BUDGET COLUMNS TO FRANCHISES
-- ============================================================
ALTER TABLE public.franchises
  ADD COLUMN IF NOT EXISTS total_budget    INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS spent_amount    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retained_count  INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 5. AUTO-UPDATE updated_at ON auction_config
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_auction_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER auction_config_set_updated_at
  BEFORE UPDATE ON public.auction_config
  FOR EACH ROW
  EXECUTE FUNCTION public.set_auction_config_updated_at();

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.auction_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- Everyone can READ auction data (it's a live spectator event)
CREATE POLICY "Anyone can view auction config"
  ON public.auction_config FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Anyone can view auction players"
  ON public.auction_players FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Anyone can view auction bids"
  ON public.auction_bids FOR SELECT TO authenticated USING (TRUE);

-- Only service_role (admin) can modify
REVOKE ALL ON public.auction_config FROM authenticated;
REVOKE ALL ON public.auction_players FROM authenticated;
REVOKE ALL ON public.auction_bids FROM authenticated;

GRANT SELECT ON public.auction_config TO authenticated;
GRANT SELECT ON public.auction_players TO authenticated;
GRANT SELECT ON public.auction_bids TO authenticated;

GRANT ALL ON public.auction_config TO service_role;
GRANT ALL ON public.auction_players TO service_role;
GRANT ALL ON public.auction_bids TO service_role;

-- ============================================================
-- 7. ENABLE REALTIME on auction tables (Idempotent)
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_config;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_players;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
END $$;

-- ============================================================
-- 8. SEED: Insert default auction config row
-- ============================================================
INSERT INTO public.auction_config (total_budget, base_price, bid_increment, status, gender_mode)
VALUES (10000, 200, 50, 'setup', 'Male')
ON CONFLICT DO NOTHING;

COMMIT;
