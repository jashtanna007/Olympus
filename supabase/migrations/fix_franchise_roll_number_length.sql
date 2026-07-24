BEGIN;

ALTER TABLE public.franchise_members
  DROP CONSTRAINT IF EXISTS franchise_members_roll_number_format;

ALTER TABLE public.franchise_members
  ADD CONSTRAINT franchise_members_roll_number_format
  CHECK (roll_number ~ '^[0-9]{9,11}$');

COMMIT;
