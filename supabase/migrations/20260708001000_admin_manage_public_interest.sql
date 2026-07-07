drop policy if exists "Admins update public event interest submissions" on public.public_event_interest_submissions;
create policy "Admins update public event interest submissions"
on public.public_event_interest_submissions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete public event interest submissions" on public.public_event_interest_submissions;
create policy "Admins delete public event interest submissions"
on public.public_event_interest_submissions
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins add public event interest submission events" on public.public_event_interest_submission_events;
create policy "Admins add public event interest submission events"
on public.public_event_interest_submission_events
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins delete public event interest submission events" on public.public_event_interest_submission_events;
create policy "Admins delete public event interest submission events"
on public.public_event_interest_submission_events
for delete
to authenticated
using (public.is_admin());
