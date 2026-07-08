drop policy if exists "Anonymous users can view games" on public.games;
create policy "Anonymous users can view games"
on public.games
for select
to anon
using (true);

drop policy if exists "Anonymous users can view fixtures" on public.fixtures;
create policy "Anonymous users can view fixtures"
on public.fixtures
for select
to anon
using (true);

drop policy if exists "Anonymous users can view fixture players" on public.fixture_players;
create policy "Anonymous users can view fixture players"
on public.fixture_players
for select
to anon
using (true);
