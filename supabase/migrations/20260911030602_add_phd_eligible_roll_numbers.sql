INSERT INTO public.eligible_roll_numbers (roll_number, active)

SELECT generate_series(202492001, 202492002)::text, true

UNION ALL

SELECT generate_series(202491001, 202491007)::text, true

UNION ALL

SELECT generate_series(20252701001, 20252701006)::text, true

UNION ALL

SELECT generate_series(20252731001, 20252731003)::text, true

ON CONFLICT (roll_number) DO UPDATE
SET active = true;