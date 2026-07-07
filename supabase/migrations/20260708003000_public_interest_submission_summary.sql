drop view if exists public.public_event_interest_submission_summary;

create view public.public_event_interest_submission_summary
with (security_invoker = false)
as
select
  submissions.id,
  submissions.villa_number,
  submissions.player_id,
  submissions.player_name,
  submissions.player_category,
  submissions.created_at,
  submission_events.sport_event_id,
  sports_events.name as sport_event_name,
  sports_events.sport_type,
  sports_events.event_category,
  sports_events.players_per_side
from public.public_event_interest_submissions as submissions
join public.public_event_interest_submission_events as submission_events
  on submission_events.submission_id = submissions.id
join public.sports_events
  on sports_events.id = submission_events.sport_event_id;

grant select on public.public_event_interest_submission_summary to anon, authenticated;
