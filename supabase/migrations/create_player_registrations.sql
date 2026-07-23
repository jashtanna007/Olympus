-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Player Registration Table                     ║
-- ╚══════════════════════════════════════════════════════════╝

-- 1. Create the table
CREATE TABLE IF NOT EXISTS player_registrations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  roll_number   TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL,
  branch        TEXT NOT NULL,
  year          TEXT NOT NULL,
  photo_url     TEXT NOT NULL DEFAULT '', 
  sports        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One registration per user
  UNIQUE (user_id)
);

-- 2. Enable Row Level Security
ALTER TABLE player_registrations ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Users can read their own registration
CREATE POLICY "Users can view own registration"
  ON player_registrations FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Policy: Users can insert their own registration
CREATE POLICY "Users can insert own registration"
  ON player_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Policy: Users can update their own registration
CREATE POLICY "Users can update own registration"
  ON player_registrations FOR UPDATE
  USING (auth.uid() = user_id);

-- 6. Policy: Admins can read all registrations (for auction)
-- Uncomment and adjust if you have an admin role check function
-- CREATE POLICY "Admins can view all registrations"
--   ON player_registrations FOR SELECT
--   USING (is_admin(auth.uid()));

-- 7. Create storage bucket for player photos (if not exists)
-- Run this in the Supabase dashboard: Storage → New bucket → "olympus-assets" (public)

-- 8. Auto-update `updated_at` on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON player_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
-- EXAMPLE: What the `sports` JSONB column looks like:
-- [
--   { "name": "Cricket",    "position": "All-Rounder", "skill_level": "Advanced" },
--   { "name": "Chess",      "position": null,          "skill_level": "Intermediate" },
--   { "name": "Football",   "position": "Midfielder",  "skill_level": "Beginner" }
-- ]
-- ═══════════════════════════════════════════════════════════
