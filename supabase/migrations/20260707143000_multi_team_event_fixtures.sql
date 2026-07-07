do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'sport_event_status'
  ) then
    create type public.sport_event_status as enum ('draft', 'registration_open', 'completed');
  end if;

  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'event_side'
  ) then
    create type public.event_side as enum ('A', 'B');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

alter table public.sports_events
  add column if not exists sport_type text not null default 'General',
  add column if not exists venue text not null default 'TBD',
  add column if not exists players_per_side integer not null default 1,
  add column if not exists status public.sport_event_status not null default 'draft',
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.sports_events
  drop constraint if exists sports_events_players_per_side_check;

alter table public.sports_events
  add constraint sports_events_players_per_side_check
  check (players_per_side between 1 and 50);

update public.sports_events
set
  sport_type = coalesce(nullif(trim(sport_type), ''), name),
  venue = coalesce(nullif(trim(venue), ''), 'TBD'),
  players_per_side = greatest(players_per_side, 1),
  updated_at = coalesce(updated_at, created_at, timezone('utc', now()));

drop trigger if exists sports_events_set_updated_at on public.sports_events;
create trigger sports_events_set_updated_at
before update on public.sports_events
for each row
execute function public.set_updated_at();

create table if not exists public.sport_event_teams (
  id uuid primary key default gen_random_uuid(),
  sport_event_id uuid not null references public.sports_events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  side public.event_side not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (sport_event_id, team_id)
);

create table if not exists public.sport_event_players (
  id uuid primary key default gen_random_uuid(),
  sport_event_id uuid not null references public.sports_events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  side public.event_side not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint sport_event_players_event_team_fkey
    foreign key (sport_event_id, team_id)
    references public.sport_event_teams(sport_event_id, team_id)
    on delete cascade,
  unique (sport_event_id, team_id, player_id)
);

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  sport_event_id uuid not null references public.sports_events(id) on delete cascade,
  fixture_number integer not null,
  label text not null default '',
  venue text not null default 'TBD',
  status public.game_status not null default 'draft',
  side_a_team_id uuid not null references public.teams(id) on delete cascade,
  side_b_team_id uuid not null references public.teams(id) on delete cascade,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (sport_event_id, fixture_number),
  check (side_a_team_id <> side_b_team_id)
);

create table if not exists public.fixture_players (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  side public.event_side not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (fixture_id, player_id)
);

drop trigger if exists fixtures_set_updated_at on public.fixtures;
create trigger fixtures_set_updated_at
before update on public.fixtures
for each row
execute function public.set_updated_at();

create index if not exists sports_events_status_idx on public.sports_events (status);
create index if not exists sports_events_sport_type_idx on public.sports_events (sport_type);
create index if not exists sport_event_teams_event_id_idx on public.sport_event_teams (sport_event_id);
create index if not exists sport_event_teams_team_id_idx on public.sport_event_teams (team_id);
create index if not exists sport_event_teams_side_idx on public.sport_event_teams (side);
create index if not exists sport_event_players_event_id_idx on public.sport_event_players (sport_event_id);
create index if not exists sport_event_players_team_id_idx on public.sport_event_players (team_id);
create index if not exists sport_event_players_player_id_idx on public.sport_event_players (player_id);
create index if not exists sport_event_players_side_idx on public.sport_event_players (side);
create index if not exists fixtures_sport_event_id_idx on public.fixtures (sport_event_id);
create index if not exists fixtures_side_a_team_id_idx on public.fixtures (side_a_team_id);
create index if not exists fixtures_side_b_team_id_idx on public.fixtures (side_b_team_id);
create index if not exists fixtures_status_idx on public.fixtures (status);
create index if not exists fixture_players_fixture_id_idx on public.fixture_players (fixture_id);
create index if not exists fixture_players_team_id_idx on public.fixture_players (team_id);
create index if not exists fixture_players_player_id_idx on public.fixture_players (player_id);

alter table public.sport_event_teams enable row level security;
alter table public.sport_event_players enable row level security;
alter table public.fixtures enable row level security;
alter table public.fixture_players enable row level security;

drop policy if exists "Authenticated users can view sport event teams" on public.sport_event_teams;
create policy "Authenticated users can view sport event teams"
on public.sport_event_teams
for select
to authenticated
using (true);

drop policy if exists "Admins manage sport event teams" on public.sport_event_teams;
create policy "Admins manage sport event teams"
on public.sport_event_teams
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can view sport event players" on public.sport_event_players;
create policy "Authenticated users can view sport event players"
on public.sport_event_players
for select
to authenticated
using (true);

drop policy if exists "Admins and captains add sport event players" on public.sport_event_players;
create policy "Admins and captains add sport event players"
on public.sport_event_players
for insert
to authenticated
with check (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
    and exists (
      select 1
      from public.players
      where players.id = player_id
        and players.team_id = team_id
    )
    and exists (
      select 1
      from public.sport_event_teams
      where sport_event_teams.sport_event_id = sport_event_id
        and sport_event_teams.team_id = team_id
        and sport_event_teams.side = side
    )
  )
);

drop policy if exists "Admins and captains delete sport event players" on public.sport_event_players;
create policy "Admins and captains delete sport event players"
on public.sport_event_players
for delete
to authenticated
using (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
);

drop policy if exists "Authenticated users can view fixtures" on public.fixtures;
create policy "Authenticated users can view fixtures"
on public.fixtures
for select
to authenticated
using (true);

drop policy if exists "Admins manage fixtures" on public.fixtures;
create policy "Admins manage fixtures"
on public.fixtures
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can view fixture players" on public.fixture_players;
create policy "Authenticated users can view fixture players"
on public.fixture_players
for select
to authenticated
using (true);

drop policy if exists "Admins manage fixture players" on public.fixture_players;
create policy "Admins manage fixture players"
on public.fixture_players
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
