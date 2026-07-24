BEGIN;

-- ============================================================
-- FRANCHISES
-- Permanent information for each franchise during this fest.
-- Logo files remain in the website's public/franchise-logos folder.
-- ============================================================

CREATE TABLE public.franchises (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  short_code        TEXT NOT NULL,
  logo_path         TEXT NOT NULL,
  primary_color     TEXT,
  secondary_color   TEXT,
  pool              TEXT,
  display_order     SMALLINT NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT franchises_name_not_blank
    CHECK (length(trim(name)) > 0),

  CONSTRAINT franchises_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

  CONSTRAINT franchises_short_code_format
    CHECK (short_code ~ '^[A-Z0-9]{2,6}$'),

  CONSTRAINT franchises_logo_path_not_blank
    CHECK (length(trim(logo_path)) > 0),

  CONSTRAINT franchises_primary_color_format
    CHECK (
      primary_color IS NULL
      OR primary_color ~ '^#[0-9A-Fa-f]{6}$'
    ),

  CONSTRAINT franchises_secondary_color_format
    CHECK (
      secondary_color IS NULL
      OR secondary_color ~ '^#[0-9A-Fa-f]{6}$'
    ),

  CONSTRAINT franchises_pool_value
    CHECK (pool IS NULL OR pool IN ('A', 'B')),

  CONSTRAINT franchises_display_order_non_negative
    CHECK (display_order >= 0),

  CONSTRAINT franchises_slug_unique
    UNIQUE (slug),

  CONSTRAINT franchises_short_code_unique
    UNIQUE (short_code)
);

CREATE UNIQUE INDEX franchises_name_case_insensitive_unique
  ON public.franchises (lower(trim(name)));

CREATE UNIQUE INDEX franchises_display_order_unique
  ON public.franchises (display_order);


-- ============================================================
-- FRANCHISE MEMBERS
-- Contains both leaders and players.
-- Email is generated automatically from the roll number.
-- ============================================================

CREATE TABLE public.franchise_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id      UUID NOT NULL
                      REFERENCES public.franchises(id)
                      ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  roll_number       TEXT NOT NULL,
  institute_email   TEXT GENERATED ALWAYS AS (
                      lower(roll_number || '@diu.iiitvadodara.ac.in')
                    ) STORED,
  role              TEXT NOT NULL DEFAULT 'player',
  display_order     SMALLINT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT franchise_members_name_not_blank
    CHECK (length(trim(full_name)) > 0),

  CONSTRAINT franchise_members_roll_number_format
    CHECK (roll_number ~ '^[0-9]{9,11}$'),

  CONSTRAINT franchise_members_role_value
    CHECK (role IN ('leader', 'player')),

  CONSTRAINT franchise_members_display_order_non_negative
    CHECK (display_order >= 0),

  CONSTRAINT franchise_members_roll_number_unique
    UNIQUE (roll_number)
);

CREATE INDEX franchise_members_franchise_id_idx
  ON public.franchise_members (franchise_id);

CREATE INDEX franchise_members_institute_email_idx
  ON public.franchise_members (institute_email);

CREATE INDEX franchise_members_role_idx
  ON public.franchise_members (role);

-- Only one active leader is allowed per franchise.
CREATE UNIQUE INDEX franchise_members_one_active_leader_per_franchise
  ON public.franchise_members (franchise_id)
  WHERE role = 'leader' AND is_active = TRUE;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_franchise_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER franchises_set_updated_at
  BEFORE UPDATE ON public.franchises
  FOR EACH ROW
  EXECUTE FUNCTION public.set_franchise_updated_at();

CREATE TRIGGER franchise_members_set_updated_at
  BEFORE UPDATE ON public.franchise_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_franchise_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- Frontend users may read franchise and roster information.
-- Inserts/updates will initially be performed through SQL/admin.
-- ============================================================

ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchise_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view franchises"
  ON public.franchises
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can view franchise members"
  ON public.franchise_members
  FOR SELECT
  TO authenticated
  USING (TRUE);

REVOKE ALL ON public.franchises FROM anon;
REVOKE ALL ON public.franchise_members FROM anon;
REVOKE ALL ON public.franchises FROM authenticated;
REVOKE ALL ON public.franchise_members FROM authenticated;

GRANT SELECT ON public.franchises TO authenticated;
GRANT SELECT ON public.franchise_members TO authenticated;

GRANT ALL ON public.franchises TO service_role;
GRANT ALL ON public.franchise_members TO service_role;

COMMIT;
