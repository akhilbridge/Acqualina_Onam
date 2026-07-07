-- AQ Master Data import
-- Assumption: the workbook's Team AorB column is empty, so all imported players are seeded
-- into one placeholder team. You can move players into actual teams later from the app.

insert into public.teams (name)
values ('AQ Master Imported')
on conflict (name) do nothing;

delete from public.players
where team_id = (
  select id
  from public.teams
  where name = 'AQ Master Imported'
);

with imported_team as (
  select id
  from public.teams
  where name = 'AQ Master Imported'
),
imported_players(name, villa_number, category) as (
  values
    ('Shoby', '1', 'Gents'),
    ('Mercy', '1', 'Ladies'),
    ('Basil', '2', 'Gents'),
    ('Paul', '2', 'Gents'),
    ('Anju', '2', 'Ladies'),
    ('Hannah', '2', 'Girls'),
    ('Sreelal', '3', 'Gents'),
    ('Remya', '3', 'Ladies'),
    ('Nivedya', '3', 'Girls'),
    ('Ricky', '4', 'Gents'),
    ('Biju', '5', 'Gents'),
    ('Molly', '5', 'Ladies'),
    ('Abeesh', '6', 'Gents'),
    ('Joicy', '6', 'Ladies'),
    ('Dave', '6', 'Boys'),
    ('Eva', '6', 'Jr Girls'),
    ('Arun', '7', 'Gents'),
    ('Simi', '7', 'Ladies'),
    ('Rebecca', '7', 'Jr Girls'),
    ('Ahana', '7', 'Jr Girls'),
    ('Vikas', '8', 'Gents'),
    ('Suma', '8', 'Ladies'),
    ('Mariah', '8', 'Girls'),
    ('Anna', '8', 'Jr Girls'),
    ('Surendran', '9', 'Gents'),
    ('Usha', '9', 'Ladies'),
    ('Harish', '10', 'Gents'),
    ('Samarth', '10', 'Jr Boys'),
    ('Akhil', '11', 'Gents'),
    ('Sangeetha', '11', 'Ladies'),
    ('Sunil', '12', 'Gents'),
    ('Jasmine', '12', 'Ladies'),
    ('Nora', '12', 'Girls'),
    ('Niya', '12', 'Girls'),
    ('Niva', '12', 'Jr Girls'),
    ('Mahesh', '12.1', 'Gents'),
    ('Ambili', '12.1', 'Ladies'),
    ('Nanditha', '12.1', 'Girls'),
    ('Robin', '14', 'Gents'),
    ('Manu', '15', 'Gents'),
    ('Anu', '15', 'Ladies'),
    ('Edwin', '15', 'Boys'),
    ('Calvin', '15', 'Boys'),
    ('Merlin', '15', 'Jr Girls'),
    ('Anish', '16', 'Gents'),
    ('Joe', '16', 'Gents'),
    ('Alphonse', '16', 'Ladies'),
    ('Isaac', '16', 'Boys'),
    ('Siju', '17', 'Gents'),
    ('Divya', '17', 'Ladies'),
    ('Irene', '17', 'Girls'),
    ('Catherine', '17', 'Jr Girls'),
    ('Josekutty', '18', 'Gents'),
    ('Renu', '18', 'Ladies'),
    ('Deepak', '19', 'Gents'),
    ('Anna', '19', 'Ladies'),
    ('Prashobh', '20', 'Gents'),
    ('Nimna', '20', 'Ladies'),
    ('Alankrita', '20', 'Jr Girls'),
    ('Jinu', '21', 'Gents'),
    ('Shabana', '21', 'Ladies'),
    ('Darsh', '21', 'Jr Boys'),
    ('Krishnakumar', '22', 'Gents'),
    ('Remya', '22', 'Ladies'),
    ('Theertha', '22', 'Girls'),
    ('Paul', '23', 'Gents'),
    ('Nayana', '23', 'Ladies'),
    ('Jijo', '24', 'Gents'),
    ('Jaya', '24', 'Ladies'),
    ('Nia', '24', 'Girls'),
    ('Jomy', '25', 'Gents'),
    ('Tincy', '25', 'Ladies'),
    ('Kevin', '25', 'Boys'),
    ('Isabella', '25', 'Girls'),
    ('Dinil', '26', 'Gents'),
    ('Yamuna', '26', 'Ladies'),
    ('Gisal', '26', 'Jr Girls'),
    ('Samreen', '26', 'Girls'),
    ('Praveen', '27', 'Gents'),
    ('Vidya', '27', 'Ladies'),
    ('Gautam', '27', 'Jr Boys'),
    ('Unnikrishnan', '28', 'Gents'),
    ('Vini', '28', 'Ladies'),
    ('Adhirath', '28', 'Boys'),
    ('Arav', '28', 'Boys')
)
insert into public.players (name, villa_number, category, team_id)
select
  imported_players.name,
  imported_players.villa_number,
  imported_players.category,
  imported_team.id
from imported_players
cross join imported_team;

with imported_events(name, sport_type, event_category, players_per_side) as (
  values
    ('Foosball - Girls, 6-9 Doubles', 'Foosball', 'Girls, 6-9', 2),
    ('Foosball - Girls, 10-15 years Doubles', 'Foosball', 'Girls, 10-15 years', 2),
    ('Foosball - Boys, 6-9 years Doubles', 'Foosball', 'Boys, 6-9 years', 2),
    ('Foosball - Boys, 10-15 years Doubles', 'Foosball', 'Boys, 10-15 years', 2),
    ('Foosball - Ladies Doubles', 'Foosball', 'Ladies', 2),
    ('Foosball - Gents Doubles', 'Foosball', 'Gents', 2),
    ('Swimming - Girls, 6-9 years', 'Swimming', 'Girls, 6-9 years', 1),
    ('Swimming - Girls, 10-15 years', 'Swimming', 'Girls, 10-15 years', 1),
    ('Swimming - Boys, 6-9 years', 'Swimming', 'Boys, 6-9 years', 1),
    ('Swimming - Boys, 10-15 years', 'Swimming', 'Boys, 10-15 years', 1),
    ('Football - Kids', 'Football', 'Kids', 1),
    ('Football - Gents', 'Football', 'Gents', 1),
    ('Football - Ladies', 'Football', 'Ladies', 1),
    ('Cricket - Gents', 'Cricket', 'Gents', 1),
    ('Cricket - Ladies', 'Cricket', 'Ladies', 1),
    ('Cricket - Kids', 'Cricket', 'Kids', 1),
    ('Basketball - Boys', 'Basketball', 'Boys', 1),
    ('Basketball - Girls', 'Basketball', 'Girls', 1),
    ('Basketball - Ladies', 'Basketball', 'Ladies', 1),
    ('Basketball - Gents', 'Basketball', 'Gents', 1),
    ('Carroms - Girls Singles', 'Carroms', 'Girls', 1),
    ('Carroms - Boys Singles', 'Carroms', 'Boys', 1),
    ('Carroms - Girls Doubles', 'Carroms', 'Girls', 2),
    ('Carroms - Boys Doubles', 'Carroms', 'Boys', 2),
    ('Carroms - Kids Mixed Doubles', 'Carroms', 'Kids Mixed', 2),
    ('Carroms - Gents Singles', 'Carroms', 'Gents', 1),
    ('Carroms - Ladies Singles', 'Carroms', 'Ladies', 1),
    ('Carroms - Gents Doubles', 'Carroms', 'Gents', 2),
    ('Carroms - Ladies Doubles', 'Carroms', 'Ladies', 2),
    ('Table Tennis - Boys Singles', 'Table Tennis', 'Boys', 1),
    ('Table Tennis - Girls Singles', 'Table Tennis', 'Girls', 1),
    ('Table Tennis - Gents Singles', 'Table Tennis', 'Gents', 1),
    ('Table Tennis - Ladies Singles', 'Table Tennis', 'Ladies', 1),
    ('Table Tennis - Boys Doubles', 'Table Tennis', 'Boys', 2),
    ('Table Tennis - Girls Doubles', 'Table Tennis', 'Girls', 2),
    ('Table Tennis - Kids Mixed Doubles', 'Table Tennis', 'Kids Mixed', 2),
    ('Table Tennis - Gents Doubles', 'Table Tennis', 'Gents', 2),
    ('Table Tennis - Ladies Doubles', 'Table Tennis', 'Ladies', 2),
    ('Pickleball - Boys Singles', 'Pickleball', 'Boys', 1),
    ('Pickleball - Gents Singles', 'Pickleball', 'Gents', 1),
    ('Pickleball - Ladies Singles', 'Pickleball', 'Ladies', 1),
    ('Pickleball - Boys Doubles', 'Pickleball', 'Boys', 2),
    ('Pickleball - Kids Mixed Doubles', 'Pickleball', 'Kids Mixed', 2),
    ('Pickleball - Gents Doubles', 'Pickleball', 'Gents', 2),
    ('Pickleball - Ladies Doubles', 'Pickleball', 'Ladies', 2),
    ('Chess Kids', 'Chess', 'Kids', 1),
    ('Chess Adults', 'Chess', 'Adults', 1),
    ('Cards 28 Gents', 'Cards 28', 'Gents', 1),
    ('Cards 28 Ladies', 'Cards 28', 'Ladies', 1),
    ('Rummy - Kids', 'Rummy', 'Kids', 1),
    ('Rummy - Ladies', 'Rummy', 'Ladies', 1),
    ('Rummy - Gents', 'Rummy', 'Gents', 1),
    ('Badminton - Boys Singles', 'Badminton', 'Boys', 1),
    ('Badminton - Gents Singles', 'Badminton', 'Gents', 1),
    ('Badminton - Ladies Singles', 'Badminton', 'Ladies', 1),
    ('Badminton - Boys Doubles', 'Badminton', 'Boys', 2),
    ('Badminton - Kids Mixed Doubles', 'Badminton', 'Kids Mixed', 2),
    ('Badminton - Gents Doubles', 'Badminton', 'Gents', 2),
    ('Badminton - Ladies Doubles', 'Badminton', 'Ladies', 2)
)
insert into public.sports_events (
  name,
  sport_type,
  event_category,
  venue,
  players_per_side,
  status
)
select
  imported_events.name,
  imported_events.sport_type,
  imported_events.event_category,
  'TBD',
  imported_events.players_per_side,
  'draft'::public.sport_event_status
from imported_events
on conflict (name) do update
set
  sport_type = excluded.sport_type,
  event_category = excluded.event_category,
  venue = excluded.venue,
  players_per_side = excluded.players_per_side,
  status = excluded.status;
