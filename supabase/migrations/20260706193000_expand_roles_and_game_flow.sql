alter type public.app_role add value if not exists 'moderator';
alter type public.app_role add value if not exists 'player';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'game_status'
  ) then
    create type public.game_status as enum ('draft', 'scheduled', 'in_progress', 'completed');
  end if;
end
$$;

alter table public.games
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists status public.game_status not null default 'scheduled',
  add column if not exists result_summary text not null default '',
  add column if not exists winner_team_id uuid references public.teams(id) on delete set null;

create table if not exists public.game_moderators (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  moderator_user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (game_id, moderator_user_id)
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists games_status_idx on public.games (status);
create index if not exists games_winner_team_id_idx on public.games (winner_team_id);
create index if not exists game_moderators_game_id_idx on public.game_moderators (game_id);
create index if not exists game_moderators_moderator_user_id_idx on public.game_moderators (moderator_user_id);

alter table public.game_moderators enable row level security;

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
