create table if not exists public.app_settings (
  id text primary key default 'global' check (id = 'global'),
  public_registration_locked boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.app_settings (id, public_registration_locked)
values ('global', false)
on conflict (id) do nothing;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

alter table public.app_settings enable row level security;

drop policy if exists "Anyone can view app settings" on public.app_settings;
create policy "Anyone can view app settings"
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Admins update app settings" on public.app_settings;
create policy "Admins update app settings"
on public.app_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
