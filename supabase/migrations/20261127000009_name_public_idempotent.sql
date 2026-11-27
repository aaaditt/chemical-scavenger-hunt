-- Security review of 8: calling set_name_public with the value a player already has re-ran the prefix swap, so a
-- crafted display name (e.g. "Lab 0001 Evil") could be repeated into their own feed lines on every call.
-- Only rewrite the feed on an actual change, and refuse display names that imitate an opted-out lab label.

create or replace function public.set_name_public(p_public boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  want boolean := coalesce(p_public, true);
begin
  select * into me from players where id = auth.uid() for update;
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'not_registered'); end if;
  if me.name_public = want then
    return jsonb_build_object('ok', true, 'name_public', me.name_public, 'public_name', _public_name(me));
  end if;
  update players set name_public = want where id = me.id returning * into me;
  if me.name_public then
    update feed set message = _swap_prefix(message, 'Lab ' || _lab_no(me), me.display_name) where player = me.id;
  else
    update feed set message = _swap_prefix(message, me.display_name, 'Lab ' || _lab_no(me)) where player = me.id;
  end if;
  return jsonb_build_object('ok', true, 'name_public', me.name_public, 'public_name', _public_name(me));
end $$;

create or replace function public.set_display_name(p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare nm text := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 24);
begin
  if length(nm) < 2 then return jsonb_build_object('ok', false, 'error', 'bad_name'); end if;
  -- "Lab 0248" is reserved for players who hid their name; don't let anyone pose as one.
  if nm ~* '^lab\s*[0-9a-f]{4}' then return jsonb_build_object('ok', false, 'error', 'bad_name'); end if;
  update players set display_name = nm where id = auth.uid();
  return jsonb_build_object('ok', true, 'display_name', nm);
end $$;

revoke execute on function public.set_name_public(boolean), public.set_display_name(text) from public, anon;
grant execute on function public.set_name_public(boolean), public.set_display_name(text) to authenticated;
