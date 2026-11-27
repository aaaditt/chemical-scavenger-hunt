-- Organizer decisions (2026-11-27):
--  * Lab number comes from the college ID (last 4 digits, e.g. F20240248 -> 0248).
--  * Names show on public surfaces (projector, live feed, leaderboard, hint book, story cards) unless the
--    player opts out; opted-out players appear as "Lab 0248".

alter table public.players add column if not exists name_public boolean not null default true;

create or replace function public._lab_no(p players) returns text
language sql immutable set search_path = public as $$
  select coalesce(
    nullif(right(regexp_replace(coalesce(p.student_id, ''), '\D', '', 'g'), 4), ''),
    upper(left(replace(p.id::text, '-', ''), 4)))
$$;

create or replace function public._public_name(p players) returns text
language sql stable set search_path = public as $$
  select case when p.name_public then p.display_name else 'Lab ' || _lab_no(p) end
$$;

-- Every feed line is written through here, so masking the actor's name once covers claim, synthesis,
-- freeze, alliance, betrayal and market lines.
create or replace function public._feed(k text, p uuid, msg text, payload jsonb default '{}') returns void
language plpgsql set search_path = public as $$
declare pl players;
begin
  select * into pl from players where id = p;
  if pl.id is not null and not pl.name_public then
    msg := replace(msg, pl.display_name, _public_name(pl));
  end if;
  insert into feed (kind, player, message, payload) values (k, p, msg, payload);
end $$;

create or replace function public.set_name_public(p_public boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me players;
begin
  update players set name_public = coalesce(p_public, true) where id = auth.uid() returning * into me;
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'not_registered'); end if;
  -- Scrub (or restore) the name in feed lines already on the projector.
  if me.name_public then
    update feed set message = replace(message, 'Lab ' || _lab_no(me), me.display_name) where player = me.id;
  else
    update feed set message = replace(message, me.display_name, 'Lab ' || _lab_no(me)) where player = me.id;
  end if;
  return jsonb_build_object('ok', true, 'name_public', me.name_public, 'public_name', _public_name(me));
end $$;

create or replace function public.leaderboard(p_kind text default 'score', p_limit int default 50) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]') from (
    select _public_name(players) as display_name, case when name_public then avatar_url end as avatar_url,
           score, compounds_count, niche_points, lends_count, is_test,
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

create or replace function public.hint_book() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  circle as (select id from me union select _allies((select id from me)))
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'tier', c.tier,
    'points', c.points,
    'riddle', c.riddle,
    'slots', (select count(*) from jsonb_object_keys(c.recipe)),
    'needs_catalyst', c.catalyst is not null,
    'name', case when c.first_by is not null or mine.player is not null then c.name end,
    'formula', case when mine.player is not null then c.formula end,
    'made', mine.player is not null,
    'locked_hint', case when exists (select 1 from hint_unlocks h where h.compound = c.id and h.player in (select id from circle))
                        then c.locked_hint end,
    'has_locked_hint', c.locked_hint is not null,
    'first_by', (select _public_name(pl) from players pl where pl.id = c.first_by)
  ) order by array_position(array['basic','catalyzed','uncommon','rare','isotope','legendary'], c.tier), c.points, c.id), '[]')
  from compounds c
  left join syntheses mine on mine.compound = c.id and mine.player = (select id from me)
$$;

create or replace function public.finale() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s game_settings := _settings();
begin
  if not s.finale_revealed then return jsonb_build_object('ok', false, 'error', 'not_revealed'); end if;
  return jsonb_build_object('ok', true,
    'catalyst_demand', (select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]') from (
        select c.id, c.name, c.emoji, count(distinct p.id) as holders, coalesce(sum(p.lends_count), 0) as lends
        from catalysts c left join players p on p.catalyst = c.id and not p.is_admin
        group by c.id order by lends desc) t),
    'top', (select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]') from (
        select _public_name(p) as display_name, case when p.name_public then p.avatar_url end as avatar_url,
               p.score, p.compounds_count, p.niche_points, c.emoji, c.name as catalyst
        from players p join catalysts c on c.id = p.catalyst
        where not p.disqualified and not p.is_admin order by p.score desc limit 10) t),
    'speed', (select row_to_json(t)::jsonb from (
        select _public_name(p) as display_name, p.compounds_count from players p where not p.disqualified and not p.is_admin
        order by p.compounds_count desc, p.last_compound_at asc nulls last limit 1) t),
    'niche', (select row_to_json(t)::jsonb from (
        select _public_name(p) as display_name, p.niche_points from players p where not p.disqualified and not p.is_admin
        order by p.niche_points desc limit 1) t),
    'sought_after', (select row_to_json(t)::jsonb from (
        select _public_name(p) as display_name, p.lends_count, c.emoji, c.name as catalyst
        from players p join catalysts c on c.id = p.catalyst
        where not p.disqualified and not p.is_admin order by p.lends_count desc limit 1) t),
    'gambler', (select row_to_json(t)::jsonb from (
        select _public_name(p) as display_name, count(*) as gambles from market_plays m join players p on p.id = m.player
        where m.choice = 'gamble' group by p.id order by gambles desc limit 1) t),
    'traitor', (select row_to_json(t)::jsonb from (
        select _public_name(p) as display_name, count(*) as betrayals from score_ledger l join players p on p.id = l.player
        where l.reason = 'betrayal' group by p.id order by betrayals desc limit 1) t),
    'discoveries', (select count(*) from compounds where first_by is not null),
    'total_compounds', (select count(*) from compounds),
    'total_syntheses', (select count(*) from syntheses)
  );
end $$;

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
      'lab_no', _lab_no(me), 'name_public', me.name_public, 'public_name', _public_name(me),
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

-- Helpers stay internal; only the new RPC joins the allow-list.
revoke execute on function public._lab_no(players), public._public_name(players), public._feed(text, uuid, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.set_name_public(boolean) from public, anon;
grant execute on function public.set_name_public(boolean) to authenticated;
