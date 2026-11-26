-- Secret Catalyst — access modes, email verification, test server, username (no-Google) logins,
-- and the full organizer toolbox (grant/revoke anything, reset, broadcast, admins, catalog edits).

-- ───────────────────────── settings + player flags ─────────────────────────
alter table public.game_settings
  add column restrict_domain      boolean not null default true,   -- only @allowed_domain Google accounts
  add column require_verification boolean not null default false,  -- new players wait for an organizer to verify
  add column username_login       boolean not null default false,  -- allow sign-in with just a username (test only)
  add column test_mode            boolean not null default false;  -- "test server": banner + test players on boards

alter table public.players
  add column verified boolean not null default false,
  add column is_test  boolean not null default false;

-- Everyone who exists before this migration is considered verified.
update public.players set verified = true;

-- ───────────────────────── gate: verification ─────────────────────────
create or replace function public._gate(me public.players, check_frozen boolean default true) returns jsonb
language plpgsql stable set search_path = public as $$
declare s game_settings := _settings();
begin
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'not_registered'); end if;
  if me.disqualified then return jsonb_build_object('ok', false, 'error', 'disqualified'); end if;
  if s.require_verification and not me.verified and not me.is_admin then
    return jsonb_build_object('ok', false, 'error', 'pending_verification');
  end if;
  if not s.game_open and not me.is_admin then return jsonb_build_object('ok', false, 'error', 'game_closed'); end if;
  if check_frozen and me.frozen_until is not null and me.frozen_until > now() then
    return jsonb_build_object('ok', false, 'error', 'frozen', 'frozen_until', me.frozen_until);
  end if;
  return null;
end $$;

-- ───────────────────────── auth gate: domain toggle + username logins ─────────────────────────
create or replace function public._auth_domain_gate() returns trigger
language plpgsql security definer set search_path = public as $$
declare s game_settings := _settings();
begin
  -- Username (anonymous) sign-ins: only while organizers allow them.
  if coalesce(new.is_anonymous, false) then
    if not s.username_login then
      raise exception 'Username sign-in is turned off. Sign in with Google.';
    end if;
    return new;
  end if;
  if new.email is null then
    raise exception 'Sign in with your Google account.';
  end if;
  if s.restrict_domain
     and lower(new.email) not like '%@' || s.allowed_domain
     and not exists (select 1 from admin_emails where email = lower(new.email)) then
    raise exception 'Only @% accounts can play.', s.allowed_domain;
  end if;
  return new;
end $$;

create or replace function public._create_player() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cat text;
  anon boolean := coalesce(new.is_anonymous, false);
  local text := split_part(lower(coalesce(new.email, '')), '@', 1);
  uname text := left(regexp_replace(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), '\s+', ' ', 'g'), 24);
  nm text;
  admin boolean := new.email is not null and exists (select 1 from admin_emails where email = lower(new.email));
  s game_settings := _settings();
begin
  nm := case
    when anon then coalesce(nullif(uname, ''), 'Guest ' || left(new.id::text, 4))
    else coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), local)
  end;

  select c.id into cat
  from catalysts c
  left join players p on p.catalyst = c.id
  group by c.id
  order by count(p.id), random()
  limit 1;

  insert into players (id, email, student_id, display_name, avatar_url, catalyst, is_admin, verified, is_test)
  values (
    new.id,
    case when anon then 'guest-' || new.id::text || '@test.local' else lower(new.email) end,
    case when not anon and local ~ '^[a-z]\d{6,}' then upper(local) end,
    left(nm, 32),
    new.raw_user_meta_data ->> 'avatar_url',
    cat,
    admin,
    admin or not s.require_verification,
    anon
  );

  insert into hint_unlocks (player, compound, source)
  select new.id, id, 'signup' from compounds
  where locked_hint is not null
  order by random() limit s.hints_at_signup;

  return new;
end $$;

-- Public access info for the login page (no secrets).
create or replace function public.access_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('restrict_domain', restrict_domain, 'allowed_domain', allowed_domain,
    'username_login', username_login, 'test_mode', test_mode, 'game_open', game_open)
  from game_settings where id = 1
$$;

-- ───────────────────────── read models (add new flags) ─────────────────────────
create or replace function public.my_state() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me players;
  s game_settings := _settings();
  my_rank int;
begin
  select * into me from players where id = auth.uid();
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'not_registered'); end if;

  select count(*) + 1 into my_rank from players
  where score > me.score and not disqualified and not is_admin and (not is_test or s.test_mode);

  return jsonb_build_object(
    'ok', true,
    'player', jsonb_build_object(
      'id', me.id, 'display_name', me.display_name, 'student_id', me.student_id, 'avatar_url', me.avatar_url,
      'score', me.score, 'rank', my_rank, 'compounds_count', me.compounds_count, 'niche_points', me.niche_points,
      'lends_count', me.lends_count, 'frozen_until', me.frozen_until, 'wrong_streak', me.wrong_streak,
      'is_admin', me.is_admin, 'disqualified', me.disqualified, 'verified', me.verified, 'is_test', me.is_test,
      'catalyst', (select to_jsonb(c) from catalysts c where c.id = me.catalyst)
    ),
    'settings', jsonb_build_object(
      'game_open', s.game_open, 'game_ends_at', s.game_ends_at, 'wrong_streak_limit', s.wrong_streak_limit,
      'freeze_minutes', s.freeze_minutes, 'gift_links_per_player', s.gift_links_per_player,
      'alliance_max', s.alliance_max, 'alliance_leave_penalty', s.alliance_leave_penalty,
      'catalysis_bonus_pct', s.catalysis_bonus_pct, 'market_safe_points', s.market_safe_points,
      'market_small_points', s.market_small_points, 'market_big_points', s.market_big_points,
      'market_freeze_minutes', s.market_freeze_minutes, 'finale_revealed', s.finale_revealed,
      'test_mode', s.test_mode, 'require_verification', s.require_verification
    ),
    'elements', coalesce((
      select jsonb_agg(jsonb_build_object('symbol', e.symbol, 'name', e.name, 'tier', e.tier, 'points', e.points,
               'giftable', e.giftable, 'source', pe.source, 'at', pe.created_at) order by pe.created_at)
      from player_elements pe join elements e on e.symbol = pe.element where pe.player = me.id), '[]'),
    'ally_elements', coalesce((
      select jsonb_agg(distinct e.symbol)
      from player_elements pe join elements e on e.symbol = pe.element
      where pe.player in (select _allies(me.id)) and e.tier = 'common'
        and not exists (select 1 from player_elements x where x.player = me.id and x.element = e.symbol)), '[]'),
    'compounds', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'formula', c.formula, 'tier', c.tier,
               'points', sy.points, 'at', sy.created_at, 'first', c.first_by = me.id,
               'catalyst', c.catalyst,
               'lender', (select display_name from players where id = sy.catalyst_lender)) order by sy.created_at)
      from syntheses sy join compounds c on c.id = sy.compound where sy.player = me.id), '[]'),
    'codes', coalesce((
      select jsonb_agg(jsonb_build_object('code', cc.code, 'expires_at', cc.expires_at, 'used_at', cc.used_at,
               'success', cc.success, 'used_by', (select display_name from players where id = cc.used_by))
             order by cc.created_at desc)
      from catalyst_codes cc where cc.owner = me.id and cc.created_at > now() - interval '3 hours'), '[]'),
    'gifts', coalesce((
      select jsonb_agg(jsonb_build_object('code', g.code, 'element', g.element, 'redeemed_at', g.redeemed_at,
               'redeemed_by', (select display_name from players where id = g.redeemed_by)) order by g.created_at desc)
      from gift_links g where g.owner = me.id), '[]'),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('id', ev.id, 'kind', ev.kind, 'label', ev.label, 'ends_at', ev.ends_at,
               'played', exists (select 1 from market_plays mp where mp.player = me.id and mp.event = ev.id)))
      from game_events ev where ev.starts_at <= now() and ev.ends_at > now()), '[]')
  );
end $$;

-- Test players only appear on public boards while the test server is on.
create or replace function public.leaderboard(p_kind text default 'score', p_limit int default 50) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]') from (
    select display_name, avatar_url, score, compounds_count, niche_points, lends_count, is_test,
           rank() over (order by
             case p_kind when 'compounds' then compounds_count when 'niche' then niche_points
                         when 'catalyst' then lends_count else score end desc,
             case when p_kind = 'compounds' then last_compound_at end asc nulls last) as rank
    from players
    where not disqualified and not is_admin
      and (not is_test or (select test_mode from game_settings where id = 1))
    order by rank, display_name
    limit least(p_limit, 200)
  ) t
$$;

-- ───────────────────────── admin: settings + players ─────────────────────────
create or replace function public.admin_update_settings(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s game_settings;
begin
  perform _require_admin();
  select * into s from jsonb_populate_record((select g from game_settings g where id = 1), p);
  update game_settings set
    game_open = s.game_open, game_ends_at = s.game_ends_at, finale_revealed = s.finale_revealed,
    allowed_domain = s.allowed_domain, restrict_domain = s.restrict_domain,
    require_verification = s.require_verification, username_login = s.username_login, test_mode = s.test_mode,
    freeze_minutes = s.freeze_minutes, wrong_streak_limit = s.wrong_streak_limit,
    catalysis_bonus_pct = s.catalysis_bonus_pct, catalyst_code_minutes = s.catalyst_code_minutes,
    max_active_codes = s.max_active_codes, gift_links_per_player = s.gift_links_per_player,
    alliance_max = s.alliance_max, alliance_leave_penalty = s.alliance_leave_penalty,
    market_safe_points = s.market_safe_points, market_small_points = s.market_small_points,
    market_big_points = s.market_big_points, market_p_small = s.market_p_small, market_p_big = s.market_p_big,
    market_freeze_minutes = s.market_freeze_minutes, hints_at_signup = s.hints_at_signup,
    scan_cooldown_seconds = s.scan_cooldown_seconds, mix_cooldown_seconds = s.mix_cooldown_seconds,
    updated_at = now()
  where id = 1;
  perform _audit('update_settings', null, p);
  if p ? 'game_open' then
    perform _feed('system', null, case when s.game_open then 'The lab is OPEN. Go hunt. 🧪' else 'The lab is CLOSED.' end, '{}');
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_players(p_search text default '', p_limit int default 100) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return (select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]') from (
    select p.id, p.email, p.student_id, p.display_name, p.catalyst, p.score, p.compounds_count, p.niche_points,
           p.lends_count, p.frozen_until, p.disqualified, p.is_admin, p.verified, p.is_test, p.created_at,
           (select count(*) from player_elements pe where pe.player = p.id) as elements,
           (select a.name from alliance_members m join alliances a on a.id = m.alliance
             where m.player = p.id and m.left_at is null) as alliance
    from players p
    where p_search = '' or p.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%'
       or coalesce(p.student_id, '') ilike '%' || p_search || '%'
    order by (not p.verified) desc, p.score desc
    limit least(p_limit, 1000)) t);
end $$;

create or replace function public.admin_player_detail(p_player uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return (select jsonb_build_object(
    'player', to_jsonb(p) - 'last_scan_at' - 'last_mix_at',
    'elements', (select coalesce(jsonb_agg(jsonb_build_object('symbol', pe.element, 'source', pe.source, 'at', pe.created_at) order by pe.created_at), '[]')
                 from player_elements pe where pe.player = p.id),
    'compounds', (select coalesce(jsonb_agg(jsonb_build_object('id', s.compound, 'name', c.name, 'formula', c.formula, 'points', s.points, 'at', s.created_at) order by s.created_at), '[]')
                  from syntheses s join compounds c on c.id = s.compound where s.player = p.id),
    'hints', (select coalesce(jsonb_agg(h.compound), '[]') from hint_unlocks h where h.player = p.id),
    'ledger', (select coalesce(jsonb_agg(row_to_json(l)::jsonb), '[]') from (
                 select delta, reason, ref, created_at from score_ledger where player = p.id order by id desc limit 40) l),
    'attempts', (select coalesce(jsonb_agg(row_to_json(a)::jsonb), '[]') from (
                 select recipe, catalyst, success, compound, created_at from mix_attempts where player = p.id order by id desc limit 15) a),
    'alliance', (select a.name from alliance_members m join alliances a on a.id = m.alliance where m.player = p.id and m.left_at is null)
  ) from players p where p.id = p_player);
end $$;

create or replace function public.admin_verify(p_player uuid, p_verified boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  update players set verified = p_verified where id = p_player;
  perform _audit('verify', p_player::text, jsonb_build_object('verified', p_verified));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_verify_all() returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform _require_admin();
  update players set verified = true where not verified;
  get diagnostics n = row_count;
  perform _audit('verify_all', null, jsonb_build_object('count', n));
  return jsonb_build_object('ok', true, 'count', n);
end $$;

-- ───────────────────────── admin: grant / revoke anything ─────────────────────────
create or replace function public.admin_grant_element(p_player uuid, p_element text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform _require_admin();
  insert into player_elements (player, element, source) values (p_player, p_element, 'admin') on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then perform _award(p_player, (select points from elements where symbol = p_element), 'admin_grant', p_element); end if;
  perform _audit('grant_element', p_player::text, jsonb_build_object('element', p_element));
  return jsonb_build_object('ok', true, 'granted', n > 0);
end $$;

create or replace function public.admin_revoke_element(p_player uuid, p_element text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  delete from player_elements where player = p_player and element = p_element;
  perform _audit('revoke_element', p_player::text, jsonb_build_object('element', p_element));
  return jsonb_build_object('ok', true);
end $$;

-- Credits a compound as if synthesized (points, counts, first discovery if nobody has it yet).
create or replace function public.admin_grant_compound(p_player uuid, p_compound text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c compounds; n int;
begin
  perform _require_admin();
  select * into c from compounds where id = p_compound;
  if c.id is null then return jsonb_build_object('ok', false, 'error', 'unknown_compound'); end if;
  insert into syntheses (player, compound, points) values (p_player, c.id, c.points) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    update players set compounds_count = compounds_count + 1, last_compound_at = now(),
      niche_points = niche_points + case when c.tier in ('rare','isotope','legendary') then c.points else 0 end
    where id = p_player;
    perform _award(p_player, c.points, 'admin_grant', c.id);
    update compounds set first_by = p_player, first_at = now() where id = c.id and first_by is null;
  end if;
  perform _audit('grant_compound', p_player::text, jsonb_build_object('compound', p_compound));
  return jsonb_build_object('ok', true, 'granted', n > 0);
end $$;

create or replace function public.admin_revoke_compound(p_player uuid, p_compound text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sy syntheses; c compounds;
begin
  perform _require_admin();
  delete from syntheses where player = p_player and compound = p_compound returning * into sy;
  if sy.player is not null then
    select * into c from compounds where id = p_compound;
    update players set compounds_count = greatest(0, compounds_count - 1),
      niche_points = greatest(0, niche_points - case when c.tier in ('rare','isotope','legendary') then sy.points else 0 end)
    where id = p_player;
    perform _award(p_player, -sy.points, 'admin_revoke', p_compound);
    update compounds set first_by = null, first_at = null where id = p_compound and first_by = p_player;
  end if;
  perform _audit('revoke_compound', p_player::text, jsonb_build_object('compound', p_compound));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_unlock_hint(p_player uuid, p_compound text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  insert into hint_unlocks (player, compound, source) values (p_player, p_compound, 'admin') on conflict do nothing;
  perform _audit('unlock_hint', p_player::text, jsonb_build_object('compound', p_compound));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_set_catalyst(p_player uuid, p_catalyst text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  update players set catalyst = p_catalyst where id = p_player;
  perform _audit('set_catalyst', p_player::text, jsonb_build_object('catalyst', p_catalyst));
  return jsonb_build_object('ok', true);
end $$;

-- "Give them random stuff": random elements (weighted to commons unless include_rare), compounds and hints.
create or replace function public.admin_give_random(p_player uuid, p_elements int default 5, p_compounds int default 0,
  p_hints int default 0, p_include_rare boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; els text[] := '{}'; cmps text[] := '{}'; hs text[] := '{}';
begin
  perform _require_admin();
  for r in select symbol from elements e
           where (p_include_rare or e.tier in ('common','uncommon'))
             and not exists (select 1 from player_elements pe where pe.player = p_player and pe.element = e.symbol)
           order by random() limit greatest(0, least(p_elements, 50)) loop
    perform admin_grant_element(p_player, r.symbol);
    els := els || r.symbol;
  end loop;
  for r in select id from compounds c
           where (p_include_rare or c.tier in ('basic','catalyzed','uncommon'))
             and not exists (select 1 from syntheses s where s.player = p_player and s.compound = c.id)
           order by random() limit greatest(0, least(p_compounds, 60)) loop
    perform admin_grant_compound(p_player, r.id);
    cmps := cmps || r.id;
  end loop;
  for r in select id from compounds c
           where locked_hint is not null
             and not exists (select 1 from hint_unlocks h where h.player = p_player and h.compound = c.id)
           order by random() limit greatest(0, least(p_hints, 60)) loop
    perform admin_unlock_hint(p_player, r.id);
    hs := hs || r.id;
  end loop;
  return jsonb_build_object('ok', true, 'elements', els, 'compounds', cmps, 'hints', hs);
end $$;

create or replace function public.admin_give_random_all(p_only_test boolean, p_elements int, p_compounds int,
  p_hints int, p_include_rare boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  perform _require_admin();
  for r in select id from players where not is_admin and (not p_only_test or is_test) loop
    perform admin_give_random(r.id, p_elements, p_compounds, p_hints, p_include_rare);
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'players', n);
end $$;

-- ───────────────────────── admin: resets ─────────────────────────
create or replace function public._wipe_progress(p uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from player_elements where player = p;
  delete from syntheses where player = p;
  delete from mix_attempts where player = p;
  delete from claims where player = p;
  delete from catalyst_codes where owner = p;
  delete from gift_links where owner = p;
  delete from market_plays where player = p;
  delete from score_ledger where player = p;
  delete from alliance_members where player = p;
  update compounds set first_by = null, first_at = null where first_by = p;
  update players set score = 0, compounds_count = 0, niche_points = 0, lends_count = 0, last_compound_at = null,
    frozen_until = null, wrong_streak = 0 where id = p;
end $$;

create or replace function public.admin_reset_player(p_player uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  perform _wipe_progress(p_player);
  perform _audit('reset_player', p_player::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_delete_player(p_player uuid) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
begin
  perform _require_admin();
  if p_player = auth.uid() then return jsonb_build_object('ok', false, 'error', 'cannot_delete_self'); end if;
  update compounds set first_by = null, first_at = null where first_by = p_player;
  delete from auth.users where id = p_player;  -- cascades to players and all their rows
  perform _audit('delete_player', p_player::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_delete_test_players() returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare n int;
begin
  perform _require_admin();
  update compounds set first_by = null, first_at = null where first_by in (select id from players where is_test);
  delete from auth.users where id in (select id from players where is_test);
  get diagnostics n = row_count;
  perform _audit('delete_test_players', null, jsonb_build_object('count', n));
  return jsonb_build_object('ok', true, 'count', n);
end $$;

-- Wipes ALL progress for everyone (keeps accounts, catalysts, QR codes, catalog, settings).
create or replace function public.admin_reset_game(p_confirm text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  if p_confirm is distinct from 'RESET GAME' then return jsonb_build_object('ok', false, 'error', 'confirm_text'); end if;
  delete from player_elements; delete from syntheses; delete from mix_attempts; delete from claims;
  delete from catalyst_codes; delete from gift_links; delete from market_plays; delete from score_ledger;
  delete from alliance_members; delete from alliances; delete from game_events; delete from feed;
  update qr_codes set claimed_count = 0;
  update compounds set first_by = null, first_at = null;
  update players set score = 0, compounds_count = 0, niche_points = 0, lends_count = 0, last_compound_at = null,
    frozen_until = null, wrong_streak = 0;
  perform _audit('reset_game', null, '{}');
  return jsonb_build_object('ok', true);
end $$;

-- Deal fresh secret catalysts to everyone, balanced.
create or replace function public.admin_reshuffle_catalysts() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  with cats as (select id, row_number() over (order by id) - 1 as i, count(*) over () as n from catalysts),
       ps as (select id, row_number() over (order by random()) - 1 as i from players)
  update players p set catalyst = c.id
  from ps join cats c on c.i = ps.i % c.n
  where p.id = ps.id;
  perform _audit('reshuffle_catalysts', null, '{}');
  return jsonb_build_object('ok', true);
end $$;

-- ───────────────────────── admin: comms, admins, catalog ─────────────────────────
create or replace function public.admin_broadcast(p_message text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  if length(trim(coalesce(p_message, ''))) < 2 then return jsonb_build_object('ok', false, 'error', 'empty'); end if;
  perform _feed('system', null, '📣 ' || left(trim(p_message), 200), '{}');
  perform _audit('broadcast', null, jsonb_build_object('message', p_message));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_list_admins() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return (select coalesce(jsonb_agg(jsonb_build_object('email', a.email,
    'signed_in', exists (select 1 from players p where p.email = a.email)) order by a.email), '[]') from admin_emails a);
end $$;

create or replace function public.admin_set_admin(p_email text, p_admin boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email));
begin
  perform _require_admin();
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'error', 'bad_email'); end if;
  if not p_admin and e = (select email from players where id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'cannot_demote_self');
  end if;
  if p_admin then insert into admin_emails (email) values (e) on conflict do nothing;
  else delete from admin_emails where email = e; end if;
  update players set is_admin = p_admin, verified = verified or p_admin where email = e;
  perform _audit('set_admin', e, jsonb_build_object('admin', p_admin));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_update_compound(p_id text, p_points int, p_riddle text, p_locked_hint text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  update compounds set points = coalesce(p_points, points), riddle = coalesce(nullif(trim(p_riddle), ''), riddle),
    locked_hint = case when p_locked_hint is null then locked_hint else nullif(trim(p_locked_hint), '') end
  where id = p_id;
  perform _audit('update_compound', p_id, jsonb_build_object('points', p_points));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_audit_log(p_limit int default 100) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return (select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]') from (
    select a.action, a.target, a.payload, a.created_at, p.display_name as admin
    from admin_actions a left join players p on p.id = a.admin order by a.id desc limit least(p_limit, 500)) t);
end $$;

-- ───────────────────────── grants (explicit allow-list, as before) ─────────────────────────
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.my_state(), public.hint_book(), public.claim_qr(text), public.create_catalyst_code(),
  public.synthesize(jsonb, text), public.create_gift_link(text), public.redeem_gift(text),
  public.my_alliance(), public.alliance_create(text), public.alliance_join(text), public.alliance_leave(),
  public.market_play(text), public.set_display_name(text), public.my_recap(),
  public.admin_overview(), public.admin_players(text, int), public.admin_update_settings(jsonb),
  public.admin_freeze(uuid, int), public.admin_adjust(uuid, int, text), public.admin_disqualify(uuid, boolean),
  public.admin_rename(uuid, text), public.admin_grant_element(uuid, text),
  public.admin_create_qr(text, text, text, int, text, int), public.admin_list_qr(),
  public.admin_update_qr(uuid, boolean, text, int), public.admin_drop_isotope(uuid, int, text),
  public.admin_open_market(int), public.admin_end_event(uuid), public.admin_compounds(),
  public.admin_player_detail(uuid), public.admin_verify(uuid, boolean), public.admin_verify_all(),
  public.admin_revoke_element(uuid, text), public.admin_grant_compound(uuid, text),
  public.admin_revoke_compound(uuid, text), public.admin_unlock_hint(uuid, text),
  public.admin_set_catalyst(uuid, text), public.admin_give_random(uuid, int, int, int, boolean),
  public.admin_give_random_all(boolean, int, int, int, boolean), public.admin_reset_player(uuid),
  public.admin_delete_player(uuid), public.admin_delete_test_players(), public.admin_reset_game(text),
  public.admin_reshuffle_catalysts(), public.admin_broadcast(text), public.admin_list_admins(),
  public.admin_set_admin(text, boolean), public.admin_update_compound(text, int, text, text),
  public.admin_audit_log(int)
to authenticated;
grant execute on function public.leaderboard(text, int), public.finale(), public.recipe_key(jsonb), public.access_info()
  to anon, authenticated;
