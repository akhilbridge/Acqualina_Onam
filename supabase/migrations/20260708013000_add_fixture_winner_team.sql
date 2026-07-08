alter table public.fixtures
add column if not exists winner_team_id uuid references public.teams(id) on delete set null;

create index if not exists fixtures_winner_team_id_idx
on public.fixtures (winner_team_id);
