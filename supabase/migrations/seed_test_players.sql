-- ╔══════════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — TEST SEED: Players for match testing              ║
-- ║                                                              ║
-- ║  11 players for Ocean Giants, 11 for Deccan Knights.         ║
-- ║  Each player is registered for Cricket, Football, Volleyball.║
-- ║                                                              ║
-- ║  Strategy: temporarily drops the FK from player_registrations║
-- ║  to auth.users so we can insert with fake UUIDs without      ║
-- ║  triggering the roll-number validation on auth.users.        ║
-- ║  FK is restored at the end.                                  ║
-- ╚══════════════════════════════════════════════════════════════╝

BEGIN;

-- ── 1. Drop the FK so we can insert without real auth.users rows ──
ALTER TABLE public.player_registrations
  DROP CONSTRAINT IF EXISTS player_registrations_user_id_fkey;

-- ── 2. Insert player registrations ────────────────────────────────
-- Stable fake UUIDs (00000001-…) so re-running is idempotent.
INSERT INTO public.player_registrations
  (id, user_id, full_name, email, roll_number, phone, branch, year, photo_url, sports)
VALUES
  -- ── Ocean Giants (OG) ──
  ('a0000001-0000-0000-0000-000000000001','f0000001-0000-0000-0000-000000000001',
   'Arjun Mehta',    'og01@test.local','202411060','9000000001','CSE','3','',
   '[{"name":"Cricket","position":"Batsman","skill_level":"Advanced"},{"name":"Football","position":"Forward","skill_level":"Intermediate"}]'),

  ('a0000001-0000-0000-0000-000000000002','f0000001-0000-0000-0000-000000000002',
   'Rohit Sharma',   'og02@test.local','202411061','9000000002','CSE','3','',
   '[{"name":"Cricket","position":"All-Rounder","skill_level":"Advanced"},{"name":"Volleyball","position":"Setter","skill_level":"Beginner"}]'),

  ('a0000001-0000-0000-0000-000000000003','f0000001-0000-0000-0000-000000000003',
   'Priya Patel',    'og03@test.local','202411062','9000000003','ECE','2','',
   '[{"name":"Cricket","position":"Bowler","skill_level":"Intermediate"},{"name":"Badminton","position":null,"skill_level":"Intermediate"}]'),

  ('a0000001-0000-0000-0000-000000000004','f0000001-0000-0000-0000-000000000004',
   'Kiran Reddy',    'og04@test.local','202411063','9000000004','MECH','2','',
   '[{"name":"Cricket","position":"Wicket Keeper","skill_level":"Intermediate"},{"name":"Football","position":"Goalkeeper","skill_level":"Beginner"}]'),

  ('a0000001-0000-0000-0000-000000000005','f0000001-0000-0000-0000-000000000005',
   'Sneha Joshi',    'og05@test.local','202411064','9000000005','CSE','1','',
   '[{"name":"Cricket","position":"Batsman","skill_level":"Beginner"},{"name":"Volleyball","position":"Spiker","skill_level":"Beginner"}]'),

  ('a0000001-0000-0000-0000-000000000006','f0000001-0000-0000-0000-000000000006',
   'Vikram Singh',   'og06@test.local','202411065','9000000006','IT','3','',
   '[{"name":"Cricket","position":"Bowler","skill_level":"Advanced"},{"name":"Kabaddi","position":"Raider","skill_level":"Intermediate"}]'),

  ('a0000001-0000-0000-0000-000000000007','f0000001-0000-0000-0000-000000000007',
   'Ananya Nair',    'og07@test.local','202411066','9000000007','ECE','3','',
   '[{"name":"Cricket","position":"All-Rounder","skill_level":"Intermediate"},{"name":"Volleyball","position":"Libero","skill_level":"Intermediate"}]'),

  ('a0000001-0000-0000-0000-000000000008','f0000001-0000-0000-0000-000000000008',
   'Suresh Kumar',   'og08@test.local','202411067','9000000008','CSE','2','',
   '[{"name":"Cricket","position":"Batsman","skill_level":"Advanced"},{"name":"Football","position":"Midfielder","skill_level":"Intermediate"}]'),

  ('a0000001-0000-0000-0000-000000000009','f0000001-0000-0000-0000-000000000009',
   'Divya Menon',    'og09@test.local','202411068','9000000009','MECH','1','',
   '[{"name":"Cricket","position":"Bowler","skill_level":"Beginner"},{"name":"Football","position":"Defender","skill_level":"Beginner"}]'),

  ('a0000001-0000-0000-0000-000000000010','f0000001-0000-0000-0000-000000000010',
   'Arun Pillai',    'og10@test.local','202411069','9000000010','IT','2','',
   '[{"name":"Cricket","position":"Batsman","skill_level":"Intermediate"},{"name":"Chess","position":null,"skill_level":"Intermediate"}]'),

  ('a0000001-0000-0000-0000-000000000011','f0000001-0000-0000-0000-000000000011',
   'Meera Iyer',     'og11@test.local','202411070','9000000011','CSE','3','',
   '[{"name":"Cricket","position":"All-Rounder","skill_level":"Advanced"},{"name":"Volleyball","position":"Setter","skill_level":"Advanced"}]'),

  -- ── Deccan Knights (DK) ──
  ('a0000002-0000-0000-0000-000000000001','f0000002-0000-0000-0000-000000000001',
   'Rajesh Verma',   'dk01@test.local','202411071','9000000012','CSE','3','',
   '[{"name":"Cricket","position":"Batsman","skill_level":"Advanced"},{"name":"Football","position":"Defender","skill_level":"Advanced"}]'),

  ('a0000002-0000-0000-0000-000000000002','f0000002-0000-0000-0000-000000000002',
   'Pooja Sharma',   'dk02@test.local','202411072','9000000013','ECE','2','',
   '[{"name":"Cricket","position":"Bowler","skill_level":"Intermediate"},{"name":"Volleyball","position":"Setter","skill_level":"Intermediate"}]'),

  ('a0000002-0000-0000-0000-000000000003','f0000002-0000-0000-0000-000000000003',
   'Amit Gupta',     'dk03@test.local','202411073','9000000014','MECH','2','',
   '[{"name":"Cricket","position":"All-Rounder","skill_level":"Advanced"},{"name":"Kabaddi","position":"Raider","skill_level":"Advanced"}]'),

  ('a0000002-0000-0000-0000-000000000004','f0000002-0000-0000-0000-000000000004',
   'Nisha Kapoor',   'dk04@test.local','202411074','9000000015','IT','3','',
   '[{"name":"Cricket","position":"Wicket Keeper","skill_level":"Intermediate"},{"name":"Football","position":"Forward","skill_level":"Beginner"}]'),

  ('a0000002-0000-0000-0000-000000000005','f0000002-0000-0000-0000-000000000005',
   'Rahul Das',      'dk05@test.local','202411075','9000000016','CSE','1','',
   '[{"name":"Cricket","position":"Batsman","skill_level":"Beginner"},{"name":"Volleyball","position":"Spiker","skill_level":"Beginner"}]'),

  ('a0000002-0000-0000-0000-000000000006','f0000002-0000-0000-0000-000000000006',
   'Kavya Nair',     'dk06@test.local','202411076','9000000017','ECE','3','',
   '[{"name":"Cricket","position":"Bowler","skill_level":"Advanced"},{"name":"Volleyball","position":"Libero","skill_level":"Advanced"}]'),

  ('a0000002-0000-0000-0000-000000000007','f0000002-0000-0000-0000-000000000007',
   'Siddharth Rao',  'dk07@test.local','202411077','9000000018','MECH','2','',
   '[{"name":"Cricket","position":"All-Rounder","skill_level":"Intermediate"},{"name":"Football","position":"Midfielder","skill_level":"Intermediate"}]'),

  ('a0000002-0000-0000-0000-000000000008','f0000002-0000-0000-0000-000000000008',
   'Tanvi Desai',    'dk08@test.local','202411078','9000000019','IT','1','',
   '[{"name":"Cricket","position":"Batsman","skill_level":"Intermediate"},{"name":"Badminton","position":null,"skill_level":"Beginner"}]'),

  ('a0000002-0000-0000-0000-000000000009','f0000002-0000-0000-0000-000000000009',
   'Harsh Malhotra', 'dk09@test.local','202411079','9000000020','CSE','3','',
   '[{"name":"Cricket","position":"Bowler","skill_level":"Advanced"},{"name":"Football","position":"Forward","skill_level":"Intermediate"}]'),

  ('a0000002-0000-0000-0000-000000000010','f0000002-0000-0000-0000-000000000010',
   'Riya Chatterjee','dk10@test.local','202411080','9000000021','ECE','2','',
   '[{"name":"Cricket","position":"Batsman","skill_level":"Intermediate"},{"name":"Volleyball","position":"Blocker","skill_level":"Intermediate"}]'),

  ('a0000002-0000-0000-0000-000000000011','f0000002-0000-0000-0000-000000000011',
   'Dev Agarwal',    'dk11@test.local','202411081','9000000022','MECH','3','',
   '[{"name":"Cricket","position":"All-Rounder","skill_level":"Advanced"},{"name":"Football","position":"Midfielder","skill_level":"Advanced"}]')

ON CONFLICT (id) DO NOTHING;

-- ── 3. Restore the FK (referencing auth.users) ────────────────────
-- Rows with fake user_ids won't be queryable by auth, but all
-- match/squad logic only joins on player_registrations.id, not user_id.
ALTER TABLE public.player_registrations
  ADD CONSTRAINT player_registrations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
    NOT VALID;   -- NOT VALID skips checking existing rows, only validates future inserts

-- ── 4. Link to franchises via auction_players ─────────────────────
INSERT INTO public.auction_players (registration_id, sold_to_franchise_id, status, sold_price)
SELECT r.id,
       f.id,
       'sold',
       500000
FROM   public.player_registrations r
JOIN   public.franchises f ON (
         (r.roll_number BETWEEN '202411060' AND '202411070' AND f.slug = 'ocean-giants')
      OR (r.roll_number BETWEEN '202411071' AND '202411081' AND f.slug = 'deccan-knights')
       )
WHERE  r.id::text LIKE 'a000000%-0000-0000-0000-0000000000%'
ON CONFLICT (registration_id) DO UPDATE
  SET sold_to_franchise_id = EXCLUDED.sold_to_franchise_id,
      status               = 'sold';

COMMIT;
