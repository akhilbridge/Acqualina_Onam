alter table public.games
add column if not exists fixture_label text not null default '';
