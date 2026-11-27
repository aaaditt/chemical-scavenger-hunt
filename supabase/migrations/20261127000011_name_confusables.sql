-- Security review of 10: Cyrillic/Greek homoglyphs, combining marks and blank-looking characters could still
-- spell a fake "Lab 0248" label. Fold the common confusables for the label's alphabet (L, a, b, 0-9, a-f) to
-- Latin, drop combining marks (U+0300–036F), and treat Hangul/Braille blanks as spaces before the check.
-- Residual risk (accepted, documented): exotic confusables can still mimic an ANONYMOUS label; that reveals no data.

create or replace function public._name_skeleton(n text) returns text
language sql immutable set search_path = public as $$
  select translate(lower(
    regexp_replace(
      regexp_replace(normalize(_clean_name(n), NFKD), '[' || chr(768) || '-' || chr(879) || ']', '', 'g'),        -- combining marks
      '[' || chr(12644) || chr(10240) || chr(4447) || chr(4448) || chr(65440) || ']', ' ', 'g')),  -- Hangul/Braille blanks
    -- Cyrillic/Greek/script look-alikes -> Latin; O-shaped letters -> digit 0 (the label tail is hex)
    'АаВЕеОоСсРрХхЬьӀӏІіΑαΒβΕεΟοΙιɑƖℓ',
    'aabee00ccppxxbblliiaabbee00iiall')
$$;

create or replace function public._is_lab_label(n text) returns boolean
language sql immutable set search_path = public as $$
  select trim(_name_skeleton(n)) ~ '^\s*[l1i|]\s*a\s*b\s*[0-9a-floi|]{4}'
      or trim(_clean_name(n)) ~* '^lab\s*[0-9a-f]{4}'
$$;

revoke execute on function public._name_skeleton(text), public._is_lab_label(text) from public, anon, authenticated;
