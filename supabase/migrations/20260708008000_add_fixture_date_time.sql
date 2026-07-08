alter table public.fixtures
add column if not exists fixture_date date;

alter table public.fixtures
add column if not exists fixture_time time;
