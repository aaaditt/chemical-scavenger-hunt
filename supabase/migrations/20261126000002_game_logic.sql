-- Secret Catalyst — game logic. All player actions return jsonb: {ok: true, ...} or {ok: false, error: '<code>', ...}.

-- ───────────────────────── helpers ─────────────────────────
create or replace function public._gen_code(len int) returns text
language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no I/L/O/0/1
  bytes bytea := gen_random_bytes(len);
  out text := '';
begin
  for i in 0 .. len - 1 loop
    out := out || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return out;
end $$;

create or replace function public._settings() returns public.game_settings
language sql stable set search_path = public as $$ select * from game_settings where id = 1 $$;

create or replace function public._award(p uuid, delta int, reason text, ref text default null) returns void
language plpgsql set search_path = public as $$
begin
  if delta = 0 then return; end if;
  insert into score_ledger (player, delta, reason, ref) values (p, delta, reason, ref);
  update players set score = score + delta where id = p;
end $$;

create or replace function public._feed(k text, p uuid, msg text, payload jsonb default '{}') returns void
language sql set search_path = public as $$
  insert into feed (kind, player, message, payload) values (k, p, msg, payload)
$$;

-- Active allies of a player (excluding the player).
create or replace function public._allies(p uuid) returns setof uuid
language sql stable set search_path = public as $$
  select m2.player
  from alliance_members m1
  join alliance_members m2 on m2.alliance = m1.alliance and m2.left_at is null and m2.player <> p
  where m1.player = p and m1.left_at is null
$$;

-- Common gate for player actions. Returns null if OK, otherwise an error jsonb.
create or replace function public._gate(me public.players, check_frozen boolean default true) returns jsonb
language plpgsql stable set search_path = public as $$
declare s game_settings := _settings();
begin
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'not_registered'); end if;
  if me.disqualified then return jsonb_build_object('ok', false, 'error', 'disqualified'); end if;
  if not s.game_open and not me.is_admin then return jsonb_build_object('ok', false, 'error', 'game_closed'); end if;
  if check_frozen and me.frozen_until is not null and me.frozen_until > now() then
    return jsonb_build_object('ok', false, 'error', 'frozen', 'frozen_until', me.frozen_until);
  end if;
  return null;
end $$;

-- ───────────────────────── auth: domain gate + player creation ─────────────────────────
create or replace function public._auth_domain_gate() returns trigger
language plpgsql security definer set search_path = public as $$
declare dom text := (select allowed_domain from game_settings where id = 1);
begin
  if new.email is null then
    raise exception 'Sign in with your BITS Pilani Dubai Google account.';
  end if;
  if lower(new.email) not like '%@' || dom
     and not exists (select 1 from admin_emails where email = lower(new.email)) then
    raise exception 'Only @% accounts can play.', dom;
  end if;
  return new;
end $$;

create trigger auth_domain_gate before insert on auth.users
  for each row execute function public._auth_domain_gate();

create or replace function public._create_player() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cat text;
  local text := split_part(lower(new.email), '@', 1);
  nm text := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), local);
  s game_settings := _settings();
begin
  -- Balanced secret catalyst: pick among the least-assigned, random tiebreak.
  select c.id into cat
  from catalysts c
  left join players p on p.catalyst = c.id
  group by c.id
  order by count(p.id), random()
  limit 1;

  insert into players (id, email, student_id, display_name, avatar_url, catalyst, is_admin)
  values (
    new.id, lower(new.email),
    case when local ~ '^[a-z]\d{6,}' then upper(local) else null end,
    left(nm, 32),
    new.raw_user_meta_data ->> 'avatar_url',
    cat,
    exists (select 1 from admin_emails where email = lower(new.email))
  );

  -- Random locked hints handed out at signup (tradeable knowledge).
  insert into hint_unlocks (player, compound, source)
  select new.id, id, 'signup' from compounds
  where locked_hint is not null
  order by random() limit s.hints_at_signup;

  return new;
end $$;

create trigger auth_create_player after insert on auth.users
  for each row execute function public._create_player();

-- ───────────────────────── read models ─────────────────────────
-- Everything the player app needs in one round trip.
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
  where score > me.score and not disqualified and not is_admin;

  return jsonb_build_object(
    'ok', true,
    'player', jsonb_build_object(
      'id', me.id, 'display_name', me.display_name, 'student_id', me.student_id, 'avatar_url', me.avatar_url,
      'score', me.score, 'rank', my_rank, 'compounds_count', me.compounds_count, 'niche_points', me.niche_points,
      'lends_count', me.lends_count, 'frozen_until', me.frozen_until, 'wrong_streak', me.wrong_streak,
      'is_admin', me.is_admin, 'disqualified', me.disqualified,
      'catalyst', (select to_jsonb(c) from catalysts c where c.id = me.catalyst)
    ),
    'settings', jsonb_build_object(
      'game_open', s.game_open, 'game_ends_at', s.game_ends_at, 'wrong_streak_limit', s.wrong_streak_limit,
      'freeze_minutes', s.freeze_minutes, 'gift_links_per_player', s.gift_links_per_player,
      'alliance_max', s.alliance_max, 'alliance_leave_penalty', s.alliance_leave_penalty,
      'catalysis_bonus_pct', s.catalysis_bonus_pct, 'market_safe_points', s.market_safe_points,
      'market_small_points', s.market_small_points, 'market_big_points', s.market_big_points,
      'market_freeze_minutes', s.market_freeze_minutes, 'finale_revealed', s.finale_revealed
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

-- Hint Book: riddles for all compounds. Names are revealed once ANYONE has discovered the compound
-- (spreads knowledge through the live feed); formula only once YOU made it; locked hints if you or an ally unlocked it.
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
    'first_by', (select display_name from players where id = c.first_by)
  ) order by array_position(array['basic','catalyzed','uncommon','rare','isotope','legendary'], c.tier), c.points, c.id), '[]')
  from compounds c
  left join syntheses mine on mine.compound = c.id and mine.player = (select id from me)
$$;

create or replace function public.leaderboard(p_kind text default 'score', p_limit int default 50) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]') from (
    select display_name, avatar_url, score, compounds_count, niche_points, lends_count,
           rank() over (order by
             case p_kind when 'compounds' then compounds_count when 'niche' then niche_points
                         when 'catalyst' then lends_count else score end desc,
             case when p_kind = 'compounds' then last_compound_at end asc nulls last) as rank
    from players
    where not disqualified and not is_admin
    order by rank, display_name
    limit least(p_limit, 200)
  ) t
$$;

-- ───────────────────────── scanning ─────────────────────────
create or replace function public.claim_qr(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  s game_settings := _settings();
  q qr_codes;
  el elements;
  err jsonb;
  inserted int;
begin
  select * into me from players where id = auth.uid() for update;
  err := _gate(me);
  if err is not null then return err; end if;

  if me.last_scan_at is not null and me.last_scan_at > now() - make_interval(secs => s.scan_cooldown_seconds) then
    return jsonb_build_object('ok', false, 'error', 'slow_down');
  end if;
  update players set last_scan_at = now() where id = me.id;

  select * into q from qr_codes where code = upper(trim(p_code)) and enabled for update;
  if q.id is null then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if q.active_from is not null and now() < q.active_from then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if q.active_until is not null and now() > q.active_until then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  if exists (select 1 from claims where player = me.id and qr = q.id) then
    return jsonb_build_object('ok', true, 'status', 'already_claimed', 'element', q.element, 'compound', q.compound);
  end if;
  if q.cap is not null and q.claimed_count >= q.cap then
    return jsonb_build_object('ok', false, 'error', 'capped_out', 'cap', q.cap);
  end if;

  insert into claims (player, qr) values (me.id, q.id);
  update qr_codes set claimed_count = claimed_count + 1 where id = q.id;

  if q.kind = 'hint' then
    insert into hint_unlocks (player, compound, source) values (me.id, q.compound, 'qr') on conflict do nothing;
    return jsonb_build_object('ok', true, 'status', 'hint_unlocked', 'compound', q.compound,
      'riddle', (select riddle from compounds where id = q.compound),
      'locked_hint', (select locked_hint from compounds where id = q.compound));
  end if;

  select * into el from elements where symbol = q.element;
  insert into player_elements (player, element, source) values (me.id, el.symbol, 'scan') on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return jsonb_build_object('ok', true, 'status', 'duplicate_element', 'element', to_jsonb(el));
  end if;

  perform _award(me.id, el.points, 'scan', el.symbol);
  if el.tier in ('rare','isotope') then
    perform _feed(case when el.tier = 'isotope' then 'isotope' else 'rare' end, me.id,
      me.display_name || ' captured ' || el.name ||
        case when q.cap is not null then ' (' || (q.cap - q.claimed_count - 1) || ' left)' else '' end,
      jsonb_build_object('element', el.symbol));
  end if;
  return jsonb_build_object('ok', true, 'status', 'new_element', 'element', to_jsonb(el), 'points', el.points,
    'remaining', case when q.cap is not null then q.cap - q.claimed_count - 1 end);
end $$;

-- ───────────────────────── catalysts ─────────────────────────
create or replace function public.create_catalyst_code() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  s game_settings := _settings();
  err jsonb;
  c text;
  active int;
begin
  select * into me from players where id = auth.uid();
  err := _gate(me, false);
  if err is not null then return err; end if;

  select count(*) into active from catalyst_codes where owner = me.id and used_at is null and expires_at > now();
  if active >= s.max_active_codes then
    return jsonb_build_object('ok', false, 'error', 'too_many_codes', 'max', s.max_active_codes);
  end if;

  loop
    c := _gen_code(6);
    exit when not exists (select 1 from catalyst_codes where code = c);
  end loop;
  insert into catalyst_codes (code, owner, catalyst, expires_at)
  values (c, me.id, me.catalyst, now() + make_interval(mins => s.catalyst_code_minutes));
  return jsonb_build_object('ok', true, 'code', c, 'expires_at', now() + make_interval(mins => s.catalyst_code_minutes));
end $$;

-- ───────────────────────── synthesis ─────────────────────────
-- p_recipe: {"H":2,"O":1}. p_catalyst: null | 'own' | a lent catalyst code.
create or replace function public.synthesize(p_recipe jsonb, p_catalyst text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  s game_settings := _settings();
  err jsonb;
  k text;
  qty int;
  el elements;
  cat text := null;
  code_row catalyst_codes;
  key text;
  cmp compounds;
  first boolean := false;
  bonus int;
  lender_name text;
begin
  select * into me from players where id = auth.uid() for update;
  err := _gate(me);
  if err is not null then return err; end if;

  if me.last_mix_at is not null and me.last_mix_at > now() - make_interval(secs => s.mix_cooldown_seconds) then
    return jsonb_build_object('ok', false, 'error', 'slow_down');
  end if;
  update players set last_mix_at = now() where id = me.id;

  if jsonb_typeof(p_recipe) <> 'object' or p_recipe = '{}'::jsonb then
    return jsonb_build_object('ok', false, 'error', 'empty_recipe');
  end if;

  -- Validate quantities + ownership (allies lend their COMMON elements).
  for k in select jsonb_object_keys(p_recipe) loop
    begin
      qty := (p_recipe ->> k)::int;
    exception when others then
      return jsonb_build_object('ok', false, 'error', 'bad_quantity', 'element', k);
    end;
    if qty < 1 or qty > 99 then return jsonb_build_object('ok', false, 'error', 'bad_quantity', 'element', k); end if;
    select * into el from elements where symbol = k;
    if el.symbol is null then return jsonb_build_object('ok', false, 'error', 'unknown_element', 'element', k); end if;
    if not exists (select 1 from player_elements where player = me.id and element = k)
       and not (el.tier = 'common' and exists (
         select 1 from player_elements where element = k and player in (select _allies(me.id)))) then
      return jsonb_build_object('ok', false, 'error', 'missing_element', 'element', k);
    end if;
  end loop;

  -- Resolve catalyst.
  if p_catalyst is not null and trim(p_catalyst) <> '' then
    if lower(trim(p_catalyst)) = 'own' then
      cat := me.catalyst;
    else
      select * into code_row from catalyst_codes where code = upper(trim(p_catalyst)) for update;
      if code_row.code is null then return jsonb_build_object('ok', false, 'error', 'bad_catalyst_code'); end if;
      if code_row.owner = me.id then cat := me.catalyst; code_row := null;
      elsif code_row.used_at is not null then return jsonb_build_object('ok', false, 'error', 'code_used');
      elsif code_row.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'code_expired');
      else cat := code_row.catalyst;
      end if;
    end if;
  end if;

  -- Match: exact catalyst first, then a catalyst-free compound (an unneeded catalyst doesn't hurt).
  key := recipe_key(
    (select jsonb_object_agg(k2, (p_recipe ->> k2)::int) from jsonb_object_keys(p_recipe) k2));
  select * into cmp from compounds
  where recipe_key = key and (catalyst is not distinct from cat or catalyst is null)
  order by (catalyst is not distinct from cat) desc
  limit 1;

  if cmp.id is not null and exists (select 1 from syntheses where player = me.id and compound = cmp.id) then
    return jsonb_build_object('ok', true, 'status', 'already_made', 'compound', cmp.id, 'name', cmp.name);
  end if;

  -- A lent code is burned on any real attempt.
  if code_row.code is not null then
    update catalyst_codes set used_by = me.id, used_at = now(), success = (cmp.id is not null)
    where code = code_row.code;
  end if;

  insert into mix_attempts (player, recipe, catalyst, success, compound)
  values (me.id, p_recipe, cat, cmp.id is not null, cmp.id);

  if cmp.id is null then
    if me.wrong_streak + 1 >= s.wrong_streak_limit then
      update players set wrong_streak = 0, frozen_until = now() + make_interval(mins => s.freeze_minutes) where id = me.id;
      perform _feed('freeze', me.id, me.display_name || '''s lab overheated and froze 🧊', '{}');
      return jsonb_build_object('ok', true, 'status', 'frozen', 'frozen_until', now() + make_interval(mins => s.freeze_minutes));
    end if;
    update players set wrong_streak = wrong_streak + 1 where id = me.id;
    return jsonb_build_object('ok', true, 'status', 'failed', 'tries_left', s.wrong_streak_limit - me.wrong_streak - 1);
  end if;

  -- Success.
  insert into syntheses (player, compound, catalyst_lender, points)
  values (me.id, cmp.id, case when cmp.catalyst is not null then code_row.owner end, cmp.points);
  update players set
    wrong_streak = 0,
    compounds_count = compounds_count + 1,
    last_compound_at = now(),
    niche_points = niche_points + case when cmp.tier in ('rare','isotope','legendary') then cmp.points else 0 end
  where id = me.id;
  perform _award(me.id, cmp.points, 'synthesis', cmp.id);

  if cmp.catalyst is not null and code_row.owner is not null then
    bonus := round(cmp.points * s.catalysis_bonus_pct / 100.0);
    perform _award(code_row.owner, bonus, 'catalysis', cmp.id);
    update players set lends_count = lends_count + 1 where id = code_row.owner;
    select display_name into lender_name from players where id = code_row.owner;
  end if;

  update compounds set first_by = me.id, first_at = now() where id = cmp.id and first_by is null;
  first := found;
  if first then
    perform _feed('first_discovery', me.id, me.display_name || ' discovered ' || cmp.name || ' — first on campus!',
      jsonb_build_object('compound', cmp.id, 'tier', cmp.tier));
  elsif cmp.tier in ('rare','isotope','legendary') then
    perform _feed('synthesis', me.id, me.display_name || ' synthesized ' || cmp.name,
      jsonb_build_object('compound', cmp.id, 'tier', cmp.tier));
  end if;

  return jsonb_build_object('ok', true, 'status', 'success',
    'compound', jsonb_build_object('id', cmp.id, 'name', cmp.name, 'formula', cmp.formula, 'tier', cmp.tier,
      'points', cmp.points, 'catalyst', cmp.catalyst),
    'first', first, 'lender', lender_name, 'lender_bonus', bonus);
end $$;

-- ───────────────────────── gifts ─────────────────────────
create or replace function public.create_gift_link(p_element text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  s game_settings := _settings();
  err jsonb;
  el elements;
  c text;
begin
  select * into me from players where id = auth.uid() for update;
  err := _gate(me, false);
  if err is not null then return err; end if;
  select * into el from elements where symbol = p_element;
  if el.symbol is null or not el.giftable then return jsonb_build_object('ok', false, 'error', 'not_giftable'); end if;
  if not exists (select 1 from player_elements where player = me.id and element = el.symbol) then
    return jsonb_build_object('ok', false, 'error', 'missing_element');
  end if;
  if (select count(*) from gift_links where owner = me.id) >= s.gift_links_per_player then
    return jsonb_build_object('ok', false, 'error', 'no_gifts_left');
  end if;
  loop
    c := _gen_code(8);
    exit when not exists (select 1 from gift_links where code = c);
  end loop;
  insert into gift_links (code, owner, element) values (c, me.id, el.symbol);
  return jsonb_build_object('ok', true, 'code', c, 'element', el.symbol);
end $$;

create or replace function public.redeem_gift(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  err jsonb;
  g gift_links;
  el elements;
  from_name text;
begin
  select * into me from players where id = auth.uid() for update;
  err := _gate(me, false);
  if err is not null then return err; end if;
  select * into g from gift_links where code = upper(trim(p_code)) for update;
  if g.code is null then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if g.owner = me.id then return jsonb_build_object('ok', false, 'error', 'own_gift'); end if;
  if g.redeemed_at is not null then return jsonb_build_object('ok', false, 'error', 'gift_used'); end if;
  if exists (select 1 from player_elements where player = me.id and element = g.element) then
    return jsonb_build_object('ok', false, 'error', 'already_have', 'element', g.element);
  end if;
  select * into el from elements where symbol = g.element;
  update gift_links set redeemed_by = me.id, redeemed_at = now() where code = g.code;
  insert into player_elements (player, element, source) values (me.id, el.symbol, 'gift');
  perform _award(me.id, el.points, 'gift', el.symbol);
  select display_name into from_name from players where id = g.owner;
  return jsonb_build_object('ok', true, 'element', to_jsonb(el), 'from', from_name, 'points', el.points);
end $$;

-- ───────────────────────── alliances ─────────────────────────
create or replace function public.my_alliance() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when a.id is null then jsonb_build_object('ok', true, 'alliance', null) else
    jsonb_build_object('ok', true, 'alliance', jsonb_build_object(
      'id', a.id, 'name', a.name, 'invite_code', a.invite_code,
      'members', (select jsonb_agg(jsonb_build_object('name', p.display_name, 'avatar_url', p.avatar_url,
                   'score', p.score, 'me', p.id = auth.uid(),
                   'common', (select coalesce(jsonb_agg(pe.element order by pe.element), '[]') from player_elements pe
                              join elements e on e.symbol = pe.element where pe.player = p.id and e.tier = 'common'))
                   order by m.joined_at)
                  from alliance_members m join players p on p.id = m.player
                  where m.alliance = a.id and m.left_at is null)))
  end
  from (select 1) one
  left join alliance_members me on me.player = auth.uid() and me.left_at is null
  left join alliances a on a.id = me.alliance
$$;

create or replace function public.alliance_create(p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  err jsonb;
  a uuid;
  c text;
  nm text := left(trim(coalesce(p_name, '')), 28);
begin
  select * into me from players where id = auth.uid() for update;
  err := _gate(me, false);
  if err is not null then return err; end if;
  if length(nm) < 2 then return jsonb_build_object('ok', false, 'error', 'bad_name'); end if;
  if exists (select 1 from alliance_members where player = me.id and left_at is null) then
    return jsonb_build_object('ok', false, 'error', 'already_in_alliance');
  end if;
  loop
    c := _gen_code(6);
    exit when not exists (select 1 from alliances where invite_code = c);
  end loop;
  insert into alliances (name, invite_code, created_by) values (nm, c, me.id) returning id into a;
  insert into alliance_members (alliance, player) values (a, me.id);
  perform _feed('alliance', me.id, me.display_name || ' founded the alliance "' || nm || '"', '{}');
  return jsonb_build_object('ok', true, 'invite_code', c);
end $$;

create or replace function public.alliance_join(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  s game_settings := _settings();
  err jsonb;
  a alliances;
  n int;
begin
  select * into me from players where id = auth.uid() for update;
  err := _gate(me, false);
  if err is not null then return err; end if;
  if exists (select 1 from alliance_members where player = me.id and left_at is null) then
    return jsonb_build_object('ok', false, 'error', 'already_in_alliance');
  end if;
  select * into a from alliances where invite_code = upper(trim(p_code)) for update;
  if a.id is null then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if exists (select 1 from alliance_members where alliance = a.id and player = me.id) then
    return jsonb_build_object('ok', false, 'error', 'cannot_rejoin');
  end if;
  select count(*) into n from alliance_members where alliance = a.id and left_at is null;
  if n >= s.alliance_max then return jsonb_build_object('ok', false, 'error', 'alliance_full'); end if;
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'alliance_dissolved'); end if;
  insert into alliance_members (alliance, player) values (a.id, me.id);
  perform _feed('alliance', me.id, me.display_name || ' joined "' || a.name || '"', '{}');
  return jsonb_build_object('ok', true, 'alliance', a.name);
end $$;

create or replace function public.alliance_leave() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  s game_settings := _settings();
  a alliances;
begin
  select * into me from players where id = auth.uid() for update;
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'not_registered'); end if;
  select al.* into a from alliances al join alliance_members m on m.alliance = al.id
  where m.player = me.id and m.left_at is null;
  if a.id is null then return jsonb_build_object('ok', false, 'error', 'not_in_alliance'); end if;
  update alliance_members set left_at = now() where alliance = a.id and player = me.id;
  perform _award(me.id, -s.alliance_leave_penalty, 'betrayal', a.id::text);
  perform _feed('betrayal', me.id, me.display_name || ' betrayed "' || a.name || '" 🗡️', '{}');
  return jsonb_build_object('ok', true, 'penalty', s.alliance_leave_penalty);
end $$;

-- ───────────────────────── black market ─────────────────────────
create or replace function public.market_play(p_choice text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  s game_settings := _settings();
  err jsonb;
  ev game_events;
  r numeric := random();
  outcome text;
  pts int := 0;
begin
  if p_choice not in ('safe','gamble') then return jsonb_build_object('ok', false, 'error', 'bad_choice'); end if;
  select * into me from players where id = auth.uid() for update;
  err := _gate(me);
  if err is not null then return err; end if;
  select * into ev from game_events where kind = 'black_market' and starts_at <= now() and ends_at > now()
  order by starts_at desc limit 1;
  if ev.id is null then return jsonb_build_object('ok', false, 'error', 'market_closed'); end if;
  if exists (select 1 from market_plays where player = me.id and event = ev.id) then
    return jsonb_build_object('ok', false, 'error', 'already_played');
  end if;

  if p_choice = 'safe' then
    outcome := 'safe'; pts := s.market_safe_points;
  elsif r < s.market_p_big then
    outcome := 'big'; pts := s.market_big_points;
  elsif r < s.market_p_big + s.market_p_small then
    outcome := 'small'; pts := s.market_small_points;
  else
    outcome := 'frozen';
  end if;

  insert into market_plays (player, event, choice, outcome, points) values (me.id, ev.id, p_choice, outcome, pts);
  if outcome = 'frozen' then
    update players set frozen_until = greatest(coalesce(frozen_until, now()), now()) + make_interval(mins => s.market_freeze_minutes)
    where id = me.id;
    perform _feed('market', me.id, me.display_name || ' gambled at the black market... and got their lab FROZEN 🥶', '{}');
  else
    perform _award(me.id, pts, 'market', outcome);
    if p_choice = 'gamble' then
      perform _feed('market', me.id, me.display_name || ' gambled at the black market and won +' || pts || ' 💰', '{}');
    end if;
  end if;
  return jsonb_build_object('ok', true, 'outcome', outcome, 'points', pts,
    'frozen_until', (select frozen_until from players where id = me.id));
end $$;

-- ───────────────────────── profile ─────────────────────────
create or replace function public.set_display_name(p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare nm text := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 24);
begin
  if length(nm) < 2 then return jsonb_build_object('ok', false, 'error', 'bad_name'); end if;
  update players set display_name = nm where id = auth.uid();
  return jsonb_build_object('ok', true, 'display_name', nm);
end $$;

-- ───────────────────────── recap + finale ─────────────────────────
create or replace function public.my_recap() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select * from players where id = auth.uid())
  select jsonb_build_object(
    'ok', true,
    'name', me.display_name,
    'catalyst', (select to_jsonb(c) from catalysts c where c.id = me.catalyst),
    'score', me.score,
    'rank', (select count(*) + 1 from players p where p.score > me.score and not p.disqualified and not p.is_admin),
    'players', (select count(*) from players where not disqualified and not is_admin),
    'elements', (select count(*) from player_elements where player = me.id),
    'rarest_element', (select e.name from player_elements pe join elements e on e.symbol = pe.element
                       where pe.player = me.id order by e.points desc, pe.created_at limit 1),
    'compounds', me.compounds_count,
    'best_compound', (select c.name from syntheses s join compounds c on c.id = s.compound
                      where s.player = me.id order by s.points desc limit 1),
    'firsts', (select coalesce(jsonb_agg(name), '[]') from compounds where first_by = me.id),
    'lends', me.lends_count,
    'catalysis_points', (select coalesce(sum(delta), 0) from score_ledger where player = me.id and reason = 'catalysis'),
    'failed_mixes', (select count(*) from mix_attempts where player = me.id and not success),
    'gambles', (select coalesce(jsonb_agg(outcome), '[]') from market_plays where player = me.id and choice = 'gamble'),
    'betrayals', (select count(*) from score_ledger where player = me.id and reason = 'betrayal'),
    'first_scan_at', (select min(created_at) from player_elements where player = me.id),
    'last_compound_at', me.last_compound_at
  ) from me
$$;

-- Big-screen finale. Catalysts are only revealed once admins flip finale_revealed.
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
        select p.display_name, p.avatar_url, p.score, p.compounds_count, p.niche_points, c.emoji, c.name as catalyst
        from players p join catalysts c on c.id = p.catalyst
        where not p.disqualified and not p.is_admin order by p.score desc limit 10) t),
    'speed', (select row_to_json(t)::jsonb from (
        select display_name, compounds_count from players where not disqualified and not is_admin
        order by compounds_count desc, last_compound_at asc nulls last limit 1) t),
    'niche', (select row_to_json(t)::jsonb from (
        select display_name, niche_points from players where not disqualified and not is_admin
        order by niche_points desc limit 1) t),
    'sought_after', (select row_to_json(t)::jsonb from (
        select p.display_name, p.lends_count, c.emoji, c.name as catalyst from players p join catalysts c on c.id = p.catalyst
        where not p.disqualified and not p.is_admin order by p.lends_count desc limit 1) t),
    'gambler', (select row_to_json(t)::jsonb from (
        select p.display_name, count(*) as gambles from market_plays m join players p on p.id = m.player
        where m.choice = 'gamble' group by p.display_name order by gambles desc limit 1) t),
    'traitor', (select row_to_json(t)::jsonb from (
        select p.display_name, count(*) as betrayals from score_ledger l join players p on p.id = l.player
        where l.reason = 'betrayal' group by p.display_name order by betrayals desc limit 1) t),
    'discoveries', (select count(*) from compounds where first_by is not null),
    'total_compounds', (select count(*) from compounds),
    'total_syntheses', (select count(*) from syntheses)
  );
end $$;

-- ───────────────────────── grants ─────────────────────────
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.my_state(), public.hint_book(), public.claim_qr(text),
  public.create_catalyst_code(), public.synthesize(jsonb, text), public.create_gift_link(text),
  public.redeem_gift(text), public.my_alliance(), public.alliance_create(text), public.alliance_join(text),
  public.alliance_leave(), public.market_play(text), public.set_display_name(text), public.my_recap()
  to authenticated;
grant execute on function public.leaderboard(text, int), public.finale() to anon, authenticated;
grant execute on function public.recipe_key(jsonb) to anon, authenticated;
