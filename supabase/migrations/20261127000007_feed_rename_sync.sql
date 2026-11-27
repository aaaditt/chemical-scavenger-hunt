-- Follow-up to 6 (security review): a player who renames and later opts out must not leave their EARLIER
-- name in old feed lines. Keep every feed line written by a player in sync with their current public label,
-- whoever does the rename (set_display_name or admin_rename). The opt-out scrub then always finds it.
--
-- Scope of the opt-out (documented exception): it covers PUBLIC surfaces only (projector, live feed,
-- leaderboards, hint book, finale, story cards). Names returned to the players directly involved in a
-- private exchange stay real: the catalyst lender shown to the borrower, who used your catalyst code,
-- who redeemed your gift, the gifter shown to the one redeemer, and alliance members to each other.
-- Those players already know each other; they swapped codes or links in person.

create or replace function public._sync_feed_name() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.display_name is distinct from old.display_name then
    update feed
       set message = replace(message, old.display_name,
                             case when new.name_public then new.display_name else 'Lab ' || _lab_no(new) end)
     where player = new.id;
  end if;
  return new;
end $$;

drop trigger if exists players_sync_feed_name on public.players;
create trigger players_sync_feed_name
  after update of display_name on public.players
  for each row execute function public._sync_feed_name();

revoke execute on function public._sync_feed_name() from public, anon, authenticated;
