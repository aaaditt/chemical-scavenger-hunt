-- Access modes + organizer toolbox. Runs in a transaction and rolls back.
\set ON_ERROR_STOP on
begin;
delete from auth.users;
delete from game_events;
delete from feed;
update compounds set first_by = null, first_at = null;
update game_settings set game_open = true, scan_cooldown_seconds = 0, mix_cooldown_seconds = 0,
  restrict_domain = true, username_login = false, require_verification = false, test_mode = false;

create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
$$;
create or replace function pg_temp.expect(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok  %', msg;
end $$;
create or replace function pg_temp.mkuser(email text, anon boolean default false, uname text default null) returns uuid language plpgsql as $$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, is_anonymous, raw_user_meta_data, created_at, updated_at)
  values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, anon,
          case when uname is not null then jsonb_build_object('username', uname) else '{}'::jsonb end, now(), now());
  return u;
end $$;

create temp table u (k text primary key, id uuid);
grant select on u to authenticated;
insert into admin_emails values ('boss@dubai.bits-pilani.ac.in') on conflict do nothing;
insert into u values ('admin', pg_temp.mkuser('boss@dubai.bits-pilani.ac.in'));
select pg_temp.expect((select is_admin and verified from players where id = (select id from u where k='admin')), 'admin auto-flagged and verified');

-- 1. Domain toggle
do $$ begin perform pg_temp.mkuser('x@gmail.com'); raise exception 'FAIL: gmail allowed while restricted';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok  gmail blocked when university-only'; end $$;
update game_settings set restrict_domain = false;
insert into u values ('gmail', pg_temp.mkuser('someone@gmail.com'));
select pg_temp.expect(exists (select 1 from players where email = 'someone@gmail.com'), 'gmail allowed when open to any email');

-- 2. Username (anonymous) logins
do $$ begin perform pg_temp.mkuser(null, true, 'Tester'); raise exception 'FAIL: username login allowed while off';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok  username login blocked when off'; end $$;
update game_settings set username_login = true;
insert into u values ('guest', pg_temp.mkuser(null, true, 'Test   Pilot'));
select pg_temp.expect((select display_name = 'Test Pilot' and is_test from players where id = (select id from u where k='guest')), 'username player created as test player');

-- 3. Test players hidden from boards unless test server is on
set local role anon;
select pg_temp.expect(not exists (select 1 from jsonb_array_elements(leaderboard('score', 50)) r where r->>'display_name' = 'Test Pilot'), 'test players hidden when test server off');
reset role;
update game_settings set test_mode = true;
set local role anon;
select pg_temp.expect(exists (select 1 from jsonb_array_elements(leaderboard('score', 50)) r where r->>'display_name' = 'Test Pilot'), 'test players shown when test server on');
reset role;

-- 4. Verification
update game_settings set require_verification = true;
insert into u values ('new', pg_temp.mkuser('f20249999@dubai.bits-pilani.ac.in'));
set local role authenticated;
select pg_temp.as_user((select id from u where k='new'));
select pg_temp.expect(claim_qr('DEV-H') ->> 'error' = 'pending_verification', 'unverified player blocked');
do $$ begin perform admin_verify_all(); raise exception 'FAIL: player verified themselves';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok  players cannot verify themselves'; end $$;
select pg_temp.as_user((select id from u where k='admin'));
select pg_temp.expect(admin_verify((select id from u where k='new'), true) ->> 'ok' = 'true', 'admin verified player');
select pg_temp.as_user((select id from u where k='new'));
select pg_temp.expect(claim_qr('DEV-H') ->> 'status' = 'new_element', 'verified player can play');

-- 5. Grants
select pg_temp.as_user((select id from u where k='admin'));
select admin_grant_element((select id from u where k='guest'), 'Au');
select pg_temp.expect(admin_grant_compound((select id from u where k='guest'), 'ammonia') ->> 'granted' = 'true', 'compound granted');
select admin_unlock_hint((select id from u where k='guest'), 'heme');
select admin_set_catalyst((select id from u where k='guest'), 'acid');
select pg_temp.expect((select jsonb_array_length(r->'elements') = 4 and jsonb_array_length(r->'compounds') = 2 and jsonb_array_length(r->'hints') = 3
  from (select admin_give_random((select id from u where k='guest'), 4, 2, 3, true) r) x), 'random loadout returns what it gave');
select pg_temp.expect((admin_player_detail((select id from u where k='guest')) -> 'player' ->> 'catalyst') = 'acid', 'catalyst changed');
select pg_temp.expect((select (d->'player'->>'compounds_count')::int >= 3 and (d->'player'->>'score')::int > 0
  from (select admin_player_detail((select id from u where k='guest')) d) x), 'grants update score + counts');
select admin_revoke_compound((select id from u where k='guest'), 'ammonia');
select pg_temp.expect(not exists (select 1 from jsonb_array_elements(admin_player_detail((select id from u where k='guest'))->'compounds') c where c->>'id' = 'ammonia'), 'compound revoked');
select pg_temp.expect((admin_give_random_all(true, 2, 0, 0, false) ->> 'players')::int = 1, 'bulk random to test players only');

-- 6. Non-admins can't use the toolbox
select pg_temp.as_user((select id from u where k='new'));
do $$ begin perform admin_give_random(auth.uid(), 10, 10, 10, true); raise exception 'FAIL: player gave themselves stuff';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok  players cannot grant themselves anything'; end $$;

-- 7. Resets
select pg_temp.as_user((select id from u where k='admin'));
select admin_reset_player((select id from u where k='new'));
select pg_temp.expect((admin_player_detail((select id from u where k='new'))->'player'->>'score')::int = 0, 'player reset');
select pg_temp.expect(admin_reset_game('nope') ->> 'error' = 'confirm_text', 'reset game needs confirmation text');
select pg_temp.expect(admin_reset_game('RESET GAME') ->> 'ok' = 'true', 'reset game works');
select pg_temp.expect((admin_delete_test_players() ->> 'count')::int = 1, 'test players deleted');
select pg_temp.expect(admin_set_admin('helper@gmail.com', true) ->> 'ok' = 'true', 'admin added by email');
select pg_temp.expect(admin_set_admin('boss@dubai.bits-pilani.ac.in', false) ->> 'error' = 'cannot_demote_self', 'cannot remove own admin');
select pg_temp.expect(admin_broadcast('Lunch break!') ->> 'ok' = 'true', 'broadcast');

reset role;
rollback;
\echo ALL ADMIN TESTS PASSED
