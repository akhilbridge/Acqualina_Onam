update public.players
set category = case
  when category in ('Jr Girls', 'Jr. Girls') then 'Jr Girls'
  when category in ('Jr Boys', 'Jr. Boys') then 'Jr Boys'
  when category = 'Girls' then 'Girls'
  when category = 'Boys' then 'Boys'
  when category in ('Ladies', 'Women') then 'Ladies'
  when category in ('Gents', 'Mens', 'Men') then 'Gents'
  else category
end;

alter table public.players
  drop constraint if exists players_category_check;

alter table public.players
  add constraint players_category_check
  check (category in ('Jr Girls', 'Jr Boys', 'Girls', 'Boys', 'Ladies', 'Gents'));

alter table public.sports_events
  add column if not exists event_category text not null default 'Open';

create index if not exists sports_events_event_category_idx on public.sports_events (event_category);
