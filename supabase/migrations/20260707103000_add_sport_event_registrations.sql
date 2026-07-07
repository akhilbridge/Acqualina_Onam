create table if not exists public.sport_event_registrations (
  id uuid primary key default gen_random_uuid(),
  sport_event_id uuid not null references public.sports_events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (sport_event_id, player_id)
);

create index if not exists sport_event_registrations_event_id_idx on public.sport_event_registrations (sport_event_id);
create index if not exists sport_event_registrations_team_id_idx on public.sport_event_registrations (team_id);
create index if not exists sport_event_registrations_player_id_idx on public.sport_event_registrations (player_id);

alter table public.sport_event_registrations enable row level security;

drop policy if exists "Authenticated users can view registrations" on public.sport_event_registrations;
create policy "Authenticated users can view registrations"
on public.sport_event_registrations
for select
to authenticated
using (true);

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
