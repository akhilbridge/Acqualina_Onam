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

create index if not exists sport_event_entries_event_id_idx on public.sport_event_entries (sport_event_id);
create index if not exists sport_event_entries_team_id_idx on public.sport_event_entries (team_id);
create index if not exists sport_event_entry_players_entry_id_idx on public.sport_event_entry_players (entry_id);
create index if not exists sport_event_entry_players_player_id_idx on public.sport_event_entry_players (player_id);

alter table public.sport_event_entries enable row level security;
alter table public.sport_event_entry_players enable row level security;

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
