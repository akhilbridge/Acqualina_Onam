drop policy if exists "Admins manage players" on public.players;
drop policy if exists "Admins and captains manage players" on public.players;
create policy "Admins and captains manage players"
on public.players
for update
to authenticated
using (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
)
with check (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
);

drop policy if exists "Admins delete players" on public.players;
drop policy if exists "Admins and captains delete players" on public.players;
create policy "Admins and captains delete players"
on public.players
for delete
to authenticated
using (
  public.is_admin()
  or (
    public.current_user_role() = 'captain'
    and team_id = public.current_user_team_id()
  )
);
