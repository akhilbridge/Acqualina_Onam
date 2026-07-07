create table if not exists public.sports_events (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
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

insert into public.sports_events (name)
select distinct games.title
from public.games
where coalesce(trim(games.title), '') <> ''
on conflict (name) do nothing;

create index if not exists sports_events_name_idx on public.sports_events (name);

alter table public.sports_events enable row level security;

drop policy if exists "Authenticated users can view sports events" on public.sports_events;
create policy "Authenticated users can view sports events"
on public.sports_events
for select
to authenticated
using (true);

drop policy if exists "Admins manage sports events" on public.sports_events;
create policy "Admins manage sports events"
on public.sports_events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
