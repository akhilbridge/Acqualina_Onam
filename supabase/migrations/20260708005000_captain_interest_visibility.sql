drop policy if exists "Admins view public event interest submissions" on public.public_event_interest_submissions;
drop policy if exists "Admins and captains view public event interest submissions" on public.public_event_interest_submissions;
create policy "Admins and captains view public event interest submissions"
on public.public_event_interest_submissions
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.players
    where players.id = public_event_interest_submissions.player_id
      and players.team_id = public.current_user_team_id()
  )
);

drop policy if exists "Admins view public event interest submission events" on public.public_event_interest_submission_events;
drop policy if exists "Admins and captains view public event interest submission events" on public.public_event_interest_submission_events;
create policy "Admins and captains view public event interest submission events"
on public.public_event_interest_submission_events
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.public_event_interest_submissions as submissions
    join public.players on players.id = submissions.player_id
    where submissions.id = public_event_interest_submission_events.submission_id
      and players.team_id = public.current_user_team_id()
  )
);
