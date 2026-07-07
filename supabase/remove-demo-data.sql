delete from public.game_moderators
where game_id in (
  '41111111-1111-4111-8111-111111111111',
  '42222222-2222-4222-8222-222222222222'
);

delete from public.game_assignments
where game_id in (
  '41111111-1111-4111-8111-111111111111',
  '42222222-2222-4222-8222-222222222222'
)
or player_id in (
  '31111111-1111-4111-8111-111111111111',
  '32222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '34444444-4444-4444-8444-444444444444',
  '35555555-5555-4555-8555-555555555555',
  '36666666-6666-4666-8666-666666666666'
);

delete from public.games
where id in (
  '41111111-1111-4111-8111-111111111111',
  '42222222-2222-4222-8222-222222222222'
)
or title in ('Tug of War', 'Relay Race');

delete from public.players
where id in (
  '31111111-1111-4111-8111-111111111111',
  '32222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '34444444-4444-4444-8444-444444444444',
  '35555555-5555-4555-8555-555555555555',
  '36666666-6666-4666-8666-666666666666'
)
or name in (
  'Akhila Menon',
  'Rohan Das',
  'Nivedya Raj',
  'Dev Krishna',
  'Sneha Pillai',
  'Rahul Varma'
);

delete from public.teams
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
)
or name in ('Emerald Chundan', 'Sunset Vallam');

delete from public.profiles
where user_id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);

delete from auth.identities
where user_id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);

delete from auth.users
where id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);
