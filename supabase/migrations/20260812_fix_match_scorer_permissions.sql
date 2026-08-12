-- OLYMPUS — Align match scorer permissions with application roles.
-- Safe corrective migration: no table or match-data changes.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_match_scorer(
  p_match_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_assigned UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role
  INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Admin may score every match.
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Only the dedicated scorer role may use an assignment.
  IF v_role <> 'scorer' THEN
    RETURN FALSE;
  END IF;

  SELECT assigned_scorer_id
  INTO v_assigned
  FROM public.matches
  WHERE id = p_match_id;

  RETURN
    v_assigned IS NOT NULL
    AND v_assigned = auth.uid();
END;
$$;


CREATE OR REPLACE FUNCTION public.list_match_scorers()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p.id,
    p.email,
    p.role
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.id = auth.uid()
      AND me.role = 'admin'
  )
    AND p.role IN ('scorer', 'admin')
  ORDER BY p.email;
$$;


REVOKE ALL
ON FUNCTION public.is_match_scorer(UUID)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.list_match_scorers()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_match_scorer(UUID)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.list_match_scorers()
TO authenticated;

COMMIT;
