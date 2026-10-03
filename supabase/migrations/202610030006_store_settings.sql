-- Stage 4.1: singleton operational store settings, editable only through admin APIs.
create table if not exists public.store_settings (
  id text primary key default 'store' check (id = 'store'),
  store_name text not null,
  store_email text not null,
  store_phone text not null,
  store_address text not null,
  city text not null,
  state text not null,
  country text not null,
  support_email text not null,
  support_phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;
create policy store_settings_admin on public.store_settings
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.set_store_settings_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function public.set_store_settings_updated_at();
