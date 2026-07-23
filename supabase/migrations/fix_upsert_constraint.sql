-- Run this in Supabase SQL Editor to fix the existing table
-- (Only needed if UNIQUE constraint is missing from the live table)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'player_registrations'::regclass
    AND contype = 'u'
    AND conname = 'player_registrations_user_id_key'
  ) THEN
    ALTER TABLE player_registrations ADD CONSTRAINT player_registrations_user_id_key UNIQUE (user_id);
  END IF;
END;
$$;

-- Also verify the UPDATE policy exists (upsert needs it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'player_registrations'
    AND policyname = 'Users can update own registration'
  ) THEN
    CREATE POLICY "Users can update own registration"
      ON player_registrations FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

SELECT 'Done! player_registrations table is ready for upsert.' AS status;
