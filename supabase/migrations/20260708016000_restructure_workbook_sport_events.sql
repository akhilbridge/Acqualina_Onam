alter table public.sports_events
add column if not exists is_active boolean not null default true;

create index if not exists sports_events_is_active_idx
on public.sports_events (is_active);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_category_check'
  ) then
    alter table public.players drop constraint players_category_check;
  end if;
end
$$;

update public.players
set category = case
  when category = 'Jr Boys' then 'Boys 6-9 yrs'
  when category = 'Jr Girls' then 'Girls 6-9 yrs'
  when category = 'Boys' then 'Boys 10-15 yrs'
  when category = 'Girls' then 'Girls 10-15 yrs'
  else category
end;

alter table public.players
add constraint players_category_check
check (
  category in (
    'Gents',
    'Ladies',
    'Boys 6-9 yrs',
    'Girls 6-9 yrs',
    'Boys 10-15 yrs',
    'Girls 10-15 yrs'
  )
);

delete from public.game_moderators;
delete from public.game_assignments;
delete from public.games;
delete from public.public_event_interest_submission_events;
delete from public.public_event_interest_submissions;
delete from public.fixture_players;
delete from public.fixtures;
delete from public.sport_event_entry_players;
delete from public.sport_event_entries;
delete from public.sport_event_players;
delete from public.sport_event_teams;
delete from public.sport_event_registrations;
delete from public.sports_events;

with event_definitions(event_name, players_per_side) as (
  values
    ('Foosball', 2),
    ('Carroms Singles', 1),
    ('Carroms Doubles', 2),
    ('Carroms Mixed', 2),
    ('Chess', 1),
    ('TT Singles', 1),
    ('TT Doubles', 2),
    ('TT Mixed', 2),
    ('Badminton Singles', 1),
    ('Badminton Doubles', 2),
    ('Badminton Mixed', 2),
    ('Pickleball Singles', 1),
    ('Pickleball Doubles', 2),
    ('Football', 5),
    ('Cricket', 11),
    ('Basketball', 5),
    ('Swimming', 1),
    ('Crads 28', 1),
    ('Crads 56', 1),
    ('Crads Rummy', 1)
),
category_definitions(category_name) as (
  values
    ('Gents'),
    ('Ladies'),
    ('Boys 6-9 yrs'),
    ('Girls 6-9 yrs'),
    ('Boys 10-15 yrs'),
    ('Girls 10-15 yrs')
)
insert into public.sports_events (
  name,
  sport_type,
  event_category,
  venue,
  rules,
  players_per_side,
  status,
  is_active
)
select
  event_name || ' - ' || category_name as name,
  event_name as sport_type,
  category_name as event_category,
  'TBD' as venue,
  '' as rules,
  players_per_side,
  'registration_open'::public.sport_event_status as status,
  true as is_active
from event_definitions
cross join category_definitions
order by event_name, category_name;
