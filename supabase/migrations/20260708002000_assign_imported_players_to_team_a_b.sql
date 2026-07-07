insert into public.teams (name)
values ('Team A'), ('Team B')
on conflict (name) do nothing;

with team_targets as (
  select name, id
  from public.teams
  where name in ('Team A', 'Team B')
),
exact_assignments(player_name, villa_number, category, team_name) as (
  values
    -- Team A - Men
    ('Praveen', '27', 'Gents', 'Team A'),
    ('Vikas', '8', 'Gents', 'Team A'),
    ('Josekutty', '18', 'Gents', 'Team A'),
    ('Akhil', '11', 'Gents', 'Team A'),
    ('Ricky', '4', 'Gents', 'Team A'),
    ('Harish', '10', 'Gents', 'Team A'),
    ('Siju', '17', 'Gents', 'Team A'),
    ('Robin', '14', 'Gents', 'Team A'),
    ('Anish', '16', 'Gents', 'Team A'),
    ('Dinil', '26', 'Gents', 'Team A'),
    ('Abeesh', '6', 'Gents', 'Team A'),
    ('Unnikrishnan', '28', 'Gents', 'Team A'),
    ('Adhirath', '28', 'Boys', 'Team A'),
    ('Jomy', '25', 'Gents', 'Team A'),
    ('Jinu', '21', 'Gents', 'Team A'),
    ('Joe', '16', 'Gents', 'Team A'),

    -- Team A - Women
    ('Jasmine', '12', 'Ladies', 'Team A'),
    ('Anju', '2', 'Ladies', 'Team A'),
    ('Simi', '7', 'Ladies', 'Team A'),
    ('Divya', '17', 'Ladies', 'Team A'),
    ('Ambili', '12.1', 'Ladies', 'Team A'),
    ('Nimna', '20', 'Ladies', 'Team A'),
    ('Vini', '28', 'Ladies', 'Team A'),
    ('Mercy', '1', 'Ladies', 'Team A'),
    ('Anu', '15', 'Ladies', 'Team A'),
    ('Manasa', '26', 'Ladies', 'Team A'),
    ('Yamuna', '26', 'Ladies', 'Team A'),
    ('Nayana', '23', 'Ladies', 'Team A'),
    ('Jaya', '24', 'Ladies', 'Team A'),

    -- Team A - Boys and girls
    ('Calvin', '15', 'Boys', 'Team A'),
    ('Gautam', '27', 'Jr Boys', 'Team A'),
    ('Samarth', '10', 'Jr Boys', 'Team A'),
    ('Dave', '6', 'Boys', 'Team A'),
    ('Edwin', '15', 'Boys', 'Team A'),
    ('Hannah', '2', 'Girls', 'Team A'),
    ('Nivedya', '3', 'Girls', 'Team A'),
    ('Ahana', '7', 'Jr Girls', 'Team A'),
    ('Irene', '17', 'Girls', 'Team A'),
    ('Nanditha', '12.1', 'Girls', 'Team A'),
    ('Gisal', '26', 'Jr Girls', 'Team A'),
    ('Nora', '12', 'Girls', 'Team A'),
    ('Merlin', '15', 'Jr Girls', 'Team A'),

    -- Team B - Men
    ('Deepak', '19', 'Gents', 'Team B'),
    ('Shoby', '1', 'Gents', 'Team B'),
    ('Biju', '5', 'Gents', 'Team B'),
    ('Surendran', '9', 'Gents', 'Team B'),
    ('Jijo', '24', 'Gents', 'Team B'),
    ('Manu', '15', 'Gents', 'Team B'),
    ('Basil', '2', 'Gents', 'Team B'),
    ('Arun', '7', 'Gents', 'Team B'),
    ('Sunil', '12', 'Gents', 'Team B'),
    ('Krishnakumar', '22', 'Gents', 'Team B'),
    ('Prashobh', '20', 'Gents', 'Team B'),
    ('Sreelal', '3', 'Gents', 'Team B'),
    ('Paul', '23', 'Gents', 'Team B'),
    ('Mahesh', '12.1', 'Gents', 'Team B'),
    ('Paul', '2', 'Gents', 'Team B'),

    -- Team B - Women
    ('Shabana', '21', 'Ladies', 'Team B'),
    ('Joicy', '6', 'Ladies', 'Team B'),
    ('Alphonse', '16', 'Ladies', 'Team B'),
    ('Renu', '18', 'Ladies', 'Team B'),
    ('Suma', '8', 'Ladies', 'Team B'),
    ('Molly', '5', 'Ladies', 'Team B'),
    ('Remya', '3', 'Ladies', 'Team B'),
    ('Sangeetha', '11', 'Ladies', 'Team B'),
    ('Remya', '22', 'Ladies', 'Team B'),
    ('Anna', '19', 'Ladies', 'Team B'),
    ('Usha', '9', 'Ladies', 'Team B'),
    ('Tincy', '25', 'Ladies', 'Team B'),
    ('Vidya', '27', 'Ladies', 'Team B'),

    -- Team B - Boys and girls
    ('Isaac', '16', 'Boys', 'Team B'),
    ('Kevin', '25', 'Boys', 'Team B'),
    ('Arav', '28', 'Boys', 'Team B'),
    ('Darsh', '21', 'Jr Boys', 'Team B'),
    ('Theertha', '22', 'Girls', 'Team B'),
    ('Isabella', '25', 'Girls', 'Team B'),
    ('Niya', '12', 'Girls', 'Team B'),
    ('Niva', '12', 'Jr Girls', 'Team B'),
    ('Mariah', '8', 'Girls', 'Team B'),
    ('Nia', '24', 'Girls', 'Team B'),
    ('Anna', '8', 'Jr Girls', 'Team B'),
    ('Alankrita', '20', 'Jr Girls', 'Team B'),
    ('Catherine', '17', 'Jr Girls', 'Team B'),
    ('Rebecca', '7', 'Jr Girls', 'Team B'),
    ('Eva', '6', 'Jr Girls', 'Team B')
),
resolved_exact_assignments as (
  select
    exact_assignments.player_name,
    exact_assignments.villa_number,
    exact_assignments.category,
    team_targets.id as team_id
  from exact_assignments
  join team_targets on team_targets.name = exact_assignments.team_name
)
update public.players as players
set team_id = resolved_exact_assignments.team_id
from resolved_exact_assignments
where players.name = resolved_exact_assignments.player_name
  and players.villa_number = resolved_exact_assignments.villa_number
  and players.category = resolved_exact_assignments.category;

with team_targets as (
  select name, id
  from public.teams
  where name in ('Team A', 'Team B')
),
name_only_assignments(player_name, team_name) as (
  values
    ('Nikku', 'Team A'),
    ('Neva', 'Team A'),
    ('Elsa', 'Team A'),
    ('Leon', 'Team B'),
    ('Rainy', 'Team B'),
    ('Ihaan', 'Team B'),
    ('Anand', 'Team B')
),
unique_name_assignments as (
  select
    players.id as player_id,
    team_targets.id as team_id
  from name_only_assignments
  join team_targets on team_targets.name = name_only_assignments.team_name
  join public.players as players
    on lower(players.name) = lower(name_only_assignments.player_name)
  where not exists (
    select 1
    from public.players as duplicate_players
    where lower(duplicate_players.name) = lower(players.name)
      and duplicate_players.id <> players.id
  )
)
update public.players as players
set team_id = unique_name_assignments.team_id
from unique_name_assignments
where players.id = unique_name_assignments.player_id;

delete from public.teams as teams
where teams.name = 'AQ Master Imported'
  and not exists (
    select 1
    from public.players
    where players.team_id = teams.id
  );
