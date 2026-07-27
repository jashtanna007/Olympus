-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Add gender column to player_registrations     ║
-- ╚══════════════════════════════════════════════════════════╝

ALTER TABLE player_registrations
  ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'Male'
  CONSTRAINT player_registrations_gender_value
    CHECK (gender IN ('Male', 'Female'));
