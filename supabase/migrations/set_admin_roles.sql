-- ╔══════════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Set admin roles for specific roll numbers         ║
-- ║                                                              ║
-- ║  Roll numbers granted admin:                                 ║
-- ║    20241005   → 20241005@diu.iiitvadodara.ac.in             ║
-- ║    202411075  → 202411075@diu.iiitvadodara.ac.in            ║
-- ║                                                              ║
-- ║  All other users default to 'viewer' (set on first login     ║
-- ║  by AuthContext.fetchUserRole).                              ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Upsert admin profiles for users who have already logged in.
-- (If they haven't logged in yet, the profile row doesn't exist yet —
--  the second query below handles that via a trigger-based approach.)
INSERT INTO public.profiles (id, email, role)
SELECT
  u.id,
  u.email,
  'admin'
FROM auth.users u
WHERE u.email IN (
  '20241005@diu.iiitvadodara.ac.in',
  '202411075@diu.iiitvadodara.ac.in'
)
ON CONFLICT (id) DO UPDATE
  SET role = 'admin';

-- ── For users who log in AFTER this migration ─────────────────────
-- AuthContext creates a viewer profile on first login. We need their
-- profile to be 'admin' instead. The cleanest way: a DB function
-- that the auth trigger (or our code) can call, but since we can't
-- touch auth triggers easily, we store the admin roll numbers in a
-- lightweight table and override the role in fetchUserRole.
--
-- Simpler: just store a list of admin emails and check at profile creation.
-- We do this by updating profiles whenever they are created for these emails.

CREATE TABLE IF NOT EXISTS public.admin_emails (
  email TEXT PRIMARY KEY
);

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Only the trigger function (SECURITY DEFINER) reads this table internally.
-- No direct client access needed.
DROP POLICY IF EXISTS "No direct client access to admin_emails" ON public.admin_emails;
CREATE POLICY "No direct client access to admin_emails"
  ON public.admin_emails FOR SELECT TO authenticated USING (false);

INSERT INTO public.admin_emails (email) VALUES
  ('20241005@diu.iiitvadodara.ac.in'),
  ('202411075@diu.iiitvadodara.ac.in')
ON CONFLICT DO NOTHING;

-- Function: called by trigger on profiles INSERT to auto-elevate admins
CREATE OR REPLACE FUNCTION public.auto_elevate_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_emails WHERE email = NEW.email) THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_auto_elevate_admin ON public.profiles;
CREATE TRIGGER profiles_auto_elevate_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_elevate_admin_role();

-- Grant read access to admin_emails for the trigger function
GRANT SELECT ON public.admin_emails TO authenticated;
