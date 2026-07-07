alter table public.fixtures
  alter column side_a_team_id drop not null,
  alter column side_b_team_id drop not null;

alter table public.fixtures
  add column if not exists side_a_source_fixture_id uuid references public.fixtures(id) on delete set null,
  add column if not exists side_b_source_fixture_id uuid references public.fixtures(id) on delete set null;

alter table public.fixtures
  drop constraint if exists fixtures_check;

create index if not exists fixtures_side_a_source_fixture_id_idx on public.fixtures (side_a_source_fixture_id);
create index if not exists fixtures_side_b_source_fixture_id_idx on public.fixtures (side_b_source_fixture_id);
