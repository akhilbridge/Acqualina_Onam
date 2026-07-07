drop policy if exists "Anonymous users can view teams" on public.teams;
create policy "Anonymous users can view teams"
on public.teams
for select
to anon
using (true);
