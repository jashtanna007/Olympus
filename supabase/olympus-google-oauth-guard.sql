-- Olympus test-batch signup restriction.
-- Run this in the Supabase SQL Editor.
-- After running it, enable this function as the
-- "Before User Created" Auth Hook in the Supabase dashboard.

create or replace function public.hook_restrict_olympus_test_batch(
  event jsonb
)
returns jsonb
language plpgsql
as $$
declare
  candidate_email text;
  candidate_roll_text text;
  candidate_roll bigint;
begin
  candidate_email :=
    lower(coalesce(event->'user'->>'email', ''));

  if candidate_email !~
    '^[0-9]{9}@diu\.iiitvadodara\.ac\.in$'
  then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code',
        403,
        'message',
        'Use an eligible IIIT Vadodara institute Google account.'
      )
    );
  end if;

  candidate_roll_text :=
    split_part(candidate_email, '@', 1);

  candidate_roll := candidate_roll_text::bigint;

  if candidate_roll < 202411001
    or candidate_roll > 202411102
  then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code',
        403,
        'message',
        'This roll number is not enabled during the current testing phase.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute
on function public.hook_restrict_olympus_test_batch(jsonb)
to supabase_auth_admin;

revoke execute
on function public.hook_restrict_olympus_test_batch(jsonb)
from authenticated, anon, public;
