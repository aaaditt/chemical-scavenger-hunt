-- Security review of 9: the "Lab NNNN" reservation only ran in set_display_name, so signup (_create_player) and
-- admin_rename skipped it, and look-alike characters (full-width, zero-width) could slip past the regex.
-- One BEFORE trigger on players.display_name now guards every path: normalize, strip invisible format
-- characters, then reject (or, at signup, replace) names that pose as an opted-out lab label.

create or replace function public._clean_name(n text) returns text
language sql immutable set search_path = public as $$
  select regexp_replace(
    regexp_replace(normalize(coalesce(n, ''), NFKC),
      -- soft hyphen, zero-width / bidi marks, word joiners, BOM
      '[' || chr(173) || chr(8203) || '-' || chr(8207) || chr(8234) || '-' || chr(8238) || chr(8288) || '-' || chr(8292) || chr(65279) || ']', '', 'g'),
    '\s+', ' ', 'g')
$$;

create or replace function public._is_lab_label(n text) returns boolean
language sql immutable set search_path = public as $$
  select trim(_clean_name(n)) ~* '^lab\s*[0-9a-f]{4}'
$$;

create or replace function public._guard_display_name() returns trigger
language plpgsql set search_path = public as $$
begin
  new.display_name := left(trim(_clean_name(new.display_name)), 32);
  if _is_lab_label(new.display_name) or length(new.display_name) < 2 then
    if tg_op = 'INSERT' then
      new.display_name := 'Player ' || upper(left(replace(new.id::text, '-', ''), 4));  -- never block a signup
    else
      raise exception 'bad_name' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists players_guard_display_name on public.players;
create trigger players_guard_display_name
  before insert or update of display_name on public.players
  for each row execute function public._guard_display_name();

-- set_display_name keeps returning a friendly error instead of surfacing the trigger exception.
create or replace function public.set_display_name(p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare nm text := left(trim(_clean_name(p_name)), 24);
begin
  if length(nm) < 2 or _is_lab_label(nm) then return jsonb_build_object('ok', false, 'error', 'bad_name'); end if;
  update players set display_name = nm where id = auth.uid();
  return jsonb_build_object('ok', true, 'display_name', nm);
end $$;

revoke execute on function public._clean_name(text), public._is_lab_label(text), public._guard_display_name()
  from public, anon, authenticated;
revoke execute on function public.set_display_name(text) from public, anon;
grant execute on function public.set_display_name(text) to authenticated;
