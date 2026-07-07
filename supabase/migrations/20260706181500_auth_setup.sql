create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'app_role'
  ) then
    create type public.app_role as enum ('admin', 'captain');
  end if;
end
$$;

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
  category text not null check (category in ('Men', 'Women', 'Boys', 'Girls')),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  venue text not null,
  game_date date not null,
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

create index if not exists profiles_team_id_idx on public.profiles (team_id);
create index if not exists players_team_id_idx on public.players (team_id);
create index if not exists games_team_a_id_idx on public.games (team_a_id);
create index if not exists games_team_b_id_idx on public.games (team_b_id);
create index if not exists games_game_date_idx on public.games (game_date);
create index if not exists game_assignments_game_id_idx on public.game_assignments (game_id);
create index if not exists game_assignments_team_id_idx on public.game_assignments (team_id);
create index if not exists game_assignments_player_id_idx on public.game_assignments (player_id);

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
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.game_assignments enable row level security;

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
create policy "Admins manage players"
on public.players
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete players" on public.players;
create policy "Admins delete players"
on public.players
for delete
to authenticated
using (public.is_admin());

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
