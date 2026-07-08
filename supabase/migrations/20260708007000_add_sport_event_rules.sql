alter table public.sports_events
add column if not exists rules text not null default '';
