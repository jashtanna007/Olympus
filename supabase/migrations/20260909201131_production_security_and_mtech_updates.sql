-- Production security fixes + M.Tech eligibility updates

BEGIN;

-- 1. Replace roll validation logic to use eligible_roll_numbers
CREATE OR REPLACE FUNCTION public.is_valid_roll_number(p_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_roll text;
BEGIN
  v_roll := split_part(p_email, '@', 1);

  IF v_roll !~ '^[0-9]+$' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.eligible_roll_numbers
    WHERE roll_number = v_roll
      AND active = true
  );
END;
$function$;


-- Update auth hook to use eligible_roll_numbers
CREATE OR REPLACE FUNCTION public.hook_restrict_olympus_test_batch(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  candidate_email text;
  candidate_roll bigint;
BEGIN

  candidate_email :=
    lower(trim(coalesce(event->'user'->>'email', '')));

  IF candidate_email !~ '^[0-9]{9,11}@(diu\.)?iiitvadodara\.ac\.in$'
  THEN
    RETURN jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message',
        'Use an eligible IIIT Vadodara institute Google account.'
      )
    );
  END IF;

  candidate_roll :=
    split_part(candidate_email, '@', 1)::bigint;

  IF NOT EXISTS (
    SELECT 1
    FROM public.eligible_roll_numbers
    WHERE roll_number = candidate_roll::text
      AND active = true
  )
  THEN
    RETURN jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message',
        'Your roll number is not in the approved list. Contact the administrators.'
      )
    );
  END IF;

  RETURN '{}'::jsonb;

END;
$function$;


-- 2. Remove public visibility of roll ranges
DROP POLICY IF EXISTS "roll_ranges_select_all"
ON public.allowed_roll_ranges;


-- 3. Profiles security
DROP POLICY IF EXISTS "profiles_select_all"
ON public.profiles;

DROP POLICY IF EXISTS "users_can_view_own_profile"
ON public.profiles;

CREATE POLICY "users_can_view_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

DROP POLICY IF EXISTS "admins_can_view_all_profiles"
ON public.profiles;

CREATE POLICY "admins_can_view_all_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_user_role() = 'admin'
);


-- 4. Add player photo read policy
DROP POLICY IF EXISTS "Authenticated users can read player photos"
ON storage.objects;

CREATE POLICY "Authenticated users can read player photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'olympus-assets'
  AND name LIKE 'player-photos/%'
);


-- 5. Add M.Tech eligible roll numbers

INSERT INTO public.eligible_roll_numbers (roll_number, active)
VALUES
('20252603001', true),
('20252603002', true),
('20252603003', true),
('20252603004', true),
('20252603005', true),
('20252603006', true),
('20252603007', true),
('20252603008', true),
('20252603009', true),
('20252603010', true),
('20252603011', true),

('20262603001', true),
('20262603002', true),
('20262603003', true),
('20262603004', true),
('20262603005', true),
('20262603006', true),
('20262603007', true),
('20262603008', true),
('20262603009', true),
('20262603010', true),
('20262603011', true),
('20262603012', true),
('20262603013', true),
('20262603014', true),
('20262603015', true),
('20262603016', true)

ON CONFLICT (roll_number) DO NOTHING;


COMMIT;