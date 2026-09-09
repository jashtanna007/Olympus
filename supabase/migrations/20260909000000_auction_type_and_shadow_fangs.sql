-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Auction type separation + Shadow Fangs fix   ║
-- ╚══════════════════════════════════════════════════════════╝

BEGIN;

-- 1. Add auction_type to auction_players
--    'franchise'         → normal franchise-based auction (TT, Badminton, Chess, Carrom, Volleyball, Relay)
--    'girls_individual'  → girls-only Cricket / Football (no franchise bidding)
ALTER TABLE public.auction_players
  ADD COLUMN IF NOT EXISTS auction_type TEXT NOT NULL DEFAULT 'franchise'
    CHECK (auction_type IN ('franchise', 'girls_individual'));

-- 2. Ensure Shadow Fangs franchise row is correct
--    (handles case where DB still has old "Shadow Warriors" name)
UPDATE public.franchises
SET name       = 'Shadow Fangs',
    slug       = 'shadow-fangs',
    logo_path  = '/franchise-logos/shadow-fangs.webp',
    updated_at = now()
WHERE slug IN ('shadow-warrior', 'shadow-warriors', 'shadow-fangs')
  AND name IS DISTINCT FROM 'Shadow Fangs';

COMMIT;
