BEGIN;

INSERT INTO public.franchises (
  name,
  slug,
  short_code,
  logo_path,
  primary_color,
  secondary_color,
  pool,
  display_order,
  is_active
)
VALUES
  ('Ocean Giants',    'ocean-giants',    'OG', '/franchise-logos/ocean-giants.webp',    '#FFFFFF', '#06B6D4', NULL, 1, TRUE),
  ('Deccan Knights',  'deccan-knights',  'DK', '/franchise-logos/deccan-knights.webp',  '#111111', '#D4AF37', NULL, 2, TRUE),
  ('Spartan Vortex',  'spartan-vortex',  'SV', '/franchise-logos/spartan-vortex.webp',  '#0F2747', '#C0C0C0', NULL, 3, TRUE),
  ('Shadow Warrior',  'shadow-warrior',  'SW', '/franchise-logos/shadow-warrior.webp',  '#6B7280', '#DC2626', NULL, 4, TRUE),
  ('Phoenix Clan',    'phoenix-clan',    'PC', '/franchise-logos/phoenix-clan.webp',    '#DC143C', '#D4AF37', NULL, 5, TRUE),
  ('Desert Fighters', 'desert-fighters', 'DF', '/franchise-logos/desert-fighters.webp', '#EAB308', '#92400E', NULL, 6, TRUE),
  ('Trident Titans',  'trident-titans',  'TT', '/franchise-logos/trident-titans.webp',  '#B91C1C', '#D4AF37', NULL, 7, TRUE),
  ('Fiery Falcons',   'fiery-falcons',   'FF', '/franchise-logos/fiery-falcons.webp',   '#F97316', '#0A0A0A', NULL, 8, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_code = EXCLUDED.short_code,
  logo_path = EXCLUDED.logo_path,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  pool = EXCLUDED.pool,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.franchise_members (
  franchise_id,
  full_name,
  roll_number,
  role,
  display_order,
  is_active
)
SELECT
  f.id,
  seed.full_name,
  seed.roll_number,
  'leader',
  0,
  TRUE
FROM (
  VALUES
    ('ocean-giants',    'Vikas Gurjar',    '202411042'),
    ('deccan-knights',  'AZMEERA ROHITH',  '202411014'),
    ('spartan-vortex',  'Kunal Roy',       '20252651031'),
    ('shadow-warrior',  'Akansh Yadav',    '20252504003'),
    ('phoenix-clan',    'JADHAV KARTHIK',  '202411045'),
    ('desert-fighters', 'Khemraj Sharma',  '202492001'),
    ('trident-titans',  'Kishan N Prasad', '202411054'),
    ('fiery-falcons',   'Jash Tanna',      '202411046')
) AS seed(slug, full_name, roll_number)
JOIN public.franchises f
  ON f.slug = seed.slug
ON CONFLICT (roll_number) DO UPDATE SET
  franchise_id = EXCLUDED.franchise_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMIT;
