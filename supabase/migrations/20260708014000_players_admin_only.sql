drop policy if exists "Admins and captains add players" on public.players;
drop policy if exists "Admins add players" on public.players;
create policy "Admins add players"
on public.players
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins manage players" on public.players;
drop policy if exists "Admins and captains manage players" on public.players;
create policy "Admins manage players"
on public.players
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete players" on public.players;
drop policy if exists "Admins and captains delete players" on public.players;
create policy "Admins delete players"
on public.players
for delete
to authenticated
using (public.is_admin());
