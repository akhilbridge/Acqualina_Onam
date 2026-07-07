do $$
declare
  updated_count integer;
begin
  update public.profiles
  set role = 'admin'::public.app_role
  where lower(email) = lower('akhilmnair7@gmail.com');

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    raise exception 'No profile found for email %', 'akhilmnair7@gmail.com';
  end if;
end
$$;
