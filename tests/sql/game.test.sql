-- Game-logic integration test. Runs in a transaction and rolls back.
-- Run: npm run test:sql   (requires local supabase running)
\set ON_ERROR_STOP on
begin;

-- Start from a clean slate inside the transaction (everything is rolled back at the end).
delete from auth.users;
delete from game_events;
delete from feed;
update compounds set first_by = null, first_at = null;
update qr_codes set claimed_count = 0;
update game_settings set game_open = false;

create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
$$;
create or replace function pg_temp.expect(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok  %', msg;
end $$;
create or replace function pg_temp.mkuser(email text) returns uuid language plpgsql as $$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email,
          jsonb_build_object('full_name', split_part(email, '@', 1)), now(), now());
  return u;
end $$;

-- 1. Domain gate
do $$ begin
  perform pg_temp.mkuser('someone@gmail.com');
  raise exception 'FAIL: gmail account was allowed';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok  non-BITS email rejected (%)', sqlerrm;
end $$;

update game_settings set scan_cooldown_seconds = 0, mix_cooldown_seconds = 0;
create temp table ncomp as select count(*) as n from compounds;
grant select on ncomp to authenticated;

create temp table u (k text primary key, id uuid);
insert into u values
  ('a', pg_temp.mkuser('f20240001@dubai.bits-pilani.ac.in')),
  ('b', pg_temp.mkuser('f20240002@dubai.bits-pilani.ac.in')),
  ('c', pg_temp.mkuser('f20240003@dubai.bits-pilani.ac.in'));
grant select on u to authenticated;

select pg_temp.expect((select count(*) from players) = 3, 'players auto-created');
select pg_temp.expect((select count(distinct catalyst) from players) = 3, 'catalysts balanced across first players');
select pg_temp.expect((select student_id from players where id = (select id from u where k='a')) = 'F20240001', 'student id parsed');
select pg_temp.expect((select count(*) from hint_unlocks where player = (select id from u where k='a')) = 2, '2 locked hints at signup');

-- Make B the Pressure holder for the ammonia test.
update players set catalyst = 'pressure' where id = (select id from u where k='b');
update players set catalyst = 'heat' where id in (select id from u where k in ('a','c'));

set local role authenticated;

-- 2. Game closed
select pg_temp.as_user((select id from u where k='a'));
select pg_temp.expect(claim_qr('DEV-H') ->> 'error' = 'game_closed', 'closed game blocks scans');
reset role;
update game_settings set game_open = true;
set local role authenticated;
select pg_temp.as_user((select id from u where k='a'));

-- 3. Scanning
select pg_temp.expect(claim_qr('dev-h') ->> 'status' = 'new_element', 'scan H (case-insensitive)');
select pg_temp.expect(claim_qr('DEV-H') ->> 'status' = 'already_claimed', 're-scan same QR is a no-op');
select pg_temp.expect(claim_qr('NOPE') ->> 'error' = 'invalid_code', 'unknown code rejected');
select claim_qr('DEV-O'); select claim_qr('DEV-N'); select claim_qr('DEV-C');
select pg_temp.expect((my_state() -> 'player' ->> 'score')::int = 12, 'score = 4 common elements x 3');

-- 4. Synthesis
select pg_temp.expect(synthesize('{"H":2,"O":1}') ->> 'status' = 'success', 'water synthesized');
select pg_temp.expect((select h ->> 'first_by' from jsonb_array_elements(hint_book()) h where h ->> 'id' = 'water') = 'f20240001', 'first discoverer recorded');
select pg_temp.expect(synthesize('{"O":1,"H":2}') ->> 'status' = 'already_made', 'key order irrelevant, already made');
select pg_temp.expect(synthesize('{"Au":1}') ->> 'error' = 'missing_element', 'cannot mix unowned element');
select pg_temp.expect((my_state() -> 'player' ->> 'score')::int = 17, 'score +5 for water');

-- 5. Wrong streak -> freeze
select pg_temp.expect(synthesize('{"H":7}') ->> 'tries_left' = '2', 'wrong #1');
select pg_temp.expect(synthesize('{"H":8}') ->> 'tries_left' = '1', 'wrong #2');
select pg_temp.expect(synthesize('{"H":9}') ->> 'status' = 'frozen', 'wrong #3 freezes lab');
select pg_temp.expect(synthesize('{"C":1,"O":2}') ->> 'error' = 'frozen', 'frozen lab cannot mix');
select pg_temp.expect(claim_qr('DEV-S') ->> 'error' = 'frozen', 'frozen lab cannot scan');
reset role;
update players set frozen_until = null where id = (select id from u where k='a');
set local role authenticated;
select pg_temp.as_user((select id from u where k='a'));

-- 6. Catalyst-gated: ammonia needs Pressure (held by B)
select pg_temp.expect(synthesize('{"N":1,"H":3}') ->> 'status' = 'failed', 'ammonia without catalyst fails');
select pg_temp.expect(synthesize('{"N":1,"H":3}', 'own') ->> 'status' = 'failed', 'ammonia with wrong own catalyst (heat) fails');
select pg_temp.as_user((select id from u where k='b'));
create temp table code_b as select create_catalyst_code() ->> 'code' as code;
grant select on code_b to authenticated;
select pg_temp.as_user((select id from u where k='a'));
select pg_temp.expect(synthesize('{"N":1,"H":3}', (select code from code_b)) ->> 'status' = 'success', 'ammonia with lent Pressure code');
select pg_temp.expect(synthesize('{"C":1,"H":4}', (select code from code_b)) ->> 'error' = 'code_used', 'lent code is single-use');
select pg_temp.as_user((select id from u where k='b'));
select pg_temp.expect((my_state() -> 'player' ->> 'score')::int = 6, 'lender got 30% of 20');
select pg_temp.expect((my_state() -> 'player' ->> 'lends_count')::int = 1, 'lend counted');

-- 7. Claim caps (DEV-LI cap 5): A + 5 new players; 6th is capped out
select pg_temp.as_user((select id from u where k='a'));
select pg_temp.expect(claim_qr('DEV-LI') ->> 'status' = 'new_element', 'rare Li claimed');
reset role;
insert into u select 'x' || i, pg_temp.mkuser('f2024100' || i || '@dubai.bits-pilani.ac.in') from generate_series(1, 5) i;
set local role authenticated;
select pg_temp.as_user((select id from u where k='x1')); select claim_qr('DEV-LI');
select pg_temp.as_user((select id from u where k='x2')); select claim_qr('DEV-LI');
select pg_temp.as_user((select id from u where k='x3')); select claim_qr('DEV-LI');
select pg_temp.as_user((select id from u where k='x4')); select claim_qr('DEV-LI');
select pg_temp.as_user((select id from u where k='x5'));
select pg_temp.expect(claim_qr('DEV-LI') ->> 'error' = 'capped_out', 'cap of 5 enforced');
select pg_temp.expect(claim_qr('DEV-D') ->> 'error' = 'not_active', 'dormant isotope not claimable');

-- 8. Alliances: C borrows A's common elements, not rare ones
select pg_temp.as_user((select id from u where k='a'));
create temp table inv as select alliance_create('Noble Gases') ->> 'invite_code' as code;
grant select on inv to authenticated;
select pg_temp.as_user((select id from u where k='c'));
select pg_temp.expect(alliance_join((select code from inv)) ->> 'ok' = 'true', 'C joined alliance');
select pg_temp.expect(synthesize('{"C":1,"O":2}') ->> 'status' = 'success', 'C made CO2 from ally''s common elements');
select pg_temp.expect(synthesize('{"Li":2,"C":1,"O":3}') ->> 'error' = 'missing_element', 'rare elements not shared');
select pg_temp.expect(jsonb_array_length(my_alliance() -> 'alliance' -> 'members') = 2, 'alliance has 2 members');
select pg_temp.expect(alliance_leave() ->> 'penalty' = '50', 'leaving costs 50');
select pg_temp.expect(alliance_join((select code from inv)) ->> 'error' = 'cannot_rejoin', 'no rejoining after betrayal');

-- 9. Gifts
select pg_temp.as_user((select id from u where k='a'));
select claim_qr('DEV-NA');
create temp table gift as select create_gift_link('Na') ->> 'code' as code;
grant select on gift to authenticated;
select pg_temp.expect(create_gift_link('H') ->> 'error' = 'not_giftable', 'H not giftable');
select pg_temp.as_user((select id from u where k='b'));
select pg_temp.expect(redeem_gift((select code from gift)) ->> 'ok' = 'true', 'B redeemed Na gift');
select pg_temp.as_user((select id from u where k='c'));
select pg_temp.expect(redeem_gift((select code from gift)) ->> 'error' = 'gift_used', 'gift single-use');

-- 10. Black market
reset role;
insert into game_events (kind, ends_at) values ('black_market', now() + interval '10 minutes');
set local role authenticated;
select pg_temp.as_user((select id from u where k='a'));
select pg_temp.expect(market_play('safe') ->> 'points' = '100', 'safe market play +100');
select pg_temp.expect(market_play('gamble') ->> 'error' = 'already_played', 'one play per window');

-- 11. Read models + privacy
select pg_temp.expect(jsonb_array_length(hint_book()) = (select n from ncomp), 'hint book lists every compound');
select pg_temp.expect((select h ->> 'name' from jsonb_array_elements(hint_book()) h where h ->> 'id' = 'water') = 'Water', 'discovered names revealed');
select pg_temp.expect((select h ->> 'name' from jsonb_array_elements(hint_book()) h where h ->> 'id' = 'heme') is null, 'undiscovered names hidden');
do $$ begin
  perform * from compounds;
  raise exception 'FAIL: compounds table readable';
exception when insufficient_privilege then raise notice 'ok  recipes table not directly readable';
end $$;
select pg_temp.expect((select count(*) from players) = 1, 'players RLS: only own row visible');
do $$ begin
  perform admin_overview();
  raise exception 'FAIL: non-admin called admin fn';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok  admin functions blocked for players';
end $$;
reset role;
set local role anon;
select pg_temp.expect(jsonb_array_length(leaderboard('score', 10)) > 0, 'anon can read leaderboard');
select pg_temp.expect(not (leaderboard('score', 10) -> 0 ? 'email'), 'leaderboard has no emails');

rollback;
\echo ALL SQL TESTS PASSED
