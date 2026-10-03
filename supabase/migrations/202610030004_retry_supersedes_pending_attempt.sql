-- A customer-initiated retry replaces an abandoned local attempt. This keeps the
-- one-pending-attempt invariant while preserving the old reference for audit.
create or replace function public.create_speedcake_payment_attempt(
  target_order uuid,
  expected_user uuid,
  payment_reference text
) returns public.payments
language plpgsql security definer set search_path=public as $$
declare
  o public.orders;
  p public.payments;
begin
  if payment_reference !~ '^SC-[A-Za-z0-9-]{8,116}$' then
    raise exception 'Invalid payment reference';
  end if;

  -- Serializes retries and confirmation attempts for this order. A new retry
  -- explicitly supersedes any abandoned pending local attempt before inserting
  -- its own reference, so the partial unique index remains satisfiable.
  select * into o from public.orders where id = target_order for update;
  if not found or o.user_id is distinct from expected_user then
    raise exception 'Order not found';
  end if;
  if o.status <> 'pending_payment' or o.payment_status <> 'pending' then
    raise exception 'Order is not payable';
  end if;
  if exists (select 1 from public.payments where order_id = o.id and status = 'success') then
    raise exception 'Order already has a successful payment';
  end if;

  update public.payments
  set status = 'failed'
  where order_id = o.id and status = 'pending';

  insert into public.payments(order_id, reference, amount_kobo, currency, status)
  values(o.id, payment_reference, o.total_kobo, 'NGN', 'pending')
  returning * into p;
  return p;
end $$;

revoke all on function public.create_speedcake_payment_attempt(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.create_speedcake_payment_attempt(uuid,uuid,text) to service_role;
