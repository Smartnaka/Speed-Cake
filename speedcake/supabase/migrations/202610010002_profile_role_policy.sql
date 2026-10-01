-- A SECURITY DEFINER helper avoids recursive profiles RLS while ensuring a
-- profile update can never change the caller's role.
create or replace function public.current_profile_role() returns public.app_role
language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() $$;
revoke all on function public.current_profile_role() from public, anon;
grant execute on function public.current_profile_role() to authenticated, service_role;
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update
using(id=auth.uid() or is_admin())
with check((id=auth.uid() and role=public.current_profile_role()) or is_admin());
