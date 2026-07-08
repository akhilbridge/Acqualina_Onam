create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'app_role'
  ) then
    create type public.app_role as enum ('admin', 'captain', 'moderator', 'player');
  end if;

  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'game_status'
  ) then
    create type public.game_status as enum ('draft', 'scheduled', 'in_progress', 'completed');
  end if;

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

alter type public.app_role add value if not exists 'moderator';
alter type public.app_role add value if not exists 'player';

create table if not exists public.app_settings (
  id text primary key default 'global' check (id = 'global'),
  public_registration_locked boolean not null default false,
  force_reauth_after timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.app_settings (id, public_registration_locked, force_reauth_after)
values ('global', false, null)
on conflict (id) do nothing;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.app_role not null default 'captain',
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  villa_number text not null,
  category text not null check (category in ('Jr Girls', 'Jr Boys', 'Girls', 'Boys', 'Ladies', 'Gents')),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sports_events (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sport_type text not null default 'General',
  event_category text not null default 'Open',
  venue text not null default 'TBD',
  players_per_side integer not null default 1 check (players_per_side between 1 and 50),
  status public.sport_event_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.sports_events (name)
values
  ('Chess'),
  ('Cricket'),
  ('Football'),
  ('Carroms'),
  ('Cards'),
  ('Badminton'),
  ('Volleyball'),
  ('Tug of War'),
  ('Table Tennis'),
  ('Kabaddi')
on conflict (name) do nothing;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  fixture_label text not null default '',
  venue text not null,
  game_date date,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  status public.game_status not null default 'scheduled',
  result_summary text not null default '',
  winner_team_id uuid references public.teams(id) on delete set null,
  team_a_id uuid not null references public.teams(id) on delete cascade,
  team_b_id uuid not null references public.teams(id) on delete cascade,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  check (team_a_id <> team_b_id)
);

create table if not exists public.game_assignments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (game_id, player_id)
);

create table if not exists public.sport_event_registrations (
  id uuid primary key default gen_random_uuid(),
  sport_event_id uuid not null references public.sports_events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (sport_event_id, player_id)
);

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

create table if not exists public.sport_event_entries (
  id uuid primary key default gen_random_uuid(),
  sport_event_id uuid not null references public.sports_events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sport_event_entry_players (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.sport_event_entries(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (entry_id, player_id)
);

create table if not exists public.public_event_interest_submissions (
  id uuid primary key default gen_random_uuid(),
  villa_number text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  player_name text not null,
  player_category text not null,
  ip_address text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (player_id)
);

create table if not exists public.public_event_interest_submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.public_event_interest_submissions(id) on delete cascade,
  sport_event_id uuid not null references public.sports_events(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (submission_id, sport_event_id)
);

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  sport_event_id uuid not null references public.sports_events(id) on delete cascade,
  fixture_number integer not null,
  label text not null default '',
  venue text not null default 'TBD',
  status public.game_status not null default 'draft',
  side_a_team_id uuid references public.teams(id) on delete cascade,
  side_b_team_id uuid references public.teams(id) on delete cascade,
  side_a_source_fixture_id uuid references public.fixtures(id) on delete set null,
  side_b_source_fixture_id uuid references public.fixtures(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (sport_event_id, fixture_number)
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

create table if not exists public.game_moderators (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  moderator_user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (game_id, moderator_user_id)
);

create index if not exists profiles_team_id_idx on public.profiles (team_id);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists players_team_id_idx on public.players (team_id);
create index if not exists sports_events_name_idx on public.sports_events (name);
create index if not exists sports_events_status_idx on public.sports_events (status);
create index if not exists sports_events_sport_type_idx on public.sports_events (sport_type);
create index if not exists sports_events_event_category_idx on public.sports_events (event_category);
create index if not exists games_team_a_id_idx on public.games (team_a_id);
create index if not exists games_team_b_id_idx on public.games (team_b_id);
create index if not exists games_game_date_idx on public.games (game_date);
create index if not exists games_status_idx on public.games (status);
create index if not exists games_winner_team_id_idx on public.games (winner_team_id);
create index if not exists game_assignments_game_id_idx on public.game_assignments (game_id);
create index if not exists game_assignments_team_id_idx on public.game_assignments (team_id);
create index if not exists game_assignments_player_id_idx on public.game_assignments (player_id);
create index if not exists sport_event_registrations_event_id_idx on public.sport_event_registrations (sport_event_id);
create index if not exists sport_event_registrations_team_id_idx on public.sport_event_registrations (team_id);
create index if not exists sport_event_registrations_player_id_idx on public.sport_event_registrations (player_id);
create index if not exists sport_event_teams_event_id_idx on public.sport_event_teams (sport_event_id);
create index if not exists sport_event_teams_team_id_idx on public.sport_event_teams (team_id);
create index if not exists sport_event_teams_side_idx on public.sport_event_teams (side);
create index if not exists sport_event_players_event_id_idx on public.sport_event_players (sport_event_id);
create index if not exists sport_event_players_team_id_idx on public.sport_event_players (team_id);
create index if not exists sport_event_players_player_id_idx on public.sport_event_players (player_id);
create index if not exists sport_event_players_side_idx on public.sport_event_players (side);
create index if not exists sport_event_entries_event_id_idx on public.sport_event_entries (sport_event_id);
create index if not exists sport_event_entries_team_id_idx on public.sport_event_entries (team_id);
create index if not exists sport_event_entry_players_entry_id_idx on public.sport_event_entry_players (entry_id);
create index if not exists sport_event_entry_players_player_id_idx on public.sport_event_entry_players (player_id);
create index if not exists public_event_interest_submissions_player_id_idx on public.public_event_interest_submissions (player_id);
create index if not exists public_event_interest_submissions_created_at_idx on public.public_event_interest_submissions (created_at);
create index if not exists public_event_interest_submission_events_submission_id_idx on public.public_event_interest_submission_events (submission_id);
create index if not exists public_event_interest_submission_events_sport_event_id_idx on public.public_event_interest_submission_events (sport_event_id);
drop view if exists public.public_event_interest_submission_summary;
create view public.public_event_interest_submission_summary
with (security_invoker = false)
as
select
  submissions.id,
  submissions.villa_number,
  submissions.player_id,
  submissions.player_name,
  submissions.player_category,
  submissions.created_at,
  submission_events.sport_event_id,
  sports_events.name as sport_event_name,
  sports_events.sport_type,
  sports_events.event_category,
  sports_events.players_per_side
from public.public_event_interest_submissions as submissions
join public.public_event_interest_submission_events as submission_events
  on submission_events.submission_id = submissions.id
join public.sports_events
  on sports_events.id = submission_events.sport_event_id;

grant select on public.public_event_interest_submission_summary to anon, authenticated;

create index if not exists fixtures_sport_event_id_idx on public.fixtures (sport_event_id);
create index if not exists fixtures_side_a_team_id_idx on public.fixtures (side_a_team_id);
create index if not exists fixtures_side_b_team_id_idx on public.fixtures (side_b_team_id);
create index if not exists fixtures_side_a_source_fixture_id_idx on public.fixtures (side_a_source_fixture_id);
create index if not exists fixtures_side_b_source_fixture_id_idx on public.fixtures (side_b_source_fixture_id);
create index if not exists fixtures_status_idx on public.fixtures (status);
create index if not exists fixture_players_fixture_id_idx on public.fixture_players (fixture_id);
create index if not exists fixture_players_team_id_idx on public.fixture_players (team_id);
create index if not exists fixture_players_player_id_idx on public.fixture_players (player_id);
create index if not exists game_moderators_game_id_idx on public.game_moderators (game_id);
create index if not exists game_moderators_moderator_user_id_idx on public.game_moderators (moderator_user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists sports_events_set_updated_at on public.sports_events;
create trigger sports_events_set_updated_at
before update on public.sports_events
for each row
execute function public.set_updated_at();

drop trigger if exists fixtures_set_updated_at on public.fixtures;
create trigger fixtures_set_updated_at
before update on public.fixtures
for each row
execute function public.set_updated_at();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

create or replace function public.handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'captain')
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_synced on auth.users;
create trigger on_auth_user_synced
after insert or update of email, raw_user_meta_data
on auth.users
for each row
execute function public.handle_auth_user();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where user_id = auth.uid()
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id
  from public.profiles
  where user_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

alter table public.teams enable row level security;
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.sports_events enable row level security;
alter table public.games enable row level security;
alter table public.game_assignments enable row level security;
alter table public.sport_event_registrations enable row level security;
alter table public.sport_event_teams enable row level security;
alter table public.sport_event_players enable row level security;
alter table public.sport_event_entries enable row level security;
alter table public.sport_event_entry_players enable row level security;
alter table public.public_event_interest_submissions enable row level security;
alter table public.public_event_interest_submission_events enable row level security;
alter table public.fixtures enable row level security;
alter table public.fixture_players enable row level security;
alter table public.game_moderators enable row level security;

drop policy if exists "Authenticated users can view teams" on public.teams;
create policy "Authenticated users can view teams"
on public.teams
for select
to authenticated
using (true);

drop policy if exists "Admins manage teams" on public.teams;
create policy "Admins manage teams"
on public.teams
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can view app settings" on public.app_settings;
create policy "Anyone can view app settings"
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Admins update app settings" on public.app_settings;
create policy "Admins update app settings"
on public.app_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can view players" on public.players;
create policy "Authenticated users can view players"
on public.players
for select
to authenticated
using (true);

drop policy if exists "Anonymous users can view players" on public.players;
create policy "Anonymous users can view players"
on public.players
for select
to anon
using (true);

drop policy if exists "Authenticated users can view sports events" on public.sports_events;
create policy "Authenticated users can view sports events"
on public.sports_events
for select
to authenticated
using (true);

drop policy if exists "Anonymous users can view sports events" on public.sports_events;
create policy "Anonymous users can view sports events"
on public.sports_events
for select
to anon
using (true);

drop policy if exists "Admins manage sports events" on public.sports_events;
create policy "Admins manage sports events"
on public.sports_events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins and captains add players" on public.players;
create policy "Admins and captains add players"
on public.players
for insert
to authenticated
with check (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
);

drop policy if exists "Admins manage players" on public.players;
drop policy if exists "Admins and captains manage players" on public.players;
create policy "Admins and captains manage players"
on public.players
for update
to authenticated
using (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
)
with check (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
);

drop policy if exists "Admins delete players" on public.players;
drop policy if exists "Admins and captains delete players" on public.players;
create policy "Admins and captains delete players"
on public.players
for delete
to authenticated
using (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
);

drop policy if exists "Authenticated users can view games" on public.games;
create policy "Authenticated users can view games"
on public.games
for select
to authenticated
using (true);

drop policy if exists "Admins manage games" on public.games;
create policy "Admins manage games"
on public.games
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can view assignments" on public.game_assignments;
create policy "Authenticated users can view assignments"
on public.game_assignments
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can view registrations" on public.sport_event_registrations;
create policy "Authenticated users can view registrations"
on public.sport_event_registrations
for select
to authenticated
using (true);

drop policy if exists "Admins and captains add assignments" on public.game_assignments;
create policy "Admins and captains add assignments"
on public.game_assignments
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
      from public.games
      where games.id = game_id
        and (games.team_a_id = team_id or games.team_b_id = team_id)
    )
  )
);

drop policy if exists "Admins and captains delete assignments" on public.game_assignments;
create policy "Admins and captains delete assignments"
on public.game_assignments
for delete
to authenticated
using (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
);

drop policy if exists "Admins and captains add registrations" on public.sport_event_registrations;
create policy "Admins and captains add registrations"
on public.sport_event_registrations
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
  )
);

drop policy if exists "Admins and captains delete registrations" on public.sport_event_registrations;
create policy "Admins and captains delete registrations"
on public.sport_event_registrations
for delete
to authenticated
using (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
);

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

drop policy if exists "Authenticated users can view sport event entries" on public.sport_event_entries;
create policy "Authenticated users can view sport event entries"
on public.sport_event_entries
for select
to authenticated
using (true);

drop policy if exists "Admins and captains add sport event entries" on public.sport_event_entries;
create policy "Admins and captains add sport event entries"
on public.sport_event_entries
for insert
to authenticated
with check (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
);

drop policy if exists "Admins and captains delete sport event entries" on public.sport_event_entries;
create policy "Admins and captains delete sport event entries"
on public.sport_event_entries
for delete
to authenticated
using (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
);

drop policy if exists "Authenticated users can view sport event entry players" on public.sport_event_entry_players;
create policy "Authenticated users can view sport event entry players"
on public.sport_event_entry_players
for select
to authenticated
using (true);

drop policy if exists "Admins and captains add sport event entry players" on public.sport_event_entry_players;
create policy "Admins and captains add sport event entry players"
on public.sport_event_entry_players
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.sport_event_entries
    join public.players on players.id = player_id
    where sport_event_entries.id = entry_id
      and sport_event_entries.team_id = public.current_user_team_id()
      and players.team_id = public.current_user_team_id()
  )
);

drop policy if exists "Admins and captains delete sport event entry players" on public.sport_event_entry_players;
create policy "Admins and captains delete sport event entry players"
on public.sport_event_entry_players
for delete
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.sport_event_entries
    where sport_event_entries.id = entry_id
      and sport_event_entries.team_id = public.current_user_team_id()
  )
);

drop policy if exists "Admins view public event interest submissions" on public.public_event_interest_submissions;
drop policy if exists "Admins and captains view public event interest submissions" on public.public_event_interest_submissions;
create policy "Admins and captains view public event interest submissions"
on public.public_event_interest_submissions
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.players
    where players.id = public_event_interest_submissions.player_id
      and players.team_id = public.current_user_team_id()
  )
);

drop policy if exists "Admins update public event interest submissions" on public.public_event_interest_submissions;
create policy "Admins update public event interest submissions"
on public.public_event_interest_submissions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete public event interest submissions" on public.public_event_interest_submissions;
create policy "Admins delete public event interest submissions"
on public.public_event_interest_submissions
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins view public event interest submission events" on public.public_event_interest_submission_events;
drop policy if exists "Admins and captains view public event interest submission events" on public.public_event_interest_submission_events;
create policy "Admins and captains view public event interest submission events"
on public.public_event_interest_submission_events
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.public_event_interest_submissions as submissions
    join public.players on players.id = submissions.player_id
    where submissions.id = public_event_interest_submission_events.submission_id
      and players.team_id = public.current_user_team_id()
  )
);

drop policy if exists "Admins add public event interest submission events" on public.public_event_interest_submission_events;
create policy "Admins add public event interest submission events"
on public.public_event_interest_submission_events
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins delete public event interest submission events" on public.public_event_interest_submission_events;
create policy "Admins delete public event interest submission events"
on public.public_event_interest_submission_events
for delete
to authenticated
using (public.is_admin());

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

drop policy if exists "Authenticated users can view game moderators" on public.game_moderators;
create policy "Authenticated users can view game moderators"
on public.game_moderators
for select
to authenticated
using (true);

drop policy if exists "Admins manage game moderators" on public.game_moderators;
create policy "Admins manage game moderators"
on public.game_moderators
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
