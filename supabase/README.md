# Supabase Setup

This project is prepared so Vercel only deploys the React frontend while Supabase handles auth, database, and the secure user-creation function.

## Apply the database

1. Open your Supabase project.
2. Go to `SQL Editor`.
3. For a brand new database, run [`schema.sql`](C:\Users\akhil.m\Documents\Acqualina Onam 2026\supabase\schema.sql).
4. If you already applied the earlier version, also run [`20260706193000_expand_roles_and_game_flow.sql`](C:\Users\akhil.m\Documents\Acqualina Onam 2026\supabase\migrations\20260706193000_expand_roles_and_game_flow.sql) so `moderator`, `player`, game schedules, results, and game moderators are added.
5. Then run [`20260706195500_player_management.sql`](C:\Users\akhil.m\Documents\Acqualina Onam 2026\supabase\migrations\20260706195500_player_management.sql) so admins can edit/delete any player and captains can edit/delete only their own team players.
6. Then run [`20260706203500_optional_game_date.sql`](C:\Users\akhil.m\Documents\Acqualina Onam 2026\supabase\migrations\20260706203500_optional_game_date.sql) if you want to create sports events before the exact date is decided.
7. Then run [`20260707143000_multi_team_event_fixtures.sql`](C:\Users\akhil.m\Documents\Acqualina Onam 2026\supabase\migrations\20260707143000_multi_team_event_fixtures.sql) to add:
   `sports_events` fields for sport type, venue, players per side, and status
   `sport_event_teams` for Side A / Side B team assignment
   `sport_event_players` for selected players inside each event team
   `fixtures` and `fixture_players` for generated event fixtures
8. Then run [`20260707154500_add_sport_event_entries.sql`](C:\Users\akhil.m\Documents\Acqualina Onam 2026\supabase\migrations\20260707154500_add_sport_event_entries.sql) to add simple team registration entries such as singles or doubles pairs saved per sport event and team.
9. Then run [`20260707203000_expand_fixtures_for_brackets.sql`](C:\Users\akhil.m\Documents\Acqualina Onam 2026\supabase\migrations\20260707203000_expand_fixtures_for_brackets.sql) so AI fixture generation can create a full bracket through the final, including future-round placeholder fixtures that point to winners of earlier fixtures.
10. Then run [`20260707220000_add_event_category_and_master_categories.sql`](C:\Users\akhil.m\Documents\Acqualina Onam 2026\supabase\migrations\20260707220000_add_event_category_and_master_categories.sql) to:
   add `event_category` to `sports_events`
   normalize player categories to `Jr Girls`, `Jr Boys`, `Girls`, `Boys`, `Ladies`, and `Gents`
11. Then run [`20260707223000_seed_aq_master_data.sql`](C:\Users\akhil.m\Documents\Acqualina Onam 2026\supabase\migrations\20260707223000_seed_aq_master_data.sql) to import the provided AQ master workbook data:
   85 players into the placeholder team `AQ Master Imported`
   59 sport events with sport type, event category, and players-per-side defaults
12. Then run [`20260708000000_public_interest_registration.sql`](C:\Users\akhil.m\Documents\Acqualina Onam 2026\supabase\migrations\20260708000000_public_interest_registration.sql) to add:
   public event-interest submission tables
   anonymous read access for the public registration page to players and sports events
   admin-only read access for saved submissions
13. If you previously used the old demo-seeded setup, run [`remove-demo-data.sql`](C:\Users\akhil.m\Documents\Acqualina Onam 2026\supabase\remove-demo-data.sql) once to delete the sample teams, players, games, and broken demo auth users.

## Deploy the edge function

Use the Supabase CLI when you are ready:

```bash
supabase functions deploy create-staff --project-ref your-project-ref
supabase functions deploy generate-fixtures --project-ref your-project-ref
supabase functions deploy submit-public-interest --project-ref your-project-ref
```

The functions use Supabase-managed environment variables and keep the service role key out of Vercel.

Set these secrets for `generate-fixtures` before deploying:

```bash
supabase secrets set GEMINI_API_KEY=your_key_here --project-ref your-project-ref
supabase secrets set GEMINI_MODEL=gemini-2.5-flash-lite --project-ref your-project-ref
```

The `generate-fixtures` function now uses the same Gemini environment variable names and
`@google/genai` client pattern as your `My-Resume` repo, so both projects stay aligned.

## Public registration page

The public event-interest page is available at `/register`.
It does not require login, and submissions are saved through the `submit-public-interest`
edge function with the request IP and selected events.

## Admin accounts

Create your real admin users in Supabase Authentication, then make sure their
`public.profiles.role` is set to `admin`. This project no longer ships with any
demo login accounts or sample records.
