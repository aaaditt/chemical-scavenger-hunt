-- Secret Catalyst — core schema.
-- Design rule: clients can only READ their own rows (RLS) and CALL rpc functions.
-- Every game action is a SECURITY DEFINER function = one atomic transaction.

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── settings ─────────────────────────
create table public.game_settings (
  id                      int primary key default 1 check (id = 1),
  game_open               boolean not null default false,
  game_ends_at            timestamptz,
  finale_revealed         boolean not null default false,
  allowed_domain          text not null default 'dubai.bits-pilani.ac.in',
  freeze_minutes          int not null default 12,
  wrong_streak_limit      int not null default 3,
  catalysis_bonus_pct     int not null default 30,
  catalyst_code_minutes   int not null default 10,
  max_active_codes        int not null default 5,
  gift_links_per_player   int not null default 3,
  alliance_max            int not null default 3,
  alliance_leave_penalty  int not null default 50,
  market_safe_points      int not null default 100,
  market_small_points     int not null default 200,
  market_big_points       int not null default 300,
  market_p_small          numeric not null default 0.40,
  market_p_big            numeric not null default 0.25,
  market_freeze_minutes   int not null default 60,
  hints_at_signup         int not null default 2,
  scan_cooldown_seconds   int not null default 3,
  mix_cooldown_seconds    int not null default 2,
  updated_at              timestamptz not null default now()
);
insert into public.game_settings (id) values (1);

-- Emails that may sign in regardless of domain and get admin rights.
create table public.admin_emails (email text primary key);

-- ───────────────────────── catalog ─────────────────────────
create table public.catalysts (
  id     text primary key,
  name   text not null,
  emoji  text not null,
  flavor text not null default ''
);

create table public.elements (
  symbol   text primary key,
  name     text not null,
  tier     text not null check (tier in ('common','uncommon','rare','isotope')),
  points   int  not null,
  giftable boolean not null default false
);

-- Canonical "H:2,O:1" key so recipe lookup is a single index hit.
create or replace function public.recipe_key(r jsonb) returns text
language sql immutable as $$
  select coalesce(string_agg(k || ':' || (r ->> k), ',' order by k), '')
  from jsonb_object_keys(r) as k
$$;

create table public.compounds (
  id          text primary key,
  name        text not null,
  formula     text not null,
  recipe      jsonb not null,
  recipe_key  text generated always as (public.recipe_key(recipe)) stored,
  catalyst    text references public.catalysts(id),
  tier        text not null check (tier in ('basic','catalyzed','uncommon','rare','isotope','legendary')),
  points      int not null,
  riddle      text not null,
  locked_hint text,
  first_by    uuid,
  first_at    timestamptz
);
create unique index compounds_recipe_uq on public.compounds (recipe_key, coalesce(catalyst, ''));

-- ───────────────────────── players ─────────────────────────
create table public.players (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null unique,
  student_id       text,
  display_name     text not null,
  avatar_url       text,
  catalyst         text not null references public.catalysts(id),
  score            int not null default 0,
  compounds_count  int not null default 0,
  last_compound_at timestamptz,
  niche_points     int not null default 0,
  lends_count      int not null default 0,
  frozen_until     timestamptz,
  wrong_streak     int not null default 0,
  last_scan_at     timestamptz,
  last_mix_at      timestamptz,
  is_admin         boolean not null default false,
  disqualified     boolean not null default false,
  created_at       timestamptz not null default now()
);
alter table public.compounds add constraint compounds_first_by_fk
  foreign key (first_by) references public.players(id) on delete set null;

create index players_score_idx on public.players (score desc);

-- ───────────────────────── QR codes ─────────────────────────
create table public.qr_codes (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  kind           text not null check (kind in ('element','hint')),
  element        text references public.elements(symbol),
  compound       text references public.compounds(id),
  cap            int check (cap is null or cap > 0),
  claimed_count  int not null default 0,
  active_from    timestamptz,
  active_until   timestamptz,
  location_label text not null default '',
  enabled        boolean not null default true,
  created_at     timestamptz not null default now(),
  check ((kind = 'element' and element is not null) or (kind = 'hint' and compound is not null))
);

create table public.claims (
  player     uuid not null references public.players(id) on delete cascade,
  qr         uuid not null references public.qr_codes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player, qr)
);

create table public.player_elements (
  player     uuid not null references public.players(id) on delete cascade,
  element    text not null references public.elements(symbol),
  source     text not null default 'scan' check (source in ('scan','gift','admin')),
  created_at timestamptz not null default now(),
  primary key (player, element)
);

-- ───────────────────────── synthesis ─────────────────────────
create table public.syntheses (
  player          uuid not null references public.players(id) on delete cascade,
  compound        text not null references public.compounds(id),
  catalyst_lender uuid references public.players(id) on delete set null,
  points          int not null,
  created_at      timestamptz not null default now(),
  primary key (player, compound)
);

create table public.mix_attempts (
  id         bigint generated always as identity primary key,
  player     uuid not null references public.players(id) on delete cascade,
  recipe     jsonb not null,
  catalyst   text,
  success    boolean not null,
  compound   text,
  created_at timestamptz not null default now()
);
create index mix_attempts_player_idx on public.mix_attempts (player, created_at desc);

create table public.catalyst_codes (
  code       text primary key,
  owner      uuid not null references public.players(id) on delete cascade,
  catalyst   text not null references public.catalysts(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by    uuid references public.players(id) on delete set null,
  used_at    timestamptz,
  success    boolean
);
create index catalyst_codes_owner_idx on public.catalyst_codes (owner);

create table public.hint_unlocks (
  player     uuid not null references public.players(id) on delete cascade,
  compound   text not null references public.compounds(id),
  source     text not null check (source in ('signup','qr','admin')),
  created_at timestamptz not null default now(),
  primary key (player, compound)
);

-- ───────────────────────── social ─────────────────────────
create table public.gift_links (
  code        text primary key,
  owner       uuid not null references public.players(id) on delete cascade,
  element     text not null references public.elements(symbol),
  created_at  timestamptz not null default now(),
  redeemed_by uuid references public.players(id) on delete set null,
  redeemed_at timestamptz
);

create table public.alliances (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_by  uuid references public.players(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.alliance_members (
  alliance  uuid not null references public.alliances(id) on delete cascade,
  player    uuid not null references public.players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at   timestamptz,
  primary key (alliance, player)
);
create unique index alliance_one_active on public.alliance_members (player) where left_at is null;

-- ───────────────────────── events ─────────────────────────
create table public.game_events (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('isotope_drop','black_market')),
  label      text not null default '',
  qr         uuid references public.qr_codes(id) on delete set null,
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.market_plays (
  player     uuid not null references public.players(id) on delete cascade,
  event      uuid not null references public.game_events(id) on delete cascade,
  choice     text not null check (choice in ('safe','gamble')),
  outcome    text not null check (outcome in ('safe','small','big','frozen')),
  points     int not null default 0,
  created_at timestamptz not null default now(),
  primary key (player, event)
);

-- ───────────────────────── ledger / feed / audit ─────────────────────────
create table public.score_ledger (
  id         bigint generated always as identity primary key,
  player     uuid not null references public.players(id) on delete cascade,
  delta      int not null,
  reason     text not null,
  ref        text,
  created_at timestamptz not null default now()
);
create index score_ledger_player_idx on public.score_ledger (player, created_at);

-- Public live feed (display names only — never emails).
create table public.feed (
  id         bigint generated always as identity primary key,
  kind       text not null,
  player     uuid references public.players(id) on delete set null,
  message    text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index feed_created_idx on public.feed (created_at desc);

create table public.admin_actions (
  id         bigint generated always as identity primary key,
  admin      uuid references public.players(id) on delete set null,
  action     text not null,
  target     text,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ───────────────────────── RLS ─────────────────────────
alter table public.game_settings    enable row level security;
alter table public.admin_emails     enable row level security;
alter table public.catalysts        enable row level security;
alter table public.elements         enable row level security;
alter table public.compounds        enable row level security;
alter table public.players          enable row level security;
alter table public.qr_codes         enable row level security;
alter table public.claims           enable row level security;
alter table public.player_elements  enable row level security;
alter table public.syntheses        enable row level security;
alter table public.mix_attempts     enable row level security;
alter table public.catalyst_codes   enable row level security;
alter table public.hint_unlocks     enable row level security;
alter table public.gift_links       enable row level security;
alter table public.alliances        enable row level security;
alter table public.alliance_members enable row level security;
alter table public.game_events      enable row level security;
alter table public.market_plays     enable row level security;
alter table public.score_ledger     enable row level security;
alter table public.feed             enable row level security;
alter table public.admin_actions    enable row level security;

-- Public-ish reference data. (compounds is deliberately NOT readable: recipes are secret.)
create policy "read settings"  on public.game_settings for select to anon, authenticated using (true);
create policy "read catalysts" on public.catalysts     for select to anon, authenticated using (true);
create policy "read elements"  on public.elements      for select to anon, authenticated using (true);
create policy "read events"    on public.game_events   for select to anon, authenticated using (true);
create policy "read feed"      on public.feed          for select to anon, authenticated using (true);

-- Own rows only.
create policy "own player"    on public.players         for select to authenticated using (id = auth.uid());
create policy "own elements"  on public.player_elements for select to authenticated using (player = auth.uid());
create policy "own syntheses" on public.syntheses       for select to authenticated using (player = auth.uid());
create policy "own attempts"  on public.mix_attempts    for select to authenticated using (player = auth.uid());
create policy "own codes"     on public.catalyst_codes  for select to authenticated using (owner = auth.uid());
create policy "own hints"     on public.hint_unlocks    for select to authenticated using (player = auth.uid());
create policy "own gifts"     on public.gift_links      for select to authenticated using (owner = auth.uid());
create policy "own market"    on public.market_plays    for select to authenticated using (player = auth.uid());
create policy "own ledger"    on public.score_ledger    for select to authenticated using (player = auth.uid());
create policy "own claims"    on public.claims          for select to authenticated using (player = auth.uid());

-- Realtime: live feed + own player row (score/freeze updates).
alter publication supabase_realtime add table public.feed;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.game_settings;
alter publication supabase_realtime add table public.game_events;

-- Defense in depth: clients never write tables directly (only via RPCs), and the secret
-- tables are not even selectable (RLS would return 0 rows, but we don't want them queryable at all).
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.compounds, public.qr_codes, public.admin_emails, public.admin_actions from anon, authenticated;
