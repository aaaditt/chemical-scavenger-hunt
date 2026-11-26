-- Secret Catalyst — admin / organizer functions. Every call is audited in admin_actions.

create or replace function public._require_admin() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not exists (select 1 from players where id = uid and is_admin) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return uid;
end $$;

create or replace function public._audit(action text, target text, payload jsonb default '{}') returns void
language sql security definer set search_path = public as $$
  insert into admin_actions (admin, action, target, payload) values (auth.uid(), action, target, payload)
$$;

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return jsonb_build_object(
    'settings', (select to_jsonb(s) from game_settings s where id = 1),
    'players', (select count(*) from players where not is_admin),
    'active_10m', (select count(distinct player) from score_ledger where created_at > now() - interval '10 minutes'),
    'frozen', (select count(*) from players where frozen_until > now()),
    'claims', (select count(*) from claims),
    'syntheses', (select count(*) from syntheses),
    'discovered', (select count(*) from compounds where first_by is not null),
    'compounds_total', (select count(*) from compounds),
    'alliances', (select count(distinct alliance) from alliance_members where left_at is null),
    'catalysts', (select jsonb_object_agg(c.id, (select count(*) from players p where p.catalyst = c.id and not p.is_admin)) from catalysts c),
    'events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.starts_at desc), '[]') from (
                 select * from game_events order by starts_at desc limit 10) e),
    'flags', (select coalesce(jsonb_agg(row_to_json(f)::jsonb), '[]') from (
                 -- Burst scanning: 10+ QR claims in the last 10 minutes is physically implausible on a campus.
                 select p.id, p.display_name, p.email, 'burst_scans' as reason, count(*) as n
                 from claims c join players p on p.id = c.player
                 where c.created_at > now() - interval '10 minutes' group by p.id having count(*) >= 10
                 union all
                 -- Brute-forcing the mix bench.
                 select p.id, p.display_name, p.email, 'many_failed_mixes', count(*)
                 from mix_attempts m join players p on p.id = m.player
                 where not m.success and m.created_at > now() - interval '30 minutes' group by p.id having count(*) >= 15
               ) f)
  );
end $$;

create or replace function public.admin_players(p_search text default '', p_limit int default 100) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return (select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]') from (
    select p.id, p.email, p.student_id, p.display_name, p.catalyst, p.score, p.compounds_count, p.niche_points,
           p.lends_count, p.frozen_until, p.disqualified, p.is_admin, p.created_at,
           (select count(*) from player_elements pe where pe.player = p.id) as elements
    from players p
    where p_search = '' or p.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%'
       or coalesce(p.student_id, '') ilike '%' || p_search || '%'
    order by p.score desc
    limit least(p_limit, 500)) t);
end $$;

create or replace function public.admin_update_settings(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s game_settings;
begin
  perform _require_admin();
  -- jsonb_populate_record keeps any field not present in p unchanged.
  select * into s from jsonb_populate_record((select g from game_settings g where id = 1), p);
  update game_settings set
    game_open = s.game_open, game_ends_at = s.game_ends_at, finale_revealed = s.finale_revealed,
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

create or replace function public.admin_freeze(p_player uuid, p_minutes int) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  update players set frozen_until = case when p_minutes <= 0 then null else now() + make_interval(mins => p_minutes) end,
                     wrong_streak = 0
  where id = p_player;
  perform _audit('freeze', p_player::text, jsonb_build_object('minutes', p_minutes));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_adjust(p_player uuid, p_delta int, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  perform _award(p_player, p_delta, 'admin', left(coalesce(p_reason, ''), 120));
  perform _audit('adjust', p_player::text, jsonb_build_object('delta', p_delta, 'reason', p_reason));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_disqualify(p_player uuid, p_dq boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  update players set disqualified = p_dq where id = p_player;
  perform _audit('disqualify', p_player::text, jsonb_build_object('dq', p_dq));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_rename(p_player uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  update players set display_name = left(trim(p_name), 24) where id = p_player;
  perform _audit('rename', p_player::text, jsonb_build_object('name', p_name));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_grant_element(p_player uuid, p_element text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  insert into player_elements (player, element, source) values (p_player, p_element, 'admin') on conflict do nothing;
  perform _audit('grant_element', p_player::text, jsonb_build_object('element', p_element));
  return jsonb_build_object('ok', true);
end $$;

-- Create `p_count` QR codes of one kind (e.g. 12 Hydrogen codes for different spots).
create or replace function public.admin_create_qr(
  p_kind text, p_element text, p_compound text, p_cap int, p_location text, p_count int default 1
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c text;
  out jsonb := '[]';
begin
  perform _require_admin();
  for i in 1 .. greatest(1, least(p_count, 200)) loop
    loop
      c := _gen_code(10);
      exit when not exists (select 1 from qr_codes where code = c);
    end loop;
    insert into qr_codes (code, kind, element, compound, cap, location_label,
                          active_from, active_until)
    values (c, p_kind, nullif(p_element, ''), nullif(p_compound, ''), p_cap, coalesce(p_location, ''),
            -- isotopes stay dormant until an admin drops them
            case when p_kind = 'element' and (select tier from elements where symbol = p_element) = 'isotope'
                 then 'infinity'::timestamptz end, null);
    out := out || jsonb_build_array(c);
  end loop;
  perform _audit('create_qr', p_kind, jsonb_build_object('element', p_element, 'compound', p_compound,
    'cap', p_cap, 'count', p_count, 'location', p_location));
  return jsonb_build_object('ok', true, 'codes', out);
end $$;

create or replace function public.admin_list_qr() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return (select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at), '[]') from (
    select q.id, q.code, q.kind, q.element, e.name as element_name, e.tier, q.compound, c.name as compound_name,
           q.cap, q.claimed_count, q.active_from, q.active_until, q.location_label, q.enabled, q.created_at
    from qr_codes q left join elements e on e.symbol = q.element left join compounds c on c.id = q.compound) t);
end $$;

create or replace function public.admin_update_qr(p_id uuid, p_enabled boolean, p_location text, p_cap int) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  update qr_codes set enabled = p_enabled, location_label = coalesce(p_location, location_label), cap = p_cap where id = p_id;
  perform _audit('update_qr', p_id::text, jsonb_build_object('enabled', p_enabled, 'location', p_location, 'cap', p_cap));
  return jsonb_build_object('ok', true);
end $$;

-- Activate an isotope QR for N minutes and announce it on the live feed.
create or replace function public.admin_drop_isotope(p_qr uuid, p_minutes int default 30, p_hint text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  q qr_codes;
  el elements;
  ends timestamptz := now() + make_interval(mins => p_minutes);
begin
  perform _require_admin();
  select * into q from qr_codes where id = p_qr;
  select * into el from elements where symbol = q.element;
  if el.tier is distinct from 'isotope' then return jsonb_build_object('ok', false, 'error', 'not_isotope'); end if;
  update qr_codes set active_from = now(), active_until = ends, enabled = true where id = q.id;
  insert into game_events (kind, label, qr, ends_at)
  values ('isotope_drop', el.name || coalesce(nullif(' — ' || p_hint, ' — '), ''), q.id, ends);
  perform _feed('isotope_drop', null, '☢️ UNSTABLE ISOTOPE DETECTED: ' || el.name || '. ' || p_minutes || ' minutes. '
    || coalesce(nullif(p_hint, ''), 'Find it.'), jsonb_build_object('element', el.symbol, 'ends_at', ends, 'cap', q.cap));
  perform _audit('drop_isotope', q.id::text, jsonb_build_object('minutes', p_minutes, 'hint', p_hint));
  return jsonb_build_object('ok', true, 'ends_at', ends, 'element', el.name, 'cap', q.cap);
end $$;

create or replace function public.admin_open_market(p_minutes int default 10) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ends timestamptz := now() + make_interval(mins => p_minutes);
begin
  perform _require_admin();
  insert into game_events (kind, label, ends_at) values ('black_market', 'Black Market', ends);
  perform _feed('black_market', null, '🕶️ The BLACK MARKET is open for ' || p_minutes || ' minutes. Safe or gamble?',
    jsonb_build_object('ends_at', ends));
  perform _audit('open_market', null, jsonb_build_object('minutes', p_minutes));
  return jsonb_build_object('ok', true, 'ends_at', ends);
end $$;

create or replace function public.admin_end_event(p_event uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ev game_events;
begin
  perform _require_admin();
  update game_events set ends_at = now() where id = p_event returning * into ev;
  if ev.qr is not null then update qr_codes set active_until = now() where id = ev.qr; end if;
  perform _audit('end_event', p_event::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

grant execute on function
  public.admin_overview(), public.admin_players(text, int), public.admin_update_settings(jsonb),
  public.admin_freeze(uuid, int), public.admin_adjust(uuid, int, text), public.admin_disqualify(uuid, boolean),
  public.admin_rename(uuid, text), public.admin_grant_element(uuid, text),
  public.admin_create_qr(text, text, text, int, text, int), public.admin_list_qr(),
  public.admin_update_qr(uuid, boolean, text, int), public.admin_drop_isotope(uuid, int, text),
  public.admin_open_market(int), public.admin_end_event(uuid)
to authenticated;

-- Postgres grants EXECUTE to PUBLIC on new functions. Strip it from everything, so only the
-- explicit grants (player RPCs, admin RPCs, public read models) remain callable. Internal helpers
-- like _audit/_award/_require_admin end up callable by no client role.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.leaderboard(text, int), public.finale(), public.recipe_key(jsonb) to anon;
revoke execute on function public._audit(text, text, jsonb), public._require_admin() from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
