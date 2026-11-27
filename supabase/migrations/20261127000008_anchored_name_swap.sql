-- Security review of 6/7: unanchored replace() let a player rename to a word that appears elsewhere in their own
-- feed lines (e.g. a compound name) and rewrite it on the projector. Every player-authored feed line STARTS with
-- the actor's name (claim, synthesis, freeze, alliance, betrayal, market), so only ever swap that prefix.

create or replace function public._swap_prefix(msg text, old_name text, new_name text) returns text
language sql immutable set search_path = public as $$
  select case
    when old_name is null or old_name = '' or msg is null then msg
    when left(msg, length(old_name)) = old_name then new_name || substr(msg, length(old_name) + 1)
    else msg
  end
$$;

create or replace function public._feed(k text, p uuid, msg text, payload jsonb default '{}') returns void
language plpgsql set search_path = public as $$
declare pl players;
begin
  select * into pl from players where id = p;
  if pl.id is not null and not pl.name_public then
    msg := _swap_prefix(msg, pl.display_name, _public_name(pl));
  end if;
  insert into feed (kind, player, message, payload) values (k, p, msg, payload);
end $$;

create or replace function public.set_name_public(p_public boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me players;
begin
  update players set name_public = coalesce(p_public, true) where id = auth.uid() returning * into me;
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'not_registered'); end if;
  if me.name_public then
    update feed set message = _swap_prefix(message, 'Lab ' || _lab_no(me), me.display_name) where player = me.id;
  else
    update feed set message = _swap_prefix(message, me.display_name, 'Lab ' || _lab_no(me)) where player = me.id;
  end if;
  return jsonb_build_object('ok', true, 'name_public', me.name_public, 'public_name', _public_name(me));
end $$;

create or replace function public._sync_feed_name() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.display_name is distinct from old.display_name and new.name_public then
    -- Opted-out players' lines already read "Lab 0248"; nothing to sync.
    update feed set message = _swap_prefix(message, old.display_name, new.display_name) where player = new.id;
  end if;
  return new;
end $$;

revoke execute on function public._swap_prefix(text, text, text), public._feed(text, uuid, text, jsonb),
  public._sync_feed_name() from public, anon, authenticated;
