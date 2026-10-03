-- Payment lifecycle hardening: database is the authoritative idempotency and
-- confirmation boundary. Apply before deploying the API changes.

create unique index if not exists orders_user_idempotency_key_unique
  on public.orders(user_id, idempotency_key) where idempotency_key is not null;
create index if not exists payments_reference_lookup_idx on public.payments(reference);
create index if not exists payments_order_status_idx on public.payments(order_id, status);
create unique index if not exists payments_transaction_id_unique
  on public.payments(transaction_id) where transaction_id is not null;
-- There can be many failed/abandoned attempts, but only one payable attempt at a time.
create unique index if not exists payments_one_pending_attempt_idx
  on public.payments(order_id) where status = 'pending';

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
  insert into public.payments(order_id, reference, amount_kobo, currency, status)
  values(o.id, payment_reference, o.total_kobo, 'NGN', 'pending')
  returning * into p;
  return p;
end $$;

create or replace function public.confirm_speedcake_payment(payment_id uuid, transaction_id text)
returns void language plpgsql security definer set search_path=public as $$
declare
  p public.payments;
  o public.orders;
begin
  if nullif(btrim(transaction_id), '') is null then
    raise exception 'Missing transaction ID';
  end if;
  select * into p from public.payments where id = payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  select * into o from public.orders where id = p.order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if p.status = 'success' then
    if p.transaction_id is distinct from transaction_id then
      raise exception 'Payment transaction ID mismatch';
    end if;
    return;
  end if;
  if p.status <> 'pending' then raise exception 'Payment is not confirmable'; end if;
  if o.status <> 'pending_payment' or o.payment_status <> 'pending' then
    raise exception 'Order is not awaiting payment';
  end if;
  if p.amount_kobo <> o.total_kobo or p.currency <> 'NGN' then
    raise exception 'Payment amount or currency does not match order';
  end if;

  update public.payments
  set status = 'success', transaction_id = confirm_speedcake_payment.transaction_id, verified_at = now()
  where id = p.id;
  update public.orders
  set payment_status = 'success', status = 'paid', updated_at = now()
  where id = o.id;
  insert into public.order_status_history(order_id, status, note)
  values(o.id, 'paid', 'Paystack payment verified');
end $$;

create or replace function public.fail_speedcake_payment_attempt(payment_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare p public.payments;
begin
  select * into p from public.payments where id = payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if p.status = 'success' then raise exception 'Successful payment cannot be failed'; end if;
  update public.payments set status = 'failed' where id = p.id and status = 'pending';
end $$;

-- The checkout key is accepted by the same atomic order function that writes
-- order items and history, so retries cannot create a second order.
drop function if exists public.create_speedcake_order(uuid,text,text,text,text,text,text,text,text,date,text,uuid,bigint,bigint,jsonb,text,text,text,text);
create or replace function public.create_speedcake_order(
  buyer_id uuid, customer_name text, email text, phone text, address text,
  city text, state text, landmark text, instructions text, delivery_date date,
  delivery_window text, zone_id uuid, delivery_charge_kobo bigint, total_kobo bigint,
  items jsonb, fulfillment_type text default 'delivery', first_name text default null,
  last_name text default null, country text default 'Nigeria', checkout_idempotency_key text default null
) returns public.orders language plpgsql security definer set search_path=public as $$
declare o public.orders; calculated bigint := 0; line jsonb; f_first_name text; f_last_name text;
begin
  if buyer_id is null or not exists(select 1 from auth.users where id = buyer_id) then raise exception 'Authenticated customer required'; end if;
  if checkout_idempotency_key is null or length(checkout_idempotency_key) > 128 then raise exception 'Checkout idempotency key required'; end if;
  select * into o from public.orders where user_id = buyer_id and idempotency_key = checkout_idempotency_key;
  if found then return o; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) not between 1 and 30 then raise exception 'Invalid item count'; end if;
  if fulfillment_type not in ('delivery', 'pickup') then raise exception 'Invalid fulfillment type'; end if;
  if fulfillment_type = 'pickup' and delivery_charge_kobo <> 0 then raise exception 'Pickup orders cannot have a delivery charge'; end if;
  if fulfillment_type = 'delivery' and (delivery_date is null or delivery_date < current_date) then raise exception 'Delivery date must be in the future'; end if;
  for line in select * from jsonb_array_elements(items) loop
    if coalesce((line->>'quantity')::int, 0) not between 1 and 30 then raise exception 'Invalid quantity'; end if;
    if not exists(select 1 from public.products p join public.product_variants v on v.product_id = p.id where p.id = (line->>'product_id')::uuid and p.active and v.id = (line->'variant_snapshot'->>'id')::uuid and v.active and v.name = line->'variant_snapshot'->>'name' and v.price_kobo = coalesce((line->'variant_snapshot'->>'base_price_kobo')::bigint, (line->'variant_snapshot'->>'price_kobo')::bigint)) then raise exception 'Cake option unavailable or price changed'; end if;
    calculated := calculated + (line->>'line_total_kobo')::bigint;
  end loop;
  if calculated + delivery_charge_kobo <> total_kobo then raise exception 'Total mismatch'; end if;
  f_first_name := coalesce(first_name, nullif(split_part(customer_name, ' ', 1), ''), customer_name);
  f_last_name := coalesce(last_name, nullif(substr(customer_name, length(split_part(customer_name, ' ', 1)) + 2), ''), '');
  insert into public.orders(user_id,idempotency_key,customer_name,customer_email,customer_phone,delivery_address,city,state,landmark,delivery_instructions,delivery_zone_id,delivery_date,delivery_window,delivery_charge_kobo,subtotal_kobo,total_kobo,fulfillment_type,first_name,last_name,country)
  values(buyer_id,checkout_idempotency_key,customer_name,email,phone,case when fulfillment_type='delivery' then coalesce(address,'') else null end,city,state,coalesce(landmark,''),coalesce(instructions,''),null,case when fulfillment_type='delivery' then delivery_date else null end,case when fulfillment_type='delivery' then delivery_window else 'Store Pickup' end,delivery_charge_kobo,calculated,total_kobo,fulfillment_type,f_first_name,f_last_name,coalesce(country,'Nigeria')) returning * into o;
  for line in select * from jsonb_array_elements(items) loop
    insert into public.order_items(order_id,product_id,product_snapshot,variant_snapshot,customization,quantity,line_total_kobo) values(o.id,(line->>'product_id')::uuid,line->'product_snapshot',line->'variant_snapshot',coalesce(line->'customization','{}'),(line->>'quantity')::int,(line->>'line_total_kobo')::bigint);
  end loop;
  insert into public.order_status_history(order_id,status,note) values(o.id,'pending_payment','Order placed');
  return o;
end $$;

revoke all on function public.create_speedcake_payment_attempt(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.create_speedcake_payment_attempt(uuid,uuid,text) to service_role;
revoke all on function public.confirm_speedcake_payment(uuid,text) from public, anon, authenticated;
grant execute on function public.confirm_speedcake_payment(uuid,text) to service_role;
revoke all on function public.fail_speedcake_payment_attempt(uuid) from public, anon, authenticated;
grant execute on function public.fail_speedcake_payment_attempt(uuid) to service_role;
revoke all on function public.create_speedcake_order(uuid,text,text,text,text,text,text,text,text,date,text,uuid,bigint,bigint,jsonb,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_speedcake_order(uuid,text,text,text,text,text,text,text,text,date,text,uuid,bigint,bigint,jsonb,text,text,text,text,text) to service_role;
