create table if not exists public.public_event_interest_submissions (
  id uuid primary key default gen_random_uuid(),
  villa_number text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  player_name text not null,
  player_category text not null,
  ip_address text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.public_event_interest_submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.public_event_interest_submissions(id) on delete cascade,
  sport_event_id uuid not null references public.sports_events(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (submission_id, sport_event_id)
);

create index if not exists public_event_interest_submissions_player_id_idx on public.public_event_interest_submissions (player_id);
create index if not exists public_event_interest_submissions_created_at_idx on public.public_event_interest_submissions (created_at);
create index if not exists public_event_interest_submission_events_submission_id_idx on public.public_event_interest_submission_events (submission_id);
create index if not exists public_event_interest_submission_events_sport_event_id_idx on public.public_event_interest_submission_events (sport_event_id);

alter table public.public_event_interest_submissions enable row level security;
alter table public.public_event_interest_submission_events enable row level security;

drop policy if exists "Anonymous users can view players" on public.players;
create policy "Anonymous users can view players"
on public.players
for select
to anon
using (true);

drop policy if exists "Anonymous users can view sports events" on public.sports_events;
create policy "Anonymous users can view sports events"
on public.sports_events
for select
to anon
using (true);

drop policy if exists "Admins view public event interest submissions" on public.public_event_interest_submissions;
create policy "Admins view public event interest submissions"
on public.public_event_interest_submissions
for select
to authenticated
using (public.is_admin());

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
create policy "Admins view public event interest submission events"
on public.public_event_interest_submission_events
for select
to authenticated
using (public.is_admin());

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
