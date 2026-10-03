-- ===========================================================================
-- Stage 4.2 Migration: Remove Obsolete Delivery Zones & Delivery Slots
-- ===========================================================================

-- 1. Drop the foreign key constraint on orders.delivery_zone_id if it exists
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'orders_delivery_zone_id_fkey'
      and table_name = 'orders'
  ) then
    alter table public.orders drop constraint orders_delivery_zone_id_fkey;
  end if;
end $$;

-- 2. Make delivery_zone_id explicitly nullable (retained only for historical backward compatibility)
alter table public.orders alter column delivery_zone_id drop not null;

-- 3. Add idempotency_key column for duplicate checkout prevention
alter table public.orders add column if not exists idempotency_key text;
create index if not exists idx_orders_user_idempotency on public.orders(user_id, idempotency_key) where idempotency_key is not null;

-- 4. Recreate create_speedcake_order RPC with zero delivery_zones dependency
drop function if exists public.create_speedcake_order(uuid,text,text,text,text,text,text,text,text,date,text,uuid,bigint,bigint,jsonb);
drop function if exists public.create_speedcake_order(uuid,text,text,text,text,text,text,text,text,date,text,uuid,bigint,bigint,jsonb,text,text,text,text);

create or replace function public.create_speedcake_order(
  buyer_id uuid,
  customer_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  landmark text,
  instructions text,
  delivery_date date,
  delivery_window text,
  zone_id uuid,
  delivery_charge_kobo bigint,
  total_kobo bigint,
  items jsonb,
  fulfillment_type text default 'delivery',
  first_name text default null,
  last_name text default null,
  country text default 'Nigeria'
) returns public.orders
language plpgsql security definer set search_path=public as $$
declare
  o public.orders;
  calculated bigint:=0;
  line jsonb;
  f_first_name text;
  f_last_name text;
begin
  if buyer_id is null or not exists(select 1 from auth.users where id=buyer_id) then
    raise exception 'Authenticated customer required';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items)<1 or jsonb_array_length(items)>30 then
    raise exception 'Invalid item count';
  end if;

  if fulfillment_type not in ('delivery', 'pickup') then
    raise exception 'Invalid fulfillment type';
  end if;

  if fulfillment_type = 'pickup' then
    if delivery_charge_kobo <> 0 then
      raise exception 'Pickup orders cannot have a delivery charge';
    end if;
  else
    -- Delivery validation: date must not be in past
    if delivery_date is null or delivery_date < current_date then
      raise exception 'Delivery date must be in the future';
    end if;
    -- Delivery zone is no longer required or checked against delivery_zones table
  end if;

  for line in select * from jsonb_array_elements(items) loop
    if coalesce((line->>'quantity')::int,0) not between 1 and 30 then raise exception 'Invalid quantity'; end if;
    if not exists(
      select 1 from products p join product_variants v on v.product_id=p.id
      where p.id=(line->>'product_id')::uuid and p.active
        and v.id=(line->'variant_snapshot'->>'id')::uuid and v.active
        and v.name=line->'variant_snapshot'->>'name'
        and v.price_kobo=coalesce((line->'variant_snapshot'->>'base_price_kobo')::bigint,(line->'variant_snapshot'->>'price_kobo')::bigint)
    ) then raise exception 'Cake option unavailable or price changed'; end if;
    calculated:=calculated+(line->>'line_total_kobo')::bigint;
  end loop;

  if calculated+delivery_charge_kobo<>total_kobo then raise exception 'Total mismatch'; end if;

  f_first_name := coalesce(first_name, nullif(split_part(customer_name, ' ', 1), ''), customer_name);
  f_last_name := coalesce(last_name, nullif(substr(customer_name, length(split_part(customer_name, ' ', 1)) + 2), ''), '');

  insert into orders(
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    city,
    state,
    landmark,
    delivery_instructions,
    delivery_zone_id,
    delivery_date,
    delivery_window,
    delivery_charge_kobo,
    subtotal_kobo,
    total_kobo,
    fulfillment_type,
    first_name,
    last_name,
    country
  )
  values(
    buyer_id,
    customer_name,
    email,
    phone,
    case when fulfillment_type = 'delivery' then coalesce(address, '') else null end,
    city,
    state,
    coalesce(landmark, ''),
    coalesce(instructions, ''),
    null, -- zone_id no longer used
    case when fulfillment_type = 'delivery' then delivery_date else null end,
    case when fulfillment_type = 'delivery' then delivery_window else 'Store Pickup' end,
    delivery_charge_kobo,
    calculated,
    total_kobo,
    fulfillment_type,
    f_first_name,
    f_last_name,
    coalesce(country, 'Nigeria')
  )
  returning * into o;

  for line in select * from jsonb_array_elements(items) loop
    insert into order_items(order_id,product_id,product_snapshot,variant_snapshot,customization,quantity,line_total_kobo)
    values(o.id,(line->>'product_id')::uuid,line->'product_snapshot',line->'variant_snapshot',coalesce(line->'customization','{}'),(line->>'quantity')::int,(line->>'line_total_kobo')::bigint);
  end loop;

  insert into order_status_history(order_id,status,note) values(o.id,'pending_payment','Order placed');
  return o;
end $$;

revoke all on function public.create_speedcake_order(uuid,text,text,text,text,text,text,text,text,date,text,uuid,bigint,bigint,jsonb,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_speedcake_order(uuid,text,text,text,text,text,text,text,text,date,text,uuid,bigint,bigint,jsonb,text,text,text,text) to service_role;
