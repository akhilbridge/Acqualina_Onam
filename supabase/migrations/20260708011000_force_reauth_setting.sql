alter table public.app_settings
add column if not exists force_reauth_after timestamptz;
